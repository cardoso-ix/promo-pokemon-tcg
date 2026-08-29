import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const manual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Rodar Agora' },
});

const relogio = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'A Cada 10 Minutos',
    parameters: {
      rule: {
        interval: [{ field: 'minutes', minutesInterval: 10 }],
      },
    },
  },
});

const listar = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Listar Grupos Sem Nome',
    credentials: { postgres: newCredential('Pokemon Promos DB') },
    parameters: {
      operation: 'executeQuery',
      query: 'INSERT INTO replica_rotas (chat_id, nome, plataforma, ativa)\nSELECT c."remoteJid",\n       CASE\n         WHEN NULLIF(BTRIM(c."name"), \'\') IS NULL\n           OR BTRIM(c."name") = c."remoteJid"\n           OR BTRIM(c."name") LIKE \'%@g.us\'\n         THEN NULL\n         ELSE LEFT(BTRIM(c."name"), 80)\n       END,\n       \'whatsapp\',\n       FALSE\n  FROM evolution."Chat" c\n  JOIN evolution."Instance" i ON i.id = c."instanceId"\n WHERE i.name = \'promo-replica\'\n   AND c."remoteJid" LIKE \'%@g.us\'\nON CONFLICT (chat_id) DO UPDATE\n   SET nome = COALESCE(\n         NULLIF(EXCLUDED.nome, \'\'),\n         NULLIF(replica_rotas.nome, replica_rotas.chat_id),\n         replica_rotas.nome\n       );\n\nSELECT r.chat_id\n  FROM replica_rotas r\n WHERE r.plataforma = \'whatsapp\'\n   AND (\n     r.nome IS NULL\n     OR BTRIM(r.nome) = \'\'\n     OR r.nome = r.chat_id\n     OR r.nome LIKE \'%@g.us\'\n   )\n ORDER BY r.chat_id;',
      options: { queryBatching: 'single' },
    },
    output: [{ chat_id: '120363412734582462@g.us' }],
  },
});

const buscar = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Buscar Subject por JID',
    credentials: { httpHeaderAuth: newCredential('Evolution API Key') },
    parameters: {
      method: 'GET',
      url: 'http://evolution-api:8080/group/findGroupInfos/promo-replica',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'groupJid', value: expr('{{ $json.chat_id }}') },
        ],
      },
      options: {
        timeout: 8000,
        batching: { batch: { batchSize: 1, batchInterval: 400 } },
        response: { response: { neverError: true } },
      },
    },
    output: [{ id: '120363412734582462@g.us', subject: 'Promocoes TCG' }],
  },
});

const extrair = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Extrair Subject',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "function chatIdDe(raw, fallback) {\n  return String((raw && (raw.id || raw.jid || raw.remoteJid || raw.groupJid || (raw.group && raw.group.id))) || fallback || '').trim();\n}\nfunction nomeDe(raw) {\n  const g = raw && raw.group ? raw.group : raw;\n  const candidatos = [g && g.subject, g && g.name, g && g.nome, g && g.subjectName, raw && raw.subject, raw && raw.name];\n  for (let i = 0; i < candidatos.length; i++) {\n    const n = String(candidatos[i] || '').trim();\n    if (!n) continue;\n    if (n.indexOf('@g.us') !== -1) continue;\n    return n.slice(0, 80);\n  }\n  return '';\n}\nconst listados = $('Listar Grupos Sem Nome').all();\nconst respostas = $input.all();\nconst vistos = {};\nconst nomes = [];\nfor (let i = 0; i < respostas.length; i++) {\n  const raw = (respostas[i] && respostas[i].json) || {};\n  const fallback = listados[i] && listados[i].json ? listados[i].json.chat_id : '';\n  const chatId = chatIdDe(raw, fallback);\n  const nome = nomeDe(raw);\n  if (!chatId || chatId.indexOf('@g.us') === -1) continue;\n  if (!nome || vistos[chatId]) continue;\n  vistos[chatId] = true;\n  nomes.push({ chat_id: chatId, nome: nome });\n}\nif (!nomes.length) return [];\nconst nomesJson = JSON.stringify(nomes);\nreturn [{ json: { nomes: nomes, nomes_json: nomesJson, nomes_b64: Buffer.from(nomesJson).toString('base64'), nomes_ok: nomes.length } }];",
    },
    output: [{ nomes_ok: 1, nomes_b64: 'W10=' }],
  },
});

const gravar = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.6,
  config: {
    name: 'Gravar Nomes',
    credentials: { postgres: newCredential('Pokemon Promos DB') },
    parameters: {
      operation: 'executeQuery',
      query: 'UPDATE replica_rotas r\n   SET nome = LEFT(BTRIM(v.nome), 80)\n  FROM json_to_recordset(\n         convert_from(decode($1, \'base64\'), \'UTF8\')::json\n       ) AS v(chat_id text, nome text)\n WHERE r.chat_id = v.chat_id\n   AND v.nome IS NOT NULL\n   AND BTRIM(v.nome) <> \'\'\n   AND BTRIM(v.nome) NOT LIKE \'%@g.us\'\n   AND BTRIM(v.nome) <> v.chat_id;\n\nSELECT COUNT(*) AS nomes_gravados\n  FROM replica_rotas\n WHERE plataforma = \'whatsapp\'\n   AND nome IS NOT NULL\n   AND BTRIM(nome) <> \'\'\n   AND nome NOT LIKE \'%@g.us\'\n   AND nome <> chat_id;',
      options: {
        queryBatching: 'single',
        queryReplacement: expr('{{ $json.nomes_b64 }}'),
      },
    },
    output: [{ nomes_gravados: 1 }],
  },
});

export default workflow('replica-nomes-sync', 'Replica Nomes Sync')
  .add(manual)
  .to(listar)
  .to(buscar)
  .to(extrair)
  .to(gravar)
  .add(relogio)
  .to(listar);
