# Troubleshooting — Diagnóstico e Resolução de Problemas

Guia para solução rápida de incidentes na plataforma Promo Pokémon TCG (VPS HostGator + Coolify).

---

## T1 — O Painel Web não abre ou retorna erro 502 / Connection Refused

**Causa 1: Container ainda inicializando no Coolify após deploy**
- O build das imagens Docker e a inicialização levam em média de 1 a 2 minutos após um deploy.
- **Solução**: Acesse o painel do Coolify (`http://108.174.145.77:8000`), abra a aplicação e confira os logs de build e runtime. Verifique se aparece `Painel Web disponível em: http://0.0.0.0:3000` (ou `3333`).

**Causa 2: Porta ou Host incorretos**
- O Fastify escuta em `0.0.0.0` (IPv4) e nas portas `3000` (Replicador) e `3333` (Disparador), expostas diretamente no host da VPS.
- **Verificação**: A rota `/health` em ambas as portas deve retornar `{ status: "ok" }`.

---

## T2 — WhatsApp desconectado ou QR Code não conecta

**Causa 1: Sessão desvinculada no celular (Status 401 / LoggedOut)**
- O WhatsApp desvinculou o aparelho pelo smartphone em **Aparelhos Conectados** ou por política periódica de segurança da Meta.
- **Auto-recuperação**: A aplicação detecta o status 401, limpa automaticamente as chaves revogadas de `/app/data/auth_baileys/` (ou `/app/data/auth/`) e reinicia o Baileys em 1,5 segundos gerando um QR Code novo.
- **Botão de Emergência**: Acesse a aba **Conectar WhatsApp** e clique em **🔄 Reiniciar Sessão / Gerar Novo QR Code**.

**Causa 2: Celular lê o QR Code mas não finaliza a conexão (Status 515)**
- Ao escanear o QR Code, o WhatsApp envia o código `515 (restartRequired)` para reiniciar a conexão em modo autenticado.
- O sistema trata o status 515 reconectando **imediatamente (0ms)** e preservando as credenciais recebidas.
- A assinatura do cliente utiliza obrigatoriamente `Browsers.windows('Chrome')` (`['Windows', 'Chrome', '10.0.22631']`) com `syncFullHistory: false`, atendendo aos requisitos criptográficos da Meta e prevenindo estouro de memória no container.

---

## T3 — Mensagem enviada na Origem mas não replicada no Destino

Verifique os seguintes pontos no feed de **Atividades (Logs)** do painel do Replicador:

| Motivo no Log | Significado | Solução |
| --- | --- | --- |
| `esteira_desligada` | O alternador geral da esteira está desligado. | Ative a chave **RÉPLICA** no topo do painel. |
| `nenhuma_rota_ativa` | O grupo de origem não pertence a nenhuma rota marcada como ativa. | Vá na aba **Rotas** e confira se a rota correspondente está com a chave ligada. |
| `loop_detectado` | O grupo de origem é o mesmo que o de destino. | Separe grupos de origem e destino para evitar reenvio para o mesmo canal. |
| `teto_hora_atingido` | O limite de postagens por hora (`teto_hora`) foi alcançado. | Aguarde a virada da hora ou aumente o limite na aba **Configurações**. |
| `mensagem_defasada` | A mensagem original tinha mais de 10 minutos de idade. | Comportamento normal para evitar postar promoções antigas após reinicializações. |
| `duplicada` | Oferta com o mesmo produto enviada em menos de 30 minutos (cooldown). | O filtro anti-duplicação preserva os grupos contra spam. |

---

## T4 — Imagem da postagem não saiu no grupo de destino

**Causas e Recuperação Automática (4 Camadas de Resiliência)**
1. **Mensagens com Foto no WhatsApp**:
   - A esteira desempacota mídias normais, efêmeras (`ephemeralMessage`), visualização única (`viewOnceMessageV2`) e enviadas por aparelhos conectados (`deviceSentMessage`).
   - Se o Baileys falhar ao baixar o arquivo por instabilidade temporária ou mídia expirada, a esteira ativa o **fallback de mídia**, buscando automaticamente a foto do anúncio no link do produto.
2. **Postagens Apenas em Texto com Link do Mercado Livre**:
   - Para links encurtados de vitrines e listas de concorrentes (`/social/...`), o parser segmenta os cards inteiros (`extrairProdutosVitrineSocial`), capturando a imagem do card e normalizando para 2X JPG.
   - Caso a imagem em alta resolução sofra bloqueio anti-bot do Mercado Livre (`suspicious-traffic-frontend`), o sistema utiliza o **fallback de miniatura** (`linkPreviewThumbnail`) gerado pelo WhatsApp.
3. **Postagens de Cupons vs Ofertas com Cupom**:
   - Se for um **comunicado de novo cupom** sem produto específico vindo em digitação pura do concorrente, o envio é mantido em texto puro sem anexar fotos aleatórias.
   - Se for uma **oferta de produto real que aceita cupom** (ex: Blister com cupom), a foto do produto é buscada e anexada normalmente.

---

## T5 — Link não foi encurtado como `meli.la` (saiu como link longo com `matt_word`)

**Causa: Cookie do Mercado Livre expirado ou inválido**
- Quando o cookie expira, o encurtador aciona o **fallback de segurança** para garantir que a comissão não seja perdida, gerando um link parametrizado com `matt_word` e `matt_tool`.
- O **Cookie Sentinel** emitirá um alerta no topo do painel.
- **Solução**: Obtenha um cookie atualizado seguindo as instruções em **Configurações > Cookie Mercado Livre**.
