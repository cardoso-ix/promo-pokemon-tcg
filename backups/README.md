# Backups dos workflows

Cópia dos workflows do n8n guardada no repositório, em pastas com a data da exportação.

**Por que isso existe:** os workflows deste projeto já sumiram uma vez, num redeploy do n8n
([troubleshooting, P6](../docs/troubleshooting.md#p6--os-workflows-desapareceram-do-n8n)).
O n8n é a fonte de verdade; isto aqui é o paraquedas.

## O que tem em cada pasta

| Caminho | Conteúdo |
| --- | --- |
| `<data>/*.json` | O workflow inteiro: nodes, parâmetros e ligações |
| `<data>/code-nodes/*.js` | Só o JavaScript dos Code nodes, legível e diffável |
| `<data>/sql/*.sql` | Só as consultas dos nodes Postgres, uma por arquivo |

Os arquivos `.js` e `.sql` são derivados dos `.json` — existem para você conseguir ler e
comparar o que mudou sem abrir um JSON de 70 KB. Nada aqui é executado a partir do repositório.

**Credenciais não estão aqui, e é de propósito.** O JSON exportado não carrega senha nem
token. Ao restaurar, os nodes de banco e do Telegram vão precisar da credencial religada à mão
([P7](../docs/troubleshooting.md#p7--node-vermelho-reclamando-de-credencial)).

## Como restaurar

1. No n8n, crie um workflow novo e use **Import from File** com o `.json` desejado.
2. Religue a credencial em cada node de Postgres e no node do Telegram.
3. Rode na mão e confira o resultado ([runbook, seção 8](../docs/runbook.md#8-rodar-um-workflow-manualmente-sem-ativar)).
4. **Publique.** Salvar não coloca no ar
   ([P18](../docs/troubleshooting.md#p18--salvar-não-é-publicar-a-produção-roda-a-versão-publicada)).

## Como gerar um backup novo

Não há automação: exporte pelo n8n (menu de três pontos → **Download**) para a pasta
`backups/<AAAA-MM-DD>/`, ou peça a um agente com acesso ao MCP do n8n. Vale fazer sempre que
mexer em Code node ou em consulta.

## Histórico

| Data | O que estava valendo |
| --- | --- |
| 2026-09-02 | Foto oficial do anúncio na réplica (Decisão 52): `Preparar Card` e `Normalizar URL da Foto`. Teste em `tools/testar-foto-replica.mjs`. |
| 2026-08-29 | Amostras do card profissional (Decisão 50): foto de origem, foto do anúncio e PNG de teste em `cards/`. |
| 2026-08-28 | Réplica no ar: HTML do painel (`painel/replica-painel.html`), Code nodes (QR, ingest, painel, nomes), SQL de schema `evolution` / rotas nomeadas / sync. `pagina_gz` fechou em 29/08 (Decisão 51). **Não** versionar `tmp-*` desta pasta — são chunks de injeção. |
| 2026-08-27 | Primeira esteira de réplica no papel: Code nodes e SQL do ingest/painel, HTML antigo. Superado pelo snapshot de 28/08. |
| 2026-08-16 | Catalog Scanner **inativo** (`2ckVyvFPvtqwECDI`): parser `_n.ctx.r`, gerador do workflow, Code nodes. **Não** é snapshot dos workflows ativos. Listagem ML falhou no ScraperAPI ([Decisão 42](../docs/historico-de-decisoes.md#decisão-42--catalog-scanner-criado-e-deixado-inativo)). |
| 2026-08-14 | Cupom só em `cupons_itens`, `wid` no link, reconferência de preço no Publisher. Scanner `983e2ec5`, Publisher `9f003450` ([Decisão 39](../docs/historico-de-decisoes.md#decisão-39--cupom-só-no-produto-testado-e-link-com-wid)). |
| 2026-08-13 | Trava de afiliado e de foto no Publisher, filtro de título só-TCG, link `matt_word` + `matt_tool`. **Atenção:** este snapshot é da **tarde**. A noite de 13/08 ainda mudou o ritmo para Scanner **5 min** / Publisher **2 min**, ligou o Health Alert e o repost por queda de preço. Em **14/08** o teto horário passou a **6**/hora e o filtro passou a aceitar acessórios TCG com Pokémon. Restaurar só esta pasta **sem** olhar o n8n volta intervalos, teto e filtro velhos. |
