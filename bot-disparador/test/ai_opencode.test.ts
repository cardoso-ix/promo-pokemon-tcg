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

test('Atendimento IA - Resposta com OpenCode e DeepSeek Flash em tempo real', async () => {
  const apiKey = getConfig('deepseek_api_key', '').trim();
  if (!apiKey) {
    console.log('Skipping live OpenCode call: deepseek_api_key não configurada.');
    return;
  }

  setConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
  setConfig('deepseek_model', 'deepseek-flash');
  setConfig('deepseek_ativo', 'true');

  const resposta = await generateDeepSeekResponse(
    '5511999999999@s.whatsapp.net',
    'Olá Eduardo! Gostaria de saber como funciona o grupo de Pokémon TCG.',
    'Lucas'
  );

  assert.ok(resposta, 'Deveria retornar uma resposta gerada pela IA');
  assert.strictEqual(typeof resposta, 'string');
  assert.ok(resposta.length > 10, 'A resposta deve ter conteúdo textual suficiente');
});
