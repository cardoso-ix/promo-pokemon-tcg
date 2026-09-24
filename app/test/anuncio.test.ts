import assert from 'node:assert';
import { test } from 'node:test';
import {
  formatarTituloPorSlug,
  gerarCopyPromocional,
  extrairDetalhesPrecoECupom,
  extrairDadosAnuncio
} from '../src/core/anuncio.js';

test('formatarTituloPorSlug deve formatar slugs de forma limpa e com palavras-chave Pokémon', () => {
  const slug = 'pokemon-colecao-mega-zygarde-ex-box-lacrada-original-copag';
  const titulo = formatarTituloPorSlug(slug);

  assert.strictEqual(titulo.includes('Pokémon'), true);
  assert.strictEqual(titulo.includes('BOX'), true);
  assert.strictEqual(titulo.includes('COPAG'), true);
  assert.strictEqual(titulo.includes('EX'), true);
  assert.strictEqual(titulo.includes('Mega Zygarde'), true);
});

test('gerarCopyPromocional deve iniciar direto pelo nome do item e NÃO conter SUPER PROMOÇÃO', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Pokémon Booster Box 36 Pacotes',
    linkAfiliado: 'https://mercadolivre.com/sec/2rM6RPm',
    precoDe: '299,00',
    precoPor: '249,00'
  });

  // Não pode conter a linha de super promoção
  assert.strictEqual(copy.includes('SUPER PROMOÇÃO'), false);
  // Primeira linha deve ser o título do item
  assert.strictEqual(copy.startsWith('📦 *Pokémon Booster Box 36 Pacotes*'), true);
  assert.strictEqual(copy.includes('❌ ~De: R$ 299,00~'), true);
  assert.strictEqual(copy.includes('👉 *Por apenas: R$ 249,00*'), true);
});

test('gerarCopyPromocional deve incluir cupom e valor com cupom quando informados', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Pokémon Booster Box 36 Pacotes',
    linkAfiliado: 'https://mercadolivre.com/sec/2rM6RPm',
    cupom: 'POKEMON10',
    precoDe: '299,00',
    precoPor: '249,00',
    valorComCupom: '224,10',
    parcelamento: '10x de R$ 24,90 sem juros'
  });

  assert.strictEqual(copy.startsWith('📦 *Pokémon Booster Box 36 Pacotes*'), true);
  assert.strictEqual(copy.includes('❌ ~De: R$ 299,00~'), true);
  assert.strictEqual(copy.includes('👉 *Por apenas: R$ 249,00*'), true);
  assert.strictEqual(copy.includes('🔥 *Com cupom sai por apenas: R$ 224,10!*'), true);
  assert.strictEqual(copy.includes('💳 *10x de R$ 24,90 sem juros*'), true);
  assert.strictEqual(copy.includes('🎟️ Cupom de Desconto: *POKEMON10*'), true);
  assert.strictEqual(copy.includes('https://mercadolivre.com/sec/2rM6RPm'), true);
});

test('gerarCopyPromocional deve omitir a linha de cupom quando vazio', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Fichário Pokémon 360 Cartas Ultra Pro',
    linkAfiliado: 'https://meli.la/abc1234',
    cupom: ''
  });

  assert.strictEqual(copy.includes('Cupom de Desconto'), false);
  assert.strictEqual(copy.includes('Fichário Pokémon 360 Cartas Ultra Pro'), true);
  assert.strictEqual(copy.includes('https://meli.la/abc1234'), true);
});

test('extrairDetalhesPrecoECupom deve extrair De, Por, Cupom, Parcelamento e calcular Valor com Cupom', () => {
  const sampleHtml = `
    <div class="poly-card">
      <h2 class="poly-box"><a class="poly-component__title" href="#">Etb Pitch Black Mega Evolution</a></h2>
      <s class="andes-money-amount poly-price__previous andes-money-amount--previous" aria-label="Antes: 407 reais com 99 centavos">
        <span class="andes-money-amount__fraction">407</span>
        <span class="andes-money-amount__cents">99</span>
      </s>
      <div class="poly-price__current">
        <span class="andes-money-amount" aria-label="Agora: 377 reais com 75 centavos">
          <span class="andes-money-amount__fraction">377</span>
          <span class="andes-money-amount__cents">75</span>
        </span>
      </div>
      <div class="poly-price__installments">
        12x de <span class="andes-money-amount" aria-label="31 reais com 47 centavos">R$ 31,47</span> sem juros
      </div>
      <span class="poly-coupon">Cupom 15% OFF</span>
    </div>
  `;

  const detalhes = extrairDetalhesPrecoECupom(sampleHtml);

  assert.strictEqual(detalhes.titulo, 'Etb Pitch Black Mega Evolution');
  assert.strictEqual(detalhes.precoDe, '407,99');
  assert.strictEqual(detalhes.precoPor, '377,75');
  assert.strictEqual(detalhes.cupom, 'Cupom 15% OFF');
  assert.strictEqual(detalhes.valorComCupom, '321,09');
  assert.strictEqual(detalhes.parcelamento?.includes('12x'), true);
});

test('extrairDadosAnuncio deve extrair dados de links do Mercado Livre e preencher precos automaticamente', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://meli.la/2PTWG6y'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  assert.strictEqual(Boolean(resultado.titulo), true);
  assert.strictEqual(resultado.imageUrl?.startsWith('https://http2.mlstatic.com/'), true);
  // Preços auto-extraídos da publicação
  assert.strictEqual(Boolean(resultado.precoDe), true);
  assert.strictEqual(Boolean(resultado.precoPor), true);
  assert.strictEqual(Boolean(resultado.cupom), true);
  // Copy inicia direto pelo item
  assert.strictEqual(resultado.textoGerado.includes('SUPER PROMOÇÃO'), false);
  assert.strictEqual(resultado.textoGerado.startsWith('📦 *'), true);
});
