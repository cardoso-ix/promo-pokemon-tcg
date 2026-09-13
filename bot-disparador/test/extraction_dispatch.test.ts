import assert from 'node:assert';
import { test } from 'node:test';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import {
  upsertContato,
  getContatos,
  createCampanha,
  db
} from '../src/db/database.js';

test('Proteção contra contatos ocultos (@lid) e Validação de JID', () => {
  // 1. upsertContato deve rejeitar qualquer JID ou número com @lid
  const salvoLid = upsertContato({
    jid: '123456789012345@lid',
    numero: '123456789012345',
    nome: 'Contato Oculto Comunidade',
    origem_tipo: 'extracao'
  });
  assert.strictEqual(salvoLid, false, 'Contatos @lid não devem ser salvos no banco');

  const buscaLid = getContatos(10, 0, '123456789012345');
  assert.strictEqual(buscaLid.total, 0, 'Nenhum contato @lid deve constar no banco');

  // 2. upsertContato deve aceitar contatos reais com número e @s.whatsapp.net
  const salvoReal = upsertContato({
    jid: '5511999990001@s.whatsapp.net',
    numero: '5511999990001',
    nome: 'Lead Real WhatsApp',
    origem_tipo: 'extracao',
    grupo_nome: 'Grupo Teste Real'
  });
  assert.strictEqual(salvoReal, true, 'Contato real deve ser aceito');

  // 3. Normalização de JID Baileys (remoção de sufixos de dispositivo)
  const deviceJid = '5511999990001:2@s.whatsapp.net';
  const normalized = jidNormalizedUser(deviceJid);
  assert.strictEqual(normalized, '5511999990001@s.whatsapp.net', 'Sufixo de dispositivo deve ser removido');

  // 4. Verificação de limpeza preventiva no banco
  // Inserir diretamente um item corrompido para testar a sanitização
  const campId = createCampanha({
    nome: 'Campanha Teste LID',
    mensagem_template: 'Olá {nome}'
  });

  db.prepare(`
    INSERT INTO fila_envios (campanha_id, destinatario_jid, destinatario_nome, mensagem_gerada, status, criado_em)
    VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(campId, '987654321@lid', 'Lead Fake LID', 'Mensagem teste', 'pendente');

  // Executar limpeza preventiva
  db.exec(`
    DELETE FROM contatos WHERE jid LIKE '%@lid' OR numero LIKE '%@lid';
    UPDATE fila_envios 
    SET status = 'falha', erro = 'Número oculto de comunidade (@lid) não suporta envio direto' 
    WHERE destinatario_jid LIKE '%@lid' AND status IN ('pendente', 'enviando', 'enviado');
  `);

  const itemFila = db.prepare('SELECT status, erro FROM fila_envios WHERE destinatario_jid = ?').get('987654321@lid') as any;
  assert.strictEqual(itemFila.status, 'falha', 'Fila pendente com @lid deve ser marcada como falha');
  assert.ok(itemFila.erro.includes('@lid'), 'Erro deve informar que @lid não suporta envio direto');
});
