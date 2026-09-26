# Roadmap — Promo Pokémon TCG (Próximas Melhorias)

Plano de evolução técnica e novos módulos planejados para continuidade no novo computador de desenvolvimento.

---

## 🚀 Próximas Melhorias em Desenvolvimento

### 1. Sincronização Direta via Meta Graph API (Marketing API)
- **Objetivo:** Conectar diretamente a conta de anúncios do Meta Ads (`act_XXXXXX`) ao painel financeiro via Graph API.
- **Benefício:** Atualização diária 100% automática de gastos, impressões, cliques e leads sem necessidade de exportar e fazer upload manual de arquivos `.xlsx` semanais.

### 2. Multi-Sessão & Rotação de Chips WhatsApp (WhatsApp Pool)
- **Objetivo:** Permitir conectar múltiplos chips de WhatsApp simultaneamente no Bot Disparador.
- **Benefício:** Distribuição inteligente de disparos entre vários números (`round-robin`), aumentando a capacidade de contatos diários e reduzindo a zero o risco de saturação de um único chip.

### 3. Integração com Webhook de Conversões do Mercado Livre
- **Objetivo:** Receber notificações automáticas de vendas concluídas via API de Afiliados do Mercado Livre.
- **Benefício:** Apuração exata do faturamento diário gerado por cada link ou campanha, alimentando automaticamente o módulo de DRE e o cálculo da regra dos 70% de reinvestimento.

### 4. Expansão Multi-Afiliados (Amazon e Shopee)
- **Objetivo:** Implementar gerador de links curtos de afiliados para **Amazon** e **Shopee**, replicando o mesmo padrão de alta conversão do Mercado Livre.
- **Benefício:** Quando concorrentes postarem ofertas exclusivas da Amazon ou Shopee, o sistema substituirá os links pelo seu código de afiliado correspondente em vez de descartar.

### 5. Notificações Push e Alertas no Cockpit Web
- **Objetivo:** Alertas sonoros sutis e notificações desktop quando uma nova oferta for capturada ou quando um lead responder no privado solicitando atendimento humano.

### 6. Rotina Periódica de Manutenção e Purge de Logs
- **Objetivo:** Agendador interno (cron) para arquivar e purgar logs de sistema e históricos de mensagens com mais de 60 dias, mantendo os arquivos SQLite permanentemente ultraleves e velozes.

---

## 📌 Histórico de Entregas Recentes Concluídas (v2.5.0)

- [x] Suíte completa de 128 testes automatizados (0 falhas).
- [x] Orquestrador raiz com NPM Workspaces e scripts turnkey de setup (`setup-novo-pc.bat` / `.sh`).
- [x] Módulo financeiro executivo com parser de relatórios Meta Ads e faturas PDF.
- [x] Balanço DRE diário com cálculo automático da regra dos 70% de reinvestimento em tráfego.
- [x] Integração com Meta Cloud API e biblioteca de templates utilitários (`UTILITY` a ~R$ 0,18).
- [x] Gerador reativo de anúncios por link no painel do Replicador.
- [x] Integração contínua com Google Planilhas ("produtos tcg valores").
- [x] Rotação diária de mensagens de abertura às 07:00 AM (fuso de Brasília).
- [x] Design System Glassmorphic unificado (Tema Água e Tema Fogo) com partículas 3D em 60fps.
