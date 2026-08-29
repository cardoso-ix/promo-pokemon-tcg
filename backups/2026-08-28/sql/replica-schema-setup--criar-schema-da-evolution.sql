-- Replica Schema Setup -> node "Criar Schema da Evolution"
-- Roda depois de "Semear Config Padrao". Idempotente.
--
-- Por que existe: a Evolution API guarda as tabelas dela no mesmo banco pokemon_promos, mas em
-- schema proprio, para nunca se misturar com as tabelas do projeto (que vivem em public). O
-- Prisma da Evolution espera o schema ja existir; ele nao cria.
--
-- Foi tentado antes como passo db-init dentro do docker-compose da Evolution. Fazer daqui e
-- melhor: usa a credencial que o n8n ja tem e nao depende de a senha estar certa no .env.
CREATE SCHEMA IF NOT EXISTS evolution;
SELECT nspname FROM pg_namespace WHERE nspname = 'evolution';
