import assert from 'node:assert';
import { test } from 'node:test';
import {
  validateUtilitySafety,
  PRESET_UTILITY_TEMPLATES
} from '../src/core/meta-cloud.js';
import {
  saveMetaTemplate,
  getMetaTemplates,
  getMetaTemplateByNome,
  deleteMetaTemplateFromDb,
  createCampanha,
  getCampanhaById,
  deleteCampanha
} from '../src/db/database.js';

test('validateUtilitySafety penaliza termos comerciais e de venda direta (evita tarifa cara de MARKETING)', () => {
  const commercialText = 'Olá {{1}}! Aproveite nossa super promoção! Compre agora com 50% off e use o cupom POKEMON por apenas R$ 89,90!';
  const audit = validateUtilitySafety(commercialText);

  assert.strictEqual(audit.safe, false);
  assert.ok(audit.score < 50, `Score esperado < 50, recebido: ${audit.score}`);
  assert.ok(audit.detectedTriggers.length >= 4, `Gatilhos detectados: ${audit.detectedTriggers.join(', ')}`);
  assert.ok(audit.detectedTriggers.includes('compre'));
  assert.ok(audit.detectedTriggers.includes('promoção'));
  assert.ok(audit.detectedTriggers.includes('cupom'));
  assert.ok(audit.detectedTriggers.includes('r$'));
});

test('validateUtilitySafety aprova templates informativos de serviço (UTILITY ~R$ 0,18)', () => {
  const safeText = 'Olá {{1}}, aviso informativo da Comunidade Pokémon TCG: o status dos itens monitorados foi atualizado no link oficial: {{2}}';
  const audit = validateUtilitySafety(safeText);

  assert.strictEqual(audit.safe, true);
  assert.strictEqual(audit.score, 100);
  assert.strictEqual(audit.infractions.length, 0);
  assert.strictEqual(audit.detectedTriggers.length, 0);
});

test('PRESET_UTILITY_TEMPLATES devem ser 100% seguros contra reclassificação para marketing pela Meta', () => {
  assert.strictEqual(PRESET_UTILITY_TEMPLATES.length, 4);

  for (const preset of PRESET_UTILITY_TEMPLATES) {
    assert.strictEqual(preset.category, 'UTILITY', `Preset ${preset.name} deve ser UTILITY`);
    assert.ok(preset.body.includes('{{1}}'), `Preset ${preset.name} deve ter variável {{1}} para personalização`);
    assert.ok(preset.body.includes('{{2}}'), `Preset ${preset.name} deve ter variável {{2}}`);

    const audit = validateUtilitySafety(preset.body);
    assert.strictEqual(audit.safe, true, `Preset ${preset.name} deve ser seguro (infractions: ${audit.infractions.map(i => i.trigger).join(', ')})`);
    assert.strictEqual(audit.score, 100, `Preset ${preset.name} deve ter score 100`);
  }
});

test('Database meta_templates deve salvar, consultar e excluir templates oficiais', () => {
  const templateName = 'teste_notificacao_tcg_' + Date.now();

  saveMetaTemplate({
    meta_id: 'meta_123456',
    nome: templateName,
    categoria: 'UTILITY',
    idioma: 'pt_BR',
    status: 'APPROVED',
    motivo_rejeicao: undefined,
    corpo_texto: 'Olá {{1}}, seu alerta de Pokémon TCG está disponível: {{2}}',
    exemplo_variaveis: JSON.stringify(['Carlos', 'https://chat.whatsapp.com/exemplo'])
  });

  const buscado = getMetaTemplateByNome(templateName);
  assert.ok(buscado, 'Template deve ser encontrado pelo nome');
  assert.strictEqual(buscado?.nome, templateName);
  assert.strictEqual(buscado?.categoria, 'UTILITY');
  assert.strictEqual(buscado?.status, 'APPROVED');

  const todos = getMetaTemplates();
  assert.ok(todos.some(t => t.nome === templateName), 'Template deve constar na listagem geral');

  deleteMetaTemplateFromDb(templateName);
  const aposExcluir = getMetaTemplateByNome(templateName);
  assert.strictEqual(aposExcluir, undefined, 'Template deve ser removido após exclusão');
});

test('createCampanha deve suportar canal_envio = meta_cloud e meta_template_nome', () => {
  const id = createCampanha({
    nome: 'Campanha Oficial Meta Cloud',
    mensagem_template: 'Olá {{1}}, aviso da comunidade: {{2}}',
    canal_envio: 'meta_cloud',
    meta_template_nome: 'notificacao_estoque_v1'
  });

  assert.strictEqual(typeof id, 'number');
  const camp = getCampanhaById(id);
  assert.strictEqual(camp?.nome, 'Campanha Oficial Meta Cloud');
  assert.strictEqual(camp?.canal_envio, 'meta_cloud');
  assert.strictEqual(camp?.meta_template_nome, 'notificacao_estoque_v1');

  deleteCampanha(id);
  const deletada = getCampanhaById(id);
  assert.strictEqual(deletada, undefined);
});
