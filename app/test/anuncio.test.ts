import assert from 'node:assert';
import { test } from 'node:test';
import {
  formatarTituloPorSlug,
  gerarCopyPromocional,
  extrairDetalhesPrecoECupom,
  extrairDadosAnuncio
} from '../src/core/anuncio.js';
import { isAnuncioEsgotadoOuPausado } from '../src/core/pricing.js';

test('formatarTituloPorSlug deve formatar slugs de forma limpa e com palavras-chave Pokémon', () => {
  const slug = 'pokemon-colecao-mega-zygarde-ex-box-lacrada-original-copag';
  const titulo = formatarTituloPorSlug(slug);

  assert.strictEqual(titulo.includes('Pokémon'), true);
  assert.strictEqual(titulo.includes('BOX'), true);
  assert.strictEqual(titulo.includes('COPAG'), true);
  assert.strictEqual(titulo.includes('EX'), true);
  assert.strictEqual(titulo.includes('Mega Zygarde'), true);
});

test('gerarCopyPromocional deve iniciar com @pokemon_tcg_promo e NÃO conter SUPER PROMOÇÃO', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Pokémon Booster Box 36 Pacotes',
    linkAfiliado: 'https://mercadolivre.com/sec/2rM6RPm',
    precoDe: '299,00',
    precoPor: '249,00'
  });

  // Não pode conter a linha de super promoção
  assert.strictEqual(copy.includes('SUPER PROMOÇÃO'), false);
  // Primeira linha deve ser @pokemon_tcg_promo seguido do título do item
  assert.strictEqual(copy.startsWith('@pokemon_tcg_promo\n\n📦 *Pokémon Booster Box 36 Pacotes*'), true);
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
    valorComCupom: '224,10'
  });

  assert.strictEqual(copy.startsWith('@pokemon_tcg_promo\n\n📦 *Pokémon Booster Box 36 Pacotes*'), true);
  assert.strictEqual(copy.includes('❌ ~De: R$ 299,00~'), true);
  assert.strictEqual(copy.includes('👉 *Por apenas: R$ 249,00*'), true);
  assert.strictEqual(copy.includes('🔥 *Com cupom: R$ 224,10*'), true);
  assert.strictEqual(copy.includes('🎟️ Cupom: *POKEMON10*'), true);
  assert.strictEqual(copy.includes('https://mercadolivre.com/sec/2rM6RPm'), true);
  // Não deve conter linhas extras desnecessárias
  assert.strictEqual(copy.includes('Produto original com estoque'), false);
  assert.strictEqual(copy.includes('Compre com desconto exclusivo'), false);
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
  // Preço atual auto-extraído da publicação ao vivo
  assert.strictEqual(Boolean(resultado.precoPor), true);
  // Copy inicia direto pelo item
  assert.strictEqual(resultado.textoGerado.startsWith('@pokemon_tcg_promo\n\n📦 *'), true);
});

test('extrairDetalhesPrecoECupom NÃO deve extrair parcelamento quando houver juros e NÃO deve aceitar Com cupom genérico', () => {
  const htmlComJurosESemCupom = `
    <div class="poly-card">
      <h2 class="poly-box"><a class="poly-component__title" href="#">Case Lacrada De Combo De Booster Escuridao Absoluta</a></h2>
      <s class="andes-money-amount poly-price__previous andes-money-amount--previous" aria-label="Antes: 239 reais com 90 centavos">
        <span class="andes-money-amount__fraction">239</span>
        <span class="andes-money-amount__cents">90</span>
      </s>
      <div class="poly-price__current">
        <span class="andes-money-amount" aria-label="Agora: 213 reais com 30 centavos">
          <span class="andes-money-amount__fraction">213</span>
          <span class="andes-money-amount__cents">30</span>
        </span>
      </div>
      <div class="poly-price__installments">
        12x <span class="andes-money-amount" aria-label="21 reais com 11 centavos">R$ 21,11</span>
      </div>
      <span class="poly-coupon">Com cupom</span>
    </div>
  `;

  const detalhes = extrairDetalhesPrecoECupom(htmlComJurosESemCupom);

  assert.strictEqual(detalhes.precoDe, '239,90');
  assert.strictEqual(detalhes.precoPor, '213,30');
  // Deve ser undefined pois 12x 21,11 tem juros e não tem menção de "sem juros"
  assert.strictEqual(detalhes.parcelamento, undefined);
  // Deve ser undefined pois "Com cupom" é texto genérico de UI e não um código
  assert.strictEqual(detalhes.cupom, undefined);
  assert.strictEqual(detalhes.valorComCupom, undefined);
});

