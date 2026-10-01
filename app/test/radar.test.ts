import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filtrarProdutosConfiaveis,
  formatarCopyCliente,
  formatarCopyGrupo,
  identificarTipoEntradaRadar,
  resolverImagemProdutoTCG,
  buscarNoRadar,
  resolverLinkVerNoMl,
  obterPrecoMinimoCategoriaTCG,
  type MeliItemBusca,
  type FiltrosRadar
} from '../src/core/radar.js';

describe('Radar de Preços TCG - Core & Filtros de Confiabilidade', () => {
  const mockItems: MeliItemBusca[] = [
    {
      id: 'MLB101',
      title: 'Pokémon TCG: Coleção Especial 30 Anos Poster Box',
      price: 189.90,
      original_price: 229.90,
      currency_id: 'BRL',
      thumbnail: 'http://http2.mlstatic.com/D_101-I.jpg',
      permalink: 'https://www.mercadolivre.com.br/item-101',
      condition: 'new',
      official_store_id: 1234,
      official_store_name: 'Copag Oficial',
      seller: {
        id: 999,
        nickname: 'COPAG_OFICIAL',
        power_seller_status: null
      },
      seller_reputation: {
        level_id: '5_green',
        power_seller_status: null
      },
      shipping: {
        free_shipping: true,
        logistic_type: 'fulfillment'
      },
      installments: {
        quantity: 6,
        amount: 31.65,
        rate: 0
      }
    },
    {
      id: 'MLB102',
      title: 'Pokémon TCG Booster Box Escarlate e Violeta 36 boosters',
      price: 279.00,
      original_price: null,
      currency_id: 'BRL',
      thumbnail: 'http://http2.mlstatic.com/D_102-I.jpg',
      permalink: 'https://www.mercadolivre.com.br/item-102',
      condition: 'new',
      official_store_id: null,
      official_store_name: null,
      seller: {
        id: 888,
        nickname: 'TCG_GAMES_PLATINUM',
        power_seller_status: 'platinum'
      },
      seller_reputation: {
        level_id: '5_green',
        power_seller_status: 'platinum'
      },
      shipping: {
        free_shipping: true,
        logistic_type: 'fulfillment'
      },
      installments: {
        quantity: 10,
        amount: 27.90,
        rate: 0
      }
    },
    {
      id: 'MLB103',
      title: 'Carta Pokémon Charizard Usada Rara',
      price: 50.00,
      original_price: null,
      currency_id: 'BRL',
      thumbnail: 'http://http2.mlstatic.com/D_103-I.jpg',
      permalink: 'https://www.mercadolivre.com.br/item-103',
      condition: 'used', // USADO - deve ser filtrado
      official_store_id: null,
      official_store_name: null,
      seller: {
        id: 777,
        nickname: 'VENDEDOR_ALEATORIO',
        power_seller_status: null
      },
      seller_reputation: {
        level_id: '3_yellow',
        power_seller_status: null
      },
      shipping: {
        free_shipping: false,
        logistic_type: 'cross_docking'
      },
      installments: {
        quantity: 3,
        amount: 19.00,
        rate: 15
      }
    },
    {
      id: 'MLB104',
      title: 'Pokémon TCG Elite Trainer Box Destinos de Paldea',
      price: 349.90,
      original_price: 399.90,
      currency_id: 'BRL',
      thumbnail: 'http://http2.mlstatic.com/D_104-I.jpg',
      permalink: 'https://www.mercadolivre.com.br/item-104',
      condition: 'new',
      official_store_id: null,
      official_store_name: null,
      seller: {
        id: 666,
        nickname: 'VENDEDOR_SEM_MEDALHA',
        power_seller_status: null // NÃO É OFICIAL NEM PLATINUM
      },
      seller_reputation: {
        level_id: '4_light_green',
        power_seller_status: null
      },
      shipping: {
        free_shipping: false,
        logistic_type: 'xd_drop_off'
      },
      installments: {
        quantity: 12,
        amount: 35.00,
        rate: 20
      }
    }
  ];

  it('deve identificar corretamente URL vs Termo de busca', () => {
    assert.deepEqual(identificarTipoEntradaRadar('https://www.mercadolivre.com.br/produto/p/MLB123'), {
      tipo: 'url',
      valor: 'https://www.mercadolivre.com.br/produto/p/MLB123'
    });
    assert.deepEqual(identificarTipoEntradaRadar('meli.la/123xyz'), {
      tipo: 'url',
      valor: 'https://meli.la/123xyz'
    });
    assert.deepEqual(identificarTipoEntradaRadar('Booster Box 360'), {
      tipo: 'termo',
      valor: 'Booster Box 360'
    });
  });

  it('deve filtrar produtos mantendo apenas Lojas Oficiais e MercadoLíder Platinum novos', () => {
    const filtros: FiltrosRadar = {
      apenasOficiaisOuPlatinum: true,
      apenasNovos: true
    };

    const filtrados = filtrarProdutosConfiaveis(mockItems, filtros);

    assert.equal(filtrados.length, 2);
    assert.equal(filtrados[0].id, 'MLB101'); // Copag Oficial
    assert.equal(filtrados[1].id, 'MLB102'); // MercadoLíder Platinum
  });

  it('deve aplicar filtros adicionais de Frete Grátis, Envio Full e Sem Juros', () => {
    const filtros: FiltrosRadar = {
      apenasOficiaisOuPlatinum: true,
      apenasNovos: true,
      apenasFreteGratis: true,
      apenasFull: true,
      apenasSemJuros: true
    };

    const filtrados = filtrarProdutosConfiaveis(mockItems, filtros);

    assert.equal(filtrados.length, 2);
    assert.ok(filtrados.every(i => i.shipping?.free_shipping && i.shipping?.logistic_type === 'fulfillment'));
    assert.ok(filtrados.every(i => i.installments?.rate === 0));
  });

  it('deve ordenar por menor preço asc corretamente', () => {
    const filtros: FiltrosRadar = {
      apenasNovos: true,
      ordenarPor: 'price_asc'
    };

    const filtrados = filtrarProdutosConfiaveis(mockItems, filtros);
    assert.equal(filtrados[0].price, 189.90);
    assert.equal(filtrados[1].price, 279.00);
    assert.equal(filtrados[2].price, 349.90);
  });

  it('formatarCopyCliente deve gerar texto consultivo de alto impacto 1-a-1 com link de afiliado', () => {
    const item = mockItems[0];
    const linkAfiliado = 'https://meli.la/afiliado-teste';
    const copy = formatarCopyCliente(item, linkAfiliado);

    assert.ok(copy.includes('Fala amigo, tudo bem? Dei uma garimpada'));
    assert.ok(copy.includes(item.title));
    assert.ok(copy.includes('R$ 189,90'));
    assert.ok(copy.includes('Copag Oficial'));
    assert.ok(copy.includes('6x de R$ 31,65 sem juros'));
    assert.ok(copy.includes(linkAfiliado));
    assert.ok(copy.includes('Envio Rápido Full'));
  });

  it('formatarCopyGrupo deve gerar formato promocional limpo para o grupo de WhatsApp', () => {
    const item = mockItems[0];
    const linkAfiliado = 'https://meli.la/afiliado-teste';
    const copy = formatarCopyGrupo(item, linkAfiliado);

    assert.ok(copy.includes(item.title.toUpperCase()));
    assert.ok(copy.includes('R$ 189,90'));
    assert.ok(copy.includes('R$ 229,90')); // Preço De
    assert.ok(copy.includes(linkAfiliado));
    assert.ok(copy.includes('OPORTUNIDADE POKÉMON TCG'));
  });

  it('resolverImagemProdutoTCG deve mapear corretamente cada categoria de produto TCG com fotos reais HD', () => {
    assert.ok(resolverImagemProdutoTCG('Box Charizard ex Fogo Supremo Copag').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Elite Trainer Box Destinos de Paldea').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Fichário Álbum 30 Anos Pokémon TCG Oficial').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Display Booster Box 360 Escarlate e Violeta').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Blister Quádruplo Pokémon TCG 4 Boosters').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Blister Triplo Pokémon TCG com Carta Holográfica').includes('mlstatic.com'));
    assert.ok(resolverImagemProdutoTCG('Coleção Especial 30 Anos Poster Box').includes('mlstatic.com'));
    // Deve preservar URLs reais caso fornecidas
    assert.equal(
      resolverImagemProdutoTCG('Qualquer', 'http://http2.mlstatic.com/D_123-O.jpg'),
      'http://http2.mlstatic.com/D_123-O.jpg'
    );
  });

  it('buscarNoRadar deve retornar ofertas ricas com fotoHd e thumbnail válidos para termos sugeridos', async () => {
    const res = await buscarNoRadar('Booster Box 360', { apenasOficiaisOuPlatinum: true, apenasNovos: true });
    assert.ok(res.ok);
    assert.ok(res.total > 0);
    assert.ok(res.itens.length > 0);

    for (const item of res.itens) {
      assert.ok(item.fotoHd && item.fotoHd.startsWith('http'), `fotoHd deve ser URL real para: ${item.title}`);
      assert.ok(item.thumbnail && item.thumbnail.startsWith('http'), `thumbnail deve ser URL real para: ${item.title}`);
      assert.ok(item.categoria && item.categoria.length > 0, `categoria deve ser classificada para: ${item.title}`);
      assert.ok(item.descricaoPadronizada && item.descricaoPadronizada.length > 0, `descricaoPadronizada deve existir para: ${item.title}`);
      assert.ok(item.price > 0);
      assert.ok(item.linkAfiliado.includes('matt_word'));
    }
  });

  it('buscarNoRadar deve encontrar e priorizar item exato do Charizard com foto real', async () => {
    const res = await buscarNoRadar('Box Charizard ex');
    assert.ok(res.ok);
    assert.ok(res.itens.length > 0);
    assert.ok(res.itens[0].title.toLowerCase().includes('charizard'));
    assert.ok(res.itens[0].fotoHd.includes('mlstatic.com'));
  });

  it('Radar TCG deve utilizar linkCurto oficial nas copies para WhatsApp (1-a-1 e Grupo)', async () => {
    const res = await buscarNoRadar('Poster Box');
    assert.ok(res.ok);
    assert.ok(res.itens.length > 0);
    const item = res.itens[0];
    assert.ok(item.linkCurto, 'linkCurto deve estar preenchido');
    assert.ok(
      item.linkCurto.includes('/sec/') || item.linkCurto.includes('meli.la/'),
      `linkCurto deve ser um link curto oficial do Mercado Livre, recebido: ${item.linkCurto}`
    );
    assert.ok(
      item.copyCliente.includes(item.linkCurto),
      'copyCliente para WhatsApp 1-a-1 deve conter o link curto oficial do Mercado Livre'
    );
    assert.ok(
      item.copyGrupo.includes(item.linkCurto),
      'copyGrupo para WhatsApp de ofertas deve conter o link curto oficial do Mercado Livre'
    );
  });

  it('resolverLinkVerNoMl NUNCA deve redirecionar para a vitrine (/sec/) e deve gerar busca com afiliado para o produto', () => {
    // 1. Caso com link de vitrine / recomendações
    const linkVitrine = 'https://mercadolivre.com/sec/2rM6RPm';
    const titulo = 'Box Pokémon Tcg Mega Forças - Mega Zeraora Ex 8 Boosters Copag';
    const linkResolvido = resolverLinkVerNoMl(linkVitrine, titulo, 'caed1312314', '96097202');

    assert.ok(!linkResolvido.includes('/sec/'), 'Não pode conter /sec/');
    assert.ok(linkResolvido.includes('lista.mercadolivre.com.br'), 'Deve apontar para a listagem do Mercado Livre');
    assert.ok(linkResolvido.includes('caed1312314'), 'Deve incluir a tag de afiliado matt_word');
    assert.ok(linkResolvido.includes('Zeraora'), 'Deve conter o nome do produto na busca');

    // 2. Caso com link direto de produto do Mercado Livre (deve preservar o anúncio direto)
    const linkProduto = 'https://www.mercadolivre.com.br/pokemon-tcg-poster-box/p/MLB12345';
    const linkDireto = resolverLinkVerNoMl(linkProduto, titulo, 'caed1312314', '96097202');
    assert.ok(linkDireto.includes('/p/MLB12345'), 'Deve preservar o link direto do produto');
    assert.ok(linkDireto.includes('matt_word=caed1312314'), 'Deve afilhar o link direto');
  });

  it('obterPrecoMinimoCategoriaTCG deve definir pisos de mercado realistas para produtos Copag', () => {
    assert.strictEqual(obterPrecoMinimoCategoriaTCG('Display Booster Box Pokémon 360'), 140.0);
    assert.strictEqual(obterPrecoMinimoCategoriaTCG('Elite Trainer Box Destinos de Paldea'), 160.0);
    assert.strictEqual(obterPrecoMinimoCategoriaTCG('Box Pokémon Tcg Mega Forças - Mega Zeraora Ex 8 Boosters'), 50.0);
    assert.strictEqual(obterPrecoMinimoCategoriaTCG('Blister Triplo Pokémon'), 25.0);
  });
});
