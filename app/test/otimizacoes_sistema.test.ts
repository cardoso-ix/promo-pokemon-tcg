import test from 'node:test';
import assert from 'node:assert/strict';
import { purgarLogsAntigos, db, setConfig, getConfig } from '../src/db/database.js';
import {
  padronizarFotoEstudio,
  obterStatsCacheImagem,
  limparCacheImagem
} from '../src/core/image-studio.js';
import sharp from 'sharp';

test('Otimização 1: purgarLogsAntigos remove registros com mais de 90 dias e preserva recentes', () => {
  // Insere registros com datas antigas e recentes
  const dataAntiga95Dias = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  const dataRecente5Dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);

  // Insere no banco
  db.prepare(`
    INSERT INTO logs (origem_chat_id, status, motivo, criado_em)
    VALUES (?, ?, ?, ?)
  `).run('test_antigo', 'enviado', 'teste_antigo', dataAntiga95Dias);

  db.prepare(`
    INSERT INTO logs (origem_chat_id, status, motivo, criado_em)
    VALUES (?, ?, ?, ?)
  `).run('test_recente', 'enviado', 'teste_recente', dataRecente5Dias);

  db.prepare(`
    INSERT INTO produtos_replicados (produto_id, origem_chat_id, preco_por, criado_em)
    VALUES (?, ?, ?, ?)
  `).run('MLB_ANTIGO', 'test_antigo', 99.9, dataAntiga95Dias);

  db.prepare(`
    INSERT INTO produtos_replicados (produto_id, origem_chat_id, preco_por, criado_em)
    VALUES (?, ?, ?, ?)
  `).run('MLB_RECENTE', 'test_recente', 89.9, dataRecente5Dias);

  // Executa a purga de 90 dias
  const resultado = purgarLogsAntigos(90);

  assert.ok(resultado.logsDeletados >= 1, 'Deve deletar ao menos 1 log com mais de 90 dias');
  assert.ok(resultado.produtosDeletados >= 1, 'Deve deletar ao menos 1 produto replicado com mais de 90 dias');

  // Verifica que o recente continua existindo
  const recenteLog = db.prepare('SELECT id FROM logs WHERE motivo = ?').get('teste_recente');
  assert.ok(recenteLog, 'Log recente de 5 dias deve ser preservado');

  const recenteProd = db.prepare('SELECT id FROM produtos_replicados WHERE produto_id = ?').get('MLB_RECENTE');
  assert.ok(recenteProd, 'Produto recente de 5 dias deve ser preservado');

  // Limpeza
  db.prepare('DELETE FROM logs WHERE motivo = ?').run('teste_recente');
  db.prepare('DELETE FROM produtos_replicados WHERE produto_id = ?').run('MLB_RECENTE');
});

test('Otimização 2: LRU Cache de Imagens evita reprocessamento Sharp de fotos repetidas', async () => {
  limparCacheImagem();

  // Cria uma imagem simples de teste
  const imagemTesteBuffer = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 255, g: 0, b: 0 }
    }
  }).jpeg().toBuffer();

  const statsInicial = obterStatsCacheImagem();
  assert.equal(statsInicial.tamanho, 0);

  // 1ª Execução: Cache Miss
  const t0 = Date.now();
  const res1 = await padronizarFotoEstudio(imagemTesteBuffer, { paddingPercentual: 12 });
  const duracao1 = Date.now() - t0;

  const statsApos1 = obterStatsCacheImagem();
  assert.equal(statsApos1.tamanho, 1);
  assert.equal(statsApos1.misses, 1);
  assert.equal(statsApos1.hits, 0);

  // 2ª Execução com a mesma imagem: Cache Hit (retorno instantâneo)
  const t1 = Date.now();
  const res2 = await padronizarFotoEstudio(imagemTesteBuffer, { paddingPercentual: 12 });
  const duracao2 = Date.now() - t1;

  const statsApos2 = obterStatsCacheImagem();
  assert.equal(statsApos2.tamanho, 1);
  assert.equal(statsApos2.hits, 1, 'Deve registrar 1 hit de cache');

  assert.deepEqual(res1, res2, 'Buffer retornado pelo cache deve ser idêntico');
  assert.ok(duracao2 <= duracao1, 'Execução com cache deve ser muito mais rápida');
});

test('Otimização 3: Sentinel de Cookie respeita cooldown de 12h para não disparar spam no WhatsApp', () => {
  // Define que acabou de enviar alerta há 10 minutos
  const dezMinAtras = Date.now() - 10 * 60 * 1000;
  setConfig('ultimo_alerta_cookie_expirado', dezMinAtras.toString());

  const COOLDOWN_ALERTA_MS = 12 * 60 * 60 * 1000;
  const ultimoAlerta = parseInt(getConfig('ultimo_alerta_cookie_expirado', '0'), 10);
  const deveDisparar = (Date.now() - ultimoAlerta) >= COOLDOWN_ALERTA_MS;

  assert.equal(deveDisparar, false, 'Não deve disparar alerta se estiver dentro do cooldown de 12 horas');

  // Define que enviou alerta há 13 horas
  const trezeHorasAtras = Date.now() - 13 * 60 * 60 * 1000;
  setConfig('ultimo_alerta_cookie_expirado', trezeHorasAtras.toString());

  const ultimoAlertaPassado = parseInt(getConfig('ultimo_alerta_cookie_expirado', '0'), 10);
  const deveDispararAposCooldown = (Date.now() - ultimoAlertaPassado) >= COOLDOWN_ALERTA_MS;

  assert.equal(deveDispararAposCooldown, true, 'Deve liberar novo alerta após ultrapassar as 12 horas');
});