test('gerarCopyPromocional NÃO deve incluir linha de parcelamento com juros e NÃO deve exibir COM CUPOM', () => {
  const copy = gerarCopyPromocional({
    titulo: 'Case Lacrada De Combo De Booster Escuridao Absoluta Pokemon',
    linkAfiliado: 'https://meli.la/1ttELw8',
    precoDe: '239,90',
    precoPor: '213,30',
    cupom: 'COM CUPOM', // se vier valor inválido, deve ser descartado
    parcelamento: '12x de R$ 21,11' // sem menção de "sem juros"
  });

  assert.strictEqual(copy.includes('COM CUPOM'), false);
  assert.strictEqual(copy.includes('Cupom de Desconto'), false);
  assert.strictEqual(copy.includes('💳'), false);
  assert.strictEqual(copy.includes('12x'), false);
  assert.strictEqual(copy.includes('❌ ~De: R$ 239,90~'), true);
  assert.strictEqual(copy.includes('👉 *Por apenas: R$ 213,30*'), true);
});

test('extrairDadosAnuncio deve extrair preço real de produto com valor único e não capturar carrossel de recomendação', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://meli.la/1FRkD5j'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  if (resultado.precoPor) {
    // Quando a rede online responde com o anúncio, o preço deve ser do produto real (> 100) e JAMAIS 65 ou 78 de carrossel
    const precoNum = parseFloat(resultado.precoPor.replace('.', '').replace(',', '.'));
    const precoValido = !isNaN(precoNum) && precoNum > 100;
    assert.strictEqual(precoValido, true);
    assert.strictEqual(resultado.precoDe, undefined);
  }
  assert.strictEqual(resultado.linkAfiliado.includes('matt_word=meutag'), true);
  assert.strictEqual(resultado.textoGerado.includes('Produto original com estoque'), false);
});

test('extrairDadosAnuncio deve extrair De 70,90 e Por promocional (~R$ 36-37) do Fichario meli.la/1355NNd e rejeitar cupom generico de recomendacao', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://meli.la/1355NNd'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  if (resultado.precoDe) {
    assert.strictEqual(resultado.precoDe, '70,90');
    assert.strictEqual(typeof resultado.precoPor === 'string' && resultado.precoPor.startsWith('3'), true);
    assert.strictEqual(resultado.cupom, undefined);
  }
});

test('extrairDadosAnuncio deve suportar links de produtos da Shopee sem quebrar', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://shopee.com.br/Pokemon-Tcg-Box-Treinador-Avancado-Copag-i.123456789.987654321',
      precoDe: '350,00',
      precoPor: '289,90',
      cupom: 'SHOPEE20'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  assert.strictEqual(resultado.titulo.includes('Pokémon'), true);
  assert.strictEqual(resultado.textoGerado.includes('289,90'), true);
  assert.strictEqual(resultado.textoGerado.includes('SHOPEE20'), true);
  // O link final da Shopee não pode ser adulterado por parâmetros do Mercado Livre
  assert.strictEqual(resultado.linkAfiliado.includes('matt_word'), false);
  assert.strictEqual(resultado.linkAfiliado.includes('shopee.com.br'), true);
});

test('extrairDadosAnuncio deve ter fallback gracioso para links gerais com tolerância anti-bot', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://www.exemplo.com.br/deck-pokemon-charizard-ex-lacrado',
      precoPor: '149,90'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  assert.strictEqual(resultado.textoGerado.includes('149,90'), true);
  assert.strictEqual(resultado.textoGerado.includes('exemplo.com.br'), true);
});

test('extrairDadosAnuncio SEMPRE deve re-afiliar link de concorrente (meli.la) e nunca manter link alheio', async () => {
  const linkConcorrente = 'https://meli.la/2PTWG6y';
  const resultado = await extrairDadosAnuncio(
    {
      url: linkConcorrente
    },
    {
      mattWord: 'meutag-oficial',
      mattTool: '778899',
      meliTag: 'meutag-oficial'
    }
  );

  assert.strictEqual(resultado.ok, true);
  // O link final NUNCA pode ser o link original do concorrente sem re-afiliação
  assert.notStrictEqual(resultado.linkAfiliado, linkConcorrente);
  // Deve conter a tag do usuário no link longo ou novo link gerado
  assert.strictEqual(
    resultado.linkAfiliado.includes('matt_word=meutag-oficial') || resultado.linkAfiliado.startsWith('https://meli.la/'),
    true
  );
  assert.strictEqual(!resultado.textoGerado.includes(linkConcorrente), true);
});

