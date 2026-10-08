import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  initDatabase,
  salvarTotalMembrosComunidade,
  obterTotalMembrosComunidade
} from '../src/db/database.js';

describe('Sincronização da Base de Membros da Comunidade VIP', () => {
  before(() => {
    initDatabase();
  });

  it('deve obter total padrão ou previamente salvo de membros', () => {
    const totalInicial = obterTotalMembrosComunidade();
    assert.ok(typeof totalInicial.totalMembros === 'number');
    assert.ok(totalInicial.totalMembros >= 0);
  });

  it('salvarTotalMembrosComunidade deve atualizar a contagem e nome do grupo no banco SQLite', () => {
    salvarTotalMembrosComunidade(342, 'Grupo VIP Pokémon TCG');
    const dados = obterTotalMembrosComunidade();
    assert.equal(dados.totalMembros, 342);
    assert.equal(dados.grupoNome, 'Grupo VIP Pokémon TCG');
    assert.ok(dados.atualizadoEm);
  });
});
