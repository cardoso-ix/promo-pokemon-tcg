import assert from 'node:assert';
import { test } from 'node:test';
import { generateDeepSeekResponse } from '../src/ai/deepseek.js';
import { getConfig, setConfig } from '../src/db/database.js';

test('Atendimento IA - Configurações e Aliases do OpenCode Zen Go e DeepSeek Flash', () => {
  setConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
  setConfig('deepseek_model', 'deepseek-flash');
  setConfig('deepseek_ativo', 'true');

  const baseUrl = getConfig('deepseek_base_url');
  const model = getConfig('deepseek_model');
  const ativo = getConfig('deepseek_ativo');

  assert.strictEqual(baseUrl, 'https://opencode.ai/zen/go/v1');
  assert.strictEqual(model, 'deepseek-flash');
  assert.strictEqual(ativo, 'true');
});

test('Atendimento IA - Resposta com OpenCode e envio do link do grupo WhatsApp', async () => {
  const apiKey = getConfig('deepseek_api_key', '').trim();
  if (!apiKey) {
    console.log('Skipping live OpenCode call: deepseek_api_key não configurada.');
    return;
  }

  setConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
  setConfig('deepseek_model', 'deepseek-flash');
  setConfig('deepseek_ativo', 'true');

  const testJid = `5511${Date.now()}@s.whatsapp.net`;
  const resposta = await generateDeepSeekResponse(
    testJid,
    'Opa Eduardo, tudo bem? Pode me mandar o link do grupo sim, quero entrar e conferir as cartas!',
    'Rodrigo'
  );

  assert.ok(resposta, 'Deveria retornar uma resposta gerada pela IA');
  assert.strictEqual(typeof resposta, 'string');
  console.log('\n--- RESPOSTA DA IA COM LINK DO GRUPO ---');
  console.log(resposta);
  console.log('-----------------------------------------\n');
  assert.ok(
    resposta.includes('https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo') || resposta.includes('IFxkHX9ADT29EIUHRkCHVo'),
    'A IA deve incluir o link oficial do grupo WhatsApp na resposta para quem aceitou o convite'
  );
});