test('extrairDetalhesPrecoECupom deve higienizar placeholders do JSON do ML e formatar parcelamento sem juros limpo', () => {
  const jsonHtml = `
    <html>
      <body>
        <script>
          {"type":"price","original_price":{"value":516.27},"current_price":{"value":464.64},"installments":{"text":"{o} {price_total} {en} 10x {price} sem juros","no_interest":true,"quantity":10,"amount":46.46}}
        </script>
      </body>
    </html>
  `;

  const detalhes = extrairDetalhesPrecoECupom(jsonHtml);
  assert.strictEqual(detalhes.precoDe, '516,27');
  assert.strictEqual(detalhes.precoPor, '464,64');
  assert.strictEqual(detalhes.parcelamento?.includes('{o}'), false);
  assert.strictEqual(detalhes.parcelamento?.includes('{price_total}'), false);
  assert.strictEqual(detalhes.parcelamento?.includes('sem juros sem juros'), false);
  assert.strictEqual(detalhes.parcelamento, '10x de R$ 46,46 sem juros');
});

test('isAnuncioEsgotadoOuPausado deve identificar status paused, estoque esgotado ou redirecionamento para vitrine', () => {
  const htmlPausado = '<div class="ui-pdp-container"><span>Anúncio pausado</span><div class="recomendados">R$ 15,00</div></div>';
  assert.strictEqual(isAnuncioEsgotadoOuPausado(htmlPausado), true);

  const htmlEsgotado = '<div class="ui-pdp-container"><span>Estoque esgotado</span></div>';
  assert.strictEqual(isAnuncioEsgotadoOuPausado(htmlEsgotado), true);

  const htmlFinalizado = '<script>{"status":"paused","inventory_status":"out_of_stock"}</script>';
  assert.strictEqual(isAnuncioEsgotadoOuPausado(htmlFinalizado), true);

  const htmlVitrine = '<html><title>Minha Vitrine</title></html>';
  assert.strictEqual(isAnuncioEsgotadoOuPausado(htmlVitrine, 'https://mercadolivre.com/sec/2rM6RPm'), true);

  const htmlAtivo = '<div class="ui-pdp-buybox"><button>Comprar agora</button><span class="andes-money-amount">R$ 299,00</span></div>';
  assert.strictEqual(isAnuncioEsgotadoOuPausado(htmlAtivo, 'https://produto.mercadolivre.com.br/MLB-12345'), false);
});

test('extrairDetalhesPrecoECupom NÃO deve capturar preços de carrossel de recomendação quando anúncio estiver esgotado', () => {
  const htmlEsgotadoComRecomendacoes = `
    <html>
      <body>
        <div class="ui-pdp-status-message">Anúncio pausado</div>
        <div class="poly-recommendations">
          <p>Quem viu este produto também comprou:</p>
          <span class="andes-money-amount__fraction">8</span>
          <span class="andes-money-amount__cents">50</span>
        </div>
      </body>
    </html>
  `;

  const detalhes = extrairDetalhesPrecoECupom(htmlEsgotadoComRecomendacoes, 'https://produto.mercadolivre.com.br/MLB-123456');
  assert.strictEqual(detalhes.esgotado, true);
  // O preço do carrossel (R$ 8,50) NÃO pode ser capturado como preço do produto
  assert.strictEqual(Boolean(detalhes.precoPor), false);
});

test('extrairDadosAnuncio deve preservar preço postado pelo usuário quando anúncio estiver esgotado no ML', async () => {
  const resultado = await extrairDadosAnuncio(
    {
      url: 'https://produto.mercadolivre.com.br/MLB-999999-pokemon-tcg-30-anos',
      titulo: 'Pokémon Booster Box 30 Anos',
      precoPor: '289,00',
      precoDe: '349,00'
    },
    {
      mattWord: 'meutag',
      mattTool: '123456'
    }
  );

  assert.strictEqual(resultado.ok, true);
  // Deve preservar com soberania o preço postado e NÃO transformar em 8 ou 30 reais
  assert.strictEqual(resultado.precoPor, '289,00');
  assert.strictEqual(resultado.precoDe, '349,00');
  assert.strictEqual(resultado.textoGerado.includes('289,00'), true);
  // O link gerado para compra deve direcionar para a busca com estoque ativo se esgotado
  assert.strictEqual(
    resultado.linkAfiliado.includes('lista.mercadolivre.com.br') ||
    resultado.textoGerado.includes('lista.mercadolivre.com.br'),
    true
  );
});



