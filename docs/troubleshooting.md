# Troubleshooting — Diagnóstico e Resolução de Problemas

Guia para solução rápida de incidentes na Promo Réplica.

---

## T1 — O Painel Web não abre ou retorna erro 502 / 404

**Causa 1: Container ainda inicializando no Railway**
- O build e inicialização levam em média de 1 a 2 minutos após um deploy.
- **Solução**: Acesse o dashboard do Railway, abra a aba **Deployments** e confira os logs de build e runtime. Verifique se aparece `Painel Web disponível em: http://0.0.0.0:3000`.

**Causa 2: Porta ou Host incorretos**
- O Fastify precisa escutar em `0.0.0.0` (IPv4) e na porta indicada pela variável de ambiente `PORT` (fornecida automaticamente pelo Railway).
- **Verificação**: A rota `/health` deve retornar `{ status: "ok" }`.

---

## T2 — WhatsApp desconectado ou QR Code não aparece

**Causa 1: Sessão desvinculada no celular**
- O WhatsApp pode desvincular aparelhos se o chip ficar sem conexão ou por política de segurança do aplicativo.
- **Solução**: Acesse o painel. Se o status for **Desconectado** ou **Aguardando QR Code**, um novo QR Code será renderizado na tela. Basta escanear pelo celular.

**Causa 2: Chaves de sessão corrompidas**
- Se a conexão ficar travada em ciclo de reconexão:
- **Solução**: Pare o serviço, limpe o diretório `data/auth_baileys/` e reinicie. Um novo QR Code limpo será emitido.

---

## T3 — Mensagem enviada na Origem mas não replicada no Destino

Verifique os seguintes pontos no feed de **Atividades (Logs)** do painel:

| Motivo no Log | Significado | Solução |
| --- | --- | --- |
| `esteira_desligada` | O alternador geral da esteira está desligado. | Ative a chave **Réplica Ativa** no topo do painel. |
| `nenhuma_rota_ativa` | O grupo de origem não pertence a nenhuma rota marcada como ativa. | Vá na aba **Rotas** e confira se a rota correspondente está com a chave ligada. |
| `loop_detectado` | O grupo de origem é o mesmo que o de destino. | Separe grupos de origem e destino para evitar reenvio para o mesmo canal. |
| `teto_hora_atingido` | O limite de postagens por hora (`teto_hora`) foi alcançado. | Aguarde a virada da hora ou aumente o limite na aba **Configurações**. |
| `mensagem_defasada` | A mensagem original tinha mais de 10 minutos de idade. | Comportamento normal para evitar postar promoções antigas após reinicializações. |
| `duplicada` | Mensagem com mesmo conteúdo já enviada anteriormente. | O filtro anti-duplicação descartou o envio repetido. |

---

## T4 — Imagem da postagem não saiu no grupo de destino

**Causa: Tipo de encapsulamento especial de mídia**
- A aplicação possui suporte nativo para desembrulhar mídias normais, efêmeras (`ephemeralMessage`), visualização única (`viewOnceMessageV2`) e enviadas por aparelhos conectados (`deviceSentMessage`).
- **Verificação**: Se o post original contiver uma imagem externa ou sticker, o Baileys pode registrar apenas o texto.
- Caso a postagem contenha um link do Mercado Livre, o fallback automático de scraper coletará a imagem oficial do produto (`og:image`) em alta resolução (2X) e enviará junto com o texto.

---

## T5 — Link não foi encurtado como `meli.la` (saiu como link longo com `matt_word`)

**Causa: Cookie do Mercado Livre expirado ou inválido**
- Quando o cookie expira, o encurtador aciona o **fallback de segurança** para garantir que a comissão não seja perdida, gerando um link parametrizado com `matt_word` e `matt_tool`.
- **Solução**:
  1. Faça login na sua conta de afiliado do Mercado Livre.
  2. Cole o cookie atualizado na aba **Configurações** do painel.
  3. Clique no botão **Testar Cookie** para validar.
  4. Uma vez aprovado, os próximos posts voltarão a usar `meli.la`.
