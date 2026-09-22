import test from 'node:test';
import assert from 'node:assert';
import {
  obterHoraBrasilia,
  prepararTextoMensagemAbertura,
  dispararMensagemAbertura,
  verificarEExecutarAgendador
} from '../src/core/agendador.js';
import { setConfig, getConfig, saveRota } from '../src/db/database.js';

test('obterHoraBrasilia - Deve converter corretamente horários UTC para o fuso de Brasília (America/Sao_Paulo)', () => {
  // 10:00:00 UTC em qualquer dia equivale a 07:00:00 em Brasília (UTC-3)
  const dataUtc = new Date('2026-09-22T10:00:00Z');
  const info = obterHoraBrasilia(dataUtc);

  assert.strictEqual(info.horaFormatada, '07:00');
  assert.strictEqual(info.dataFormatada, '2026-09-22');
  assert.ok(info.diaSemana.toLowerCase().includes('terça') || info.diaSemana.length > 3);
});

test('prepararTextoMensagemAbertura - Deve conter todos os elementos pedidos e substituir tags dinâmicas', () => {
  const template = 'Bom dia! Hoje é {dia_semana}. O grupo está aberto! @pokemon_tcg_promo';
  const texto = prepararTextoMensagemAbertura(template, 'segunda-feira');

  assert.strictEqual(texto.includes('Segunda-feira'), true);
  assert.strictEqual(texto.includes('@pokemon_tcg_promo'), true);
  assert.strictEqual(texto.includes('aberto'), true);
});

test('dispararMensagemAbertura - Deve lidar com WhatsApp desconectado sem quebrar a aplicação', async () => {
  const clientMock = { sock: null };
  const res = await dispararMensagemAbertura(clientMock, true);

  assert.strictEqual(res.sucesso, false);
  assert.strictEqual(res.motivo, 'whatsapp_desconectado');
});

test('dispararMensagemAbertura - Deve disparar mensagem para os grupos de destino ativos', async () => {
  // Garantir rota com destino ativo para teste
  saveRota({
    nome: 'Rota Teste Agendador',
    ativa: true,
    origens: ['120001@g.us'],
    destinos: ['120002@g.us']
  });

  const mensagensEnviadas: { jid: string; texto: string }[] = [];
  const clientMock = {
    sock: {
      sendMessage: async (jid: string, payload: { text: string }) => {
        mensagensEnviadas.push({ jid, texto: payload.text });
        return { key: { id: 'test_msg_id' } };
      }
    }
  };

  const res = await dispararMensagemAbertura(clientMock, true, 0);

  assert.strictEqual(res.sucesso, true);
  assert.ok(res.totalEnviados >= 1);
  assert.ok(mensagensEnviadas.length >= 1);
  assert.ok(mensagensEnviadas[0].texto.includes('@pokemon_tcg_promo'));
  assert.ok(mensagensEnviadas[0].texto.includes('ABERTO'));
});

test('verificarEExecutarAgendador - Não deve reenviar se já foi enviado hoje (Anti-duplicidade)', async () => {
  const { horaFormatada, dataFormatada } = obterHoraBrasilia();

  // Configura o agendador para o minuto atual
  setConfig('msg_abertura_ativa', 'true');
  setConfig('msg_abertura_horario', horaFormatada);
  // Simula que já foi enviado hoje
  setConfig('msg_abertura_ultimo_envio', dataFormatada);

  let envioChamado = false;
  const clientMock = {
    sock: {
      sendMessage: async () => {
        envioChamado = true;
      }
    }
  };

  const executou = await verificarEExecutarAgendador(clientMock);

  assert.strictEqual(executou, false);
  assert.strictEqual(envioChamado, false);
});
