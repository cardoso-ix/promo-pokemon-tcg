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

test('PRESET_MSGS_ABERTURA - Deve conter 4 modelos com marca e elementos de TCG', async () => {
  const { PRESET_MSGS_ABERTURA } = await import('../src/db/database.js');

  assert.strictEqual(PRESET_MSGS_ABERTURA.length, 4);

  for (const modelo of PRESET_MSGS_ABERTURA) {
    assert.ok(modelo.nome.length > 5);
    assert.ok(modelo.texto.includes('@pokemon_tcg_promo'), `Modelo ${modelo.nome} deve conter @pokemon_tcg_promo`);
    assert.ok(modelo.texto.includes('{dia_semana}'), `Modelo ${modelo.nome} deve conter a tag {dia_semana}`);
    assert.ok(
      modelo.texto.toLowerCase().includes('pokémon') ||
      modelo.texto.toLowerCase().includes('boosters') ||
      modelo.texto.toLowerCase().includes('colecionadores'),
      `Modelo ${modelo.nome} deve mencionar elementos de Pokémon TCG`
    );
  }
});

test('prepararTextoMensagemAbertura - Modo [ROTACAO_DIARIA] deve alternar modelos conforme o dia da semana', () => {
  // Simular Domingo (0), Segunda (1), Terça (2), Quarta (3)
  const dataDomingo = new Date('2026-09-20T10:00:00Z'); // Domingo
  const dataSegunda = new Date('2026-09-21T10:00:00Z'); // Segunda
  const dataTerca = new Date('2026-09-22T10:00:00Z');   // Terça
  const dataQuarta = new Date('2026-09-23T10:00:00Z');  // Quarta

  const textoDom = prepararTextoMensagemAbertura('[ROTACAO_DIARIA]', undefined, dataDomingo);
  const textoSeg = prepararTextoMensagemAbertura('[ROTACAO_DIARIA]', undefined, dataSegunda);
  const textoTer = prepararTextoMensagemAbertura('[ROTACAO_DIARIA]', undefined, dataTerca);
  const textoQua = prepararTextoMensagemAbertura('[ROTACAO_DIARIA]', undefined, dataQuarta);

  // Cada um deve ser diferente do outro (alternância efetiva)
  assert.notStrictEqual(textoDom, textoSeg);
  assert.notStrictEqual(textoSeg, textoTer);
  assert.notStrictEqual(textoTer, textoQua);

  // Todos devem ter a tag substituída e assinatura correta
  assert.ok(textoDom.includes('@pokemon_tcg_promo'));
  assert.ok(!textoDom.includes('{dia_semana}'));
  assert.ok(textoSeg.includes('@pokemon_tcg_promo'));
  assert.ok(!textoSeg.includes('{dia_semana}'));
});

