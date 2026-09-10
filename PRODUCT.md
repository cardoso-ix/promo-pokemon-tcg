# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

[Inferido] Eduardo opera sozinho, de noite. Precisa ver se a réplica está ligada, se WhatsApp/Telegram estão conectados, e criar rotas (origem → destino) sem adivinhar JID de grupo. Desde 30/08 o painel também fecha em mobile/tablet (CRT, responsivo).

## Product Purpose

Painel privado da réplica (única esteira do projeto desde 31/08): copia oferta de grupo WhatsApp e republica com o link de afiliado, sem curadoria. Sucesso = conectar, escolher grupos pelo nome, gravar rota e acompanhar envios/erros.

## Positioning

Não é um SaaS de afiliado (sem planos, pagamentos ou envio em massa). É o cockpit da Evolution + n8n + Postgres do próprio servidor.

## Operating Context

Página HTML gerada por um Code node do n8n (`/webhook/replica/painel`), Basic Auth no GET, token de save nos POSTs. HTML não pode ter aspas duplas nem barra invertida. WhatsApp via Evolution (`promo-replica`); Telegram é o canal já cadastrado (`@promopokemontcg`), não OAuth.

## Capabilities and Constraints

- Abas: Visão Geral, Conexões, Rotas, Configurações, Atividades
- Rotas nomeadas com toggle ATIVA, origens WA e destinos TG/WA
- Combo pesquisável por nome de grupo
- GET não pode chamar `findChats`/`fetchAllGroups`
- [Inferido] Encoding UTF-8 obrigatório (nomes com acento e emoji)

## Brand Commitments

Nome de tela: Replica Promo / Replica de Promocoes. Pokémon TCG. Usuário pediu visual o mais estético e moderno possível, usando Impeccable. Referência de fluxo: dashboard tipo Connect Afiliado (layout/informação), sem copiar marca nem produto.

## Evidence on Hand

Painel vivo em `backups/2026-08-28/painel/replica-painel.html`. Dados reais vêm do Postgres (`replica_*`, logs do ingest). Não fabricar métricas de marketplace (ML/Amazon/Shopee).

## Product Principles

1. A tarefa some o chrome: conectar, rotas, números da semana.
2. Nome humano do grupo, nunca JID.
3. Página rápida; sync pesado fica fora do GET.
4. Não inventar capacidade (planos, massa, gerar imagem, curadoria automática).
5. Escuro porque o uso é noturno, na frente de um monitor.

## Accessibility & Inclusion

[Inferido] Um operador, teclado no combo (Enter/Escape), contraste de texto sobre fundo escuro.
