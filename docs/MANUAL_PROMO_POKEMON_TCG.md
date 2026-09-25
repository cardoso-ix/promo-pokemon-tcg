# 📘 MANUAL COMPLETO DE OPERAÇÃO E ENGENHARIA — PROMO POKÉMON TCG
**Plataforma Autônoma de Curadoria, Replicação e Disparo de Ofertas 24/7**  
*Ambiente de Produção: `http://108.174.145.77` · Versão 2.5.0*

---

## 📑 SUMÁRIO EXECUTIVO

1. [Visão Geral da Arquitetura do Sistema](#1-visão-geral-da-arquitetura-do-sistema)
2. [Regras de Negócio e Filtros Inteligentes Ativos](#2-regras-de-negócio-e-filtros-inteligentes-ativos)
3. [Arquitetura Resiliente de Imagem em 4 Camadas](#3-arquitetura-resiliente-de-imagem-em-4-camadas)
4. [Estratégia de Monitoramento Multi-Grupos (2 a 3 Grupos de Origem)](#4-estratégia-de-monitoramento-multi-grupos-2-a-3-grupos-de-origem)
5. [Guia Operacional Passo a Passo (Cockpits)](#5-guia-operacional-passo-a-passo-cockpits)
6. [Infraestrutura, Nuvem (VPS + Coolify) e Troubleshooting](#6-infraestrutura-nuvem-vps--coolify-e-troubleshooting)

---

## 1. VISÃO GERAL DA ARQUITETURA DO SISTEMA

O ecossistema **Promo Pokémon TCG** opera de forma ininterrupta na VPS HostGator (`108.174.145.77`) e é composto por dois módulos desacoplados que trabalham integrados:

### A. Módulo Replicador (`Promo Réplica` — Porta 3000)
- **Painel:** `http://108.174.145.77:3000` (Tema Cockpit Água 💧)
- **Função:** Monitorar grupos de ofertas concorrentes, filtrar exclusivamente o que for colecionável Pokémon/TCG, substituir os links pelos seus links de afiliado do Mercado Livre, baixar e anexar fotos oficiais em alta definição e publicar no seu grupo VIP.

### B. Módulo Disparador & Atendimento IA (`Bot Disparador` — Porta 3333)
- **Painel:** `http://108.174.145.77:3333` (Tema Cockpit Fogo 🔥)
- **Função:** Captar leads de anúncios pagos (Meta Ads/Instagram), realizar disparos em massa no privado dos clientes com proteção anti-ban (Spintax, delay dinâmico, áudio PTT), atendimento automatizado com IA (DeepSeek V4) e consolidação financeira de faturas de marketing.

### C. Comunicação em Malha Interna (Ponte de Ofertas)
Os dois módulos conversam através da rede interna Docker (`promo_network`). Sempre que uma promoção é publicada no grupo VIP, uma cópia autenticada é enviada para `http://bot-disparador:3333/api/internal/oferta`, caindo na aba **Ofertas Recebidas** do Disparador para envio no privado dos leads com 1 clique.

---

## 2. REGRAS DE NEGÓCIO E FILTROS INTELIGENTES ATIVOS

| Regra / Mecanismo | Comportamento no Sistema | Objetivo / Impacto |
| :--- | :--- | :--- |
| **Guardião de Nicho TCG** | Rejeita itens fora do nicho (fraldas, celulares, roupas). Aprova apenas cartas, boosters, boxes, latas, ETBs, fichários e card games. | Mantém o grupo focado 100% no hobby de Pokémon TCG. |
| **Filtro de Concorrentes** | Descarta links da Amazon, Shopee, Magalu e AliExpress se `somente_mercadolivre=true`. | Canaliza 100% do faturamento para o Mercado Livre Afiliados. |
| **Higienização Anti-Spam** | Remove assinaturas de grupos rivais (ex: `@rasgabooster`) e convites para grupos alheios (`chat.whatsapp.com`). | O grupo de destino recebe apenas a sua marca oficial. |
| **Rodapé de Transparência** | Inclui o aviso legal: *"Os preços e cupons podem sofrer alteração ou esgotar a qualquer momento. Verifique as condições no ato da compra."* | Conformidade legal e proteção contra reclamações. |
| **Pacing Anti-Rajada (8s)** | Intervalo mínimo de 8 segundos entre disparos consecutivos para o grupo de destino. | Evita enxurrada de notificações e previne banimentos da Meta. |
| **Teto de Envios (Anti-Flood)**| Trava automática para no máximo 40 mensagens por hora. | Preserva a comunidade limpa e agradável. |
| **Abertura Matinal (07:00)** | Dispara diariamente às 07:00 (Brasília) uma saudação com rotação automática entre 4 modelos de curadoria a dedo. | Engajamento diário orgânico sem intervenção manual. |

---

## 3. ARQUITETURA RESILIENTE DE IMAGEM EM 4 CAMADAS

1. **1ª Camada (WhatsApp Original):** Extração direta do buffer da imagem anexada no WhatsApp (incluindo mídias temporárias e visualização única).
2. **2ª Camada (Parser de Vitrine Social 2X HD):** Para links de vitrines (`/social/.../lists`), o parser segmenta os cards por container completo (`andes-card`, `poly-card--grid-card`), capturando a foto oficial e normalizando para **2X JPG**.
3. **3ª Camada (Fallback de Download WhatsApp):** Se o concorrente postou com foto mas o Baileys falhou ao baixar por oscilação da Meta, o sistema aciona o scraper do anúncio como plano B.
4. **4ª Camada (Fallback de Miniatura):** Se a foto em alta resolução sofrer bloqueio anti-bot (`suspicious-traffic-frontend`), o sistema utiliza a miniatura pré-renderizada pelo próprio WhatsApp (`jpegThumbnail`).
5. **Diferenciação de Cupons:** Mensagens de produtos reais que mencionam cupom (ex: *Blister Triplo com cupom OFFMELI*) recebem foto oficial normalmente. Apenas comunicados puros de novos cupons sem produto são postados como texto puro.

---

## 4. ESTRATÉGIA DE MONITORAMENTO MULTI-GRUPOS (2 A 3 GRUPOS)

> **RECOMENDAÇÃO: Monitore 2 a 3 Grupos Concorrentes Simultaneamente!**  
> O sistema foi projetado e blindado no código para operar com múltiplos grupos de origem sem repetir ofertas.

### Como Funciona a Desduplicação Cross-Group:
1. **ID Canônico do Produto (MLB ID):** O robô extrai o ID canônico real do anúncio no Mercado Livre (ex: `MLB3891782390`). Se outro grupo postar o mesmo anúncio nos últimos 30 minutos, o segundo envio é **sumariamente bloqueado**.
2. **Exceção de Queda de Preço:** Se o segundo grupo postar o mesmo produto com desconto real superior a 5% em relação ao primeiro, o sistema permite a republicação para atualizar a oportunidade para os membros.
3. **Identificador de Cupom (`CUPOM_NOME`):** Códigos de cupom geram um identificador único com cooldown de 30 minutos, impedindo repetição caso vários concorrentes soltem o mesmo cupom em sequência.
4. **Hash Criptográfico de Conteúdo:** Compara o hash do texto limpo (sem pontuação e sem links) para bloquear comunicados idênticos.

---

## 5. GUIA OPERACIONAL PASSO A PASSO (COCKPITS)

### Cockpit do Replicador (`:3000`)
1. **Conexão:** Acesse `http://108.174.145.77:3000` ➔ Aba **📱 Conectar WhatsApp** ➔ Leia o QR Code no seu smartphone.
2. **Rotas:** Na aba **Rotas de Replicação**, selecione os **2 ou 3 grupos de origem** e aponte para o seu **grupo VIP de destino**.
3. **Configurações Recomendadas:**
   - `cooldown_duplicidade_minutos`: `30` a `60` min.
   - `delay_segundos`: `5` a `10` s.
   - `teto_hora`: `40`.
   - `somente_mercadolivre`: `true`.
   - `filtro_apenas_tcg`: `true`.

### Cockpit do Disparador & IA (`:3333`)
1. **Ponte de Ofertas:** Acesse `http://108.174.145.77:3333` ➔ Aba **Ofertas Recebidas** ➔ Clique em **Criar Campanha** em qualquer oferta replicada.
2. **Gestão de Leads:** Na aba **Contatos**, importe planilhas CSV/XLSX de leads captados no tráfego pago.
3. **Atendimento IA:** A inteligência artificial (DeepSeek V4) conversa com quem responder no privado e entrega o link do grupo VIP de forma amigável e conversacional.

---

## 6. INFRAESTRUTURA, NUVEM (VPS + COOLIFY) E TROUBLESHOOTING

### Acessos em Produção (VPS HostGator: `108.174.145.77`)
- **Promo Réplica (Cockpit Água):** `http://108.174.145.77:3000` (Usuário: `admin` | Senha: `promo2026`)
- **Bot Disparador & IA (Cockpit Fogo):** `http://108.174.145.77:3333` (Usuário: `admin` | Senha: `promo2026`)
- **Painel Coolify:** `http://108.174.145.77:8000`

### Como Acionar Deploy Manual na VPS:
```bash
curl -X POST "http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra" \
  -H "Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed"
```

### Solução Rápida de Dúvidas:
- **Sessão travada ou desconectada:** Na aba Conectar WhatsApp, clique em **🔄 Reiniciar Sessão / Gerar Novo QR Code**. O sistema limpa as chaves antigas e emite um QR novo em 2 segundos.
- **Link saiu longo sem `meli.la`:** O cookie do Mercado Livre expirou. A esteira acionou o fallback para você não perder a comissão de afiliado. Atualize o cookie na aba Configurações quando desejar.
- **Reboot da VPS:** Os containers possuem `restart: unless-stopped` e sobem sozinhos religando o WhatsApp sem intervenção manual.
