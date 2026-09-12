import assert from 'node:assert';
import { test } from 'node:test';
import { createCampanha, getCampanhaById, deleteCampanha, addItensFila, getFilaCampanha } from '../src/db/database.js';

test('createCampanha e deleteCampanha devem criar e excluir campanha com cascata na fila', () => {
  const id = createCampanha({
    nome: 'Campanha Teste Exclusão',
    mensagem_template: 'Olá {nome}!'
  });

  assert.strictEqual(typeof id, 'number');
  const criada = getCampanhaById(id);
  assert.strictEqual(criada?.nome, 'Campanha Teste Exclusão');

  addItensFila([
    {
      campanha_id: id,
      destinatario_jid: '5511999999999@s.whatsapp.net',
      mensagem_gerada: 'Olá Carlos!',
      status: 'pendente'
    }
  ]);

  const filaAntes = getFilaCampanha(id);
  assert.strictEqual(filaAntes.length, 1);

  deleteCampanha(id);

  const apagada = getCampanhaById(id);
  assert.strictEqual(apagada, undefined);

  const filaDepois = getFilaCampanha(id);
  assert.strictEqual(filaDepois.length, 0);
});
