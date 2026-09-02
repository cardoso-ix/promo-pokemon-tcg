# Scripts locais

Nada daqui roda sozinho. O bot vive no n8n da VPS. Estes arquivos só publicam
código **já versionado** para lá, ou geram um paraquedas.

Todos os `publicar-*.py` exigem `N8N_API_KEY` no ambiente (Cursor Secrets ou
`export`). Não cole a chave no git. O token de save do painel vem de
`REPLICA_PAINEL_SAVE_TOKEN` ou do fallback já usado pelos nodes — também não cole.

PUT do n8n: em `settings` só `executionOrder` / `availableInMCP` / `timezone`.
`binaryMode` devolve 400. Depois do PUT, o script chama `/activate`. Confira
`versionId` = `activeVersionId`.

## Usar no dia a dia

| Script | O que faz |
| --- | --- |
| `python3 tools/publicar-painel.py` | Valida o HTML (sem `"` nem `\`), grava `replica_config.pagina_gz`, tira a chave da whitelist |
| `python3 tools/publicar-painel.py --login` | Regrava o node `Montar Pagina Login` a partir de `replica-login.html` |
| `python3 tools/publicar-painel.py --dry-run` | Só imprime tamanho/MD5, não grava |
| `python3 tools/publicar-ingest-n8n.py` | Sobe o Code node `Montar Post` (e o SQL vivo) do ingest |
| `python3 tools/publicar-replica-health-alert.py` | Cria/atualiza o `Replica Health Alert` e ativa. Copia o Telegram do Health Alert da curadoria (token não vai ao git) |

Fonte do HTML: `backups/2026-08-28/painel/`. Fonte do ingest: `backups/2026-09-02/`.

## Parquedas (não é o caminho normal)

| Script | Quando |
| --- | --- |
| `gerar-painel-code-node.mjs` | Só se a [Decisão 51](../docs/historico-de-decisoes.md#decisão-51--fechar-o-html-do-painel-em-pagina_gz) for revertida e o HTML voltar a morar no Code node |

## Legados (não rode)

Nasceram nesta sessão para um ajuste pontual. O equivalente está nos dois scripts
do dia a dia.

- `publicar-painel-titulo-n8n.py`
- `publicar-titulo-replica-n8n.py`
- `publicar-foto-replica-n8n.py`
- `testar-foto-replica.mjs` — experimento local da foto; produção usa o polycard do ingest
