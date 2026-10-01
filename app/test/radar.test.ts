import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filtrarProdutosConfiaveis,
  formatarCopyCliente,
  formatarCopyGrupo,
  identificarTipoEntradaRadar,
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
});
