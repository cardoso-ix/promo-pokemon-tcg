# Backup 16/08/2026 — Catalog Scanner (inativo)

Fonte do `Pokemon Catalog Scanner` (`2ckVyvFPvtqwECDI`). O workflow **existe no n8n e fica
inativo**. Não publique. A listagem `lista.mercadolivre.com.br` falhou no ScraperAPI com
`render=true` e com `premium=true`
([Decisão 42](../../docs/historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)).

**Isto não substitui o n8n** e **não** é snapshot do Store Scanner / Publisher / Health Alert.

| Arquivo | O que é |
| --- | --- |
| `code-nodes/pokemon-catalog-scanner--extrair-ofertas-do-catalogo.js` | Parser `_n.ctx.r` → `results[].polycard` |
| `code-nodes/pokemon-catalog-scanner--filtrar-loja-de-teste.js` | `TESTE_SO_POKEMON = true` (só `pokemon`) |
| `code-nodes/pokemon-catalog-scanner--injetar-wid-e-loja.js` | `wid` no link de afiliado |
| `gerar-catalog-scanner-workflow.js` / `pokemon-catalog-scanner.workflow.js` | Gerador SDK (credencial por nome, sem chave) |

Credenciais **não** estão aqui. No n8n a Query Auth já existe; o campo **Name** da aba
Connection tem que ser `api_key`.
