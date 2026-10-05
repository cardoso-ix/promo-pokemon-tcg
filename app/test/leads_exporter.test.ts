import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarTelefoneMeta,
  formatarTelefoneExibicao,
  processarLeadsGrupos,
  gerarCsvMetaAds,
  gerarCsvExcelCompleto,
  type ParticipanteRaw
} from '../src/core/leads-exporter.js';

describe('Exportador de Leads do WhatsApp para Meta Ads', () => {
  it('normalizarTelefoneMeta - normaliza telefones brasileiros para o formato 55DDDNUMERO', () => {
    // 55 + DDD + 9 dígitos
    assert.equal(normalizarTelefoneMeta('5511999887766@s.whatsapp.net'), '5511999887766');
    // Apenas número puro
    assert.equal(normalizarTelefoneMeta('5521988776655'), '5521988776655');
    // Número sem DDI com 11 dígitos (DDD + 9 dígitos)
    assert.equal(normalizarTelefoneMeta('11999887766'), '5511999887766');
    // Número sem DDI com 10 dígitos (DDD + 8 dígitos)
    assert.equal(normalizarTelefoneMeta('1188776655'), '551188776655');
    // Com sufixo de dispositivo :0@s.whatsapp.net
    assert.equal(normalizarTelefoneMeta('5531987654321:0@s.whatsapp.net'), '5531987654321');
  });

  it('normalizarTelefoneMeta - rejeita números inválidos ou caracteres corrompidos', () => {
    assert.equal(normalizarTelefoneMeta(''), null);
    assert.equal(normalizarTelefoneMeta('12345'), null); // Curto demais
    assert.equal(normalizarTelefoneMeta('abc@s.whatsapp.net'), null);
  });

  it('formatarTelefoneExibicao - formata visualmente com DDI e parênteses de DDD', () => {
    assert.equal(formatarTelefoneExibicao('5511999887766'), '+55 (11) 99988-7766');
    assert.equal(formatarTelefoneExibicao('551188776655'), '+55 (11) 8877-6655');
  });

  it('processarLeadsGrupos - deduplica contatos presentes em múltiplos grupos e calcula estatísticas', () => {
    const gruposMock: { id: string; name: string; participants: ParticipanteRaw[] }[] = [
      {
        id: 'grupo1@g.us',
        name: 'Pokémon TCG Geral',
        participants: [
          { id: '5511999887766@s.whatsapp.net', admin: 'admin' },
          { id: '5521988776655@s.whatsapp.net' },
          { id: '5531977665544@s.whatsapp.net' }
        ]
      },
      {
        id: 'grupo2@g.us',
        name: 'Pokémon TCG Trocas',
        participants: [
          // Usuário repetido do grupo 1
          { id: '5511999887766@s.whatsapp.net' },
          { id: '5541966554433@s.whatsapp.net' }
        ]
      }
    ];

    const resultado = processarLeadsGrupos(gruposMock, '5599999999999'); // botPhone fictício

    assert.equal(resultado.stats.totalGrupos, 2);
    assert.equal(resultado.stats.totalMembrosBrutos, 5);
    assert.equal(resultado.stats.totalUnicos, 4);
    assert.equal(resultado.stats.totalDuplicadosRemovidos, 1);

    // O contato duplicado deve conter os dois grupos e marcar admin se for admin em ao menos um
    const contatoDuplicado = resultado.contatos.find(c => c.phone === '5511999887766');
    assert.ok(contatoDuplicado);
    assert.equal(contatoDuplicado.groups.length, 2);
    assert.ok(contatoDuplicado.isAdmin);
  });

  it('processarLeadsGrupos - ignora o próprio número do bot logado', () => {
    const gruposMock = [
      {
        id: 'grupo1@g.us',
        name: 'Grupo A',
        participants: [
          { id: '5511999887766@s.whatsapp.net' },
          { id: '5511888888888@s.whatsapp.net' } // Número do bot
        ]
      }
    ];

    const resultado = processarLeadsGrupos(gruposMock, '5511888888888');
    assert.equal(resultado.stats.totalUnicos, 1);
    assert.equal(resultado.contatos[0].phone, '5511999887766');
  });

  it('gerarCsvMetaAds - gera CSV no padrão exato exigido pelo Meta Ads (phone,country)', () => {
    const contatos = [
      {
        phone: '5511999887766',
        formattedPhone: '+55 (11) 99988-7766',
        country: 'BR',
        groups: ['Grupo A'],
        isAdmin: false
      },
      {
        phone: '5521988776655',
        formattedPhone: '+55 (21) 98877-6655',
        country: 'BR',
        groups: ['Grupo B'],
        isAdmin: true
      }
    ];

    const csv = gerarCsvMetaAds(contatos);
    const linhas = csv.trim().split('\n');

    assert.equal(linhas[0], 'phone,country');
    assert.equal(linhas[1], '5511999887766,BR');
    assert.equal(linhas[2], '5521988776655,BR');
  });

  it('gerarCsvExcelCompleto - gera CSV com BOM UTF-8 e colunas detalhadas para Excel', () => {
    const contatos = [
      {
        phone: '5511999887766',
        formattedPhone: '+55 (11) 99988-7766',
        country: 'BR',
        groups: ['Grupo Pokémon', 'Grupo Trocas'],
        isAdmin: true
      }
    ];

    const csv = gerarCsvExcelCompleto(contatos);
    assert.ok(csv.startsWith('\uFEFF')); // BOM UTF-8
    assert.ok(csv.includes('Telefone_Meta;Telefone_Formatado;Pais;Qtd_Grupos;Grupos;Admin'));
    assert.ok(csv.includes('5511999887766;+55 (11) 99988-7766;BR;2;"Grupo Pokémon, Grupo Trocas";Sim'));
  });
});
