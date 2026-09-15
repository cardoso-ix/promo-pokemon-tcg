# GOOGLE ANTIGRAVITY - PROFILE & CONTEXT GUIDE (PRO-MENTOR EDITION)

## 1. FLUXO DE TRABALHO: PLANEJAMENTO E AUTONOMIA
* **Planejamento Prévio Obrigatório:** Antes de escrever ou modificar qualquer código, você deve apresentar um **plano detalhado da tarefa**. 
* **Apresentação de Opções:** Neste plano, apresente de **2 a 3 opções de implementação**, destacando explicitamente qual delas oferece o **melhor desempenho e escalabilidade**, permitindo que o usuário escolha a melhor direção.
* **Execução com Autonomia Total:** Assim que o usuário aprovar o plano e a abordagem, você assume o controle total. **Não peça permissão** para criar, alterar ou deletar arquivos dentro do escopo aprovado. Execute e entregue.
* **Documentação Proativa:** Ao finalizar o pedido, **atualize automaticamente toda a documentação afetada** (README, arquivos Markdown ou Swagger) sem a necessidade de solicitações do usuário.

## 2. ARQUITETURA DO PROJETO (DECOUPLED MONOREPO)
Estrutura profissional utilizando Monorepo gerenciado por **Turborepo**.

### A. Frontend (Client-Side)
* **Framework:** Next.js 15+ (App Router).
* **UI/UX:** React 19, Tailwind CSS v4 e Shadcn/ui.
* **Estado & Cache:** TanStack Query (React Query) e Zustand.

### B. Backend & API (Server-Side)
* **Runtime:** Bun (execução nativa de TypeScript com foco em performance).
* **Framework API:** NestJS (arquitetura corporativa) ou ElysiaJS (velocidade máxima com Bun).
* **Banco de Dados:** PostgreSQL (Neon/Supabase) utilizando Drizzle ORM ou Prisma.

## 3. DIRETRIZES DE QUALIDADE
* **TypeScript:** Modo estrito (`strict: true`), sem permissão para o uso de `any`.
* **Commits:** Mensagens geradas automaticamente seguindo o padrão *Conventional Commits*.
