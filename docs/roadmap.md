# Roadmap

Nada aqui está em andamento. A curadoria saiu do projeto em 31/08
([Decisão 57](historico-de-decisoes.md#decisão-57--curadoria-aposentada-fica-só-a-réplica)).
Itens que dependiam dela (dashboard único com fila/lojas/cupons, Catalog Scanner, Shopee
como segunda fonte do bot) **caíram**.

---

## O que ainda faria sentido (só réplica)

1. **Entrar em mais grupos** no chip pareado, se quiser mais origem. A Evolution só vê
   grupo do qual o número participa.
2. **Resposta automática no WhatsApp Business** se um dia o anúncio do Instagram mandar
   gente para o número — o Ads não entra no grupo sozinho.
3. **Limpeza periódica** de `replica_log` antigo, se a tabela crescer demais.

Não é mais importante do que deixar a rota **TCG Promo** rodando e olhar o log.

---

## De propósito de fora

- **Religar Scanner/Publisher.** Arquivados. Pedido explícito para não existirem.
- **Instagram automático pelo n8n.** Não há node, app Meta nem revisão. Criativo pago
  sobe na mão pelo Gerenciador de Anúncios.
- **Card 1080×1144 no destino.** Existe no workflow e fica desviado
  ([Decisão 54](historico-de-decisoes.md#decisão-54--foto-inteira-2x-no-destino-card-desviado)).
