# Runbook — Manual de Operação e Manutenção

Guia prático para a operação diária, manutenção, gerenciamento em produção na nuvem (VPS HostGator + Coolify) e continuidade do desenvolvimento em máquina local ou novo computador.

---

## 1. Operação em Produção (VPS HostGator — 24/7)

Tanto o **Replicador de Ofertas** quanto o **Bot Disparador & Atendimento IA** rodam de forma autônoma e ininterrupta na VPS HostGator (`108.174.145.77`), acessíveis de qualquer navegador (computador, tablet ou celular), sem que você precise manter seu computador ligado.

### 1.1. Painel do Replicador de Ofertas
- **Acesso Online**: 👉 **`http://108.174.145.77:3000`**
- **Tema Visual**: 🌊 **Tipo Água Pokémon TCG** (Azul/Cyan, Gotículas 3D, Fundo Atmosférico).
- **Função**: Controla a replicação de ofertas de grupos concorrentes para os seus grupos VIP, encurtamento oficial `meli.la` e fotos oficiais 2X do Mercado Livre.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.
- **Pareamento do WhatsApp**: Na aba **Conectar WhatsApp**, escaneie o QR Code. Se precisar redefinir a conexão a qualquer momento, clique no botão **🔄 Reiniciar Sessão / Gerar Novo QR Code**.

### 1.2. Painel do Bot Disparador & Atendimento IA
- **Acesso Online**: 👉 **`http://108.174.145.77:3333`**
- **Tema Visual**: 🔥 **Tipo Fogo Pokémon TCG** (Vermelho/Laranja, Brasas 3D, Fundo Atmosférico).
- **Função**: Extração de leads de grupos com 1 clique, disparos automáticos em massa com proteção anti-ban (Spintax), simulador WhatsApp ao vivo, atendimento privado automático com DeepSeek V4 e gestão financeira com faturas de tráfego pago.
- **Autenticação**: Protegido por login e senha. Sessão criptografada persistente de 30 dias.

### 1.3. Credenciais de Acesso (Login & Senha)
Ambos os painéis utilizam controle de acesso por credenciais seguras e tokens assinados digitalmente com HMAC-SHA256:
- **Usuário padrão**: `admin`
- **Senha padrão**: `promo2026`
- **Duração da Sessão**: 30 dias em cookie seguro (`HttpOnly; SameSite=Lax`).

### 1.4. Gerador Manual de Anúncios por Link (No Painel Replicador)
- **Acesso**: Aba **⚡ Gerador de Anúncios** no Cockpit do Replicador.
- **Como Usar**:
  1. Cole o link de afiliado ou produto do Mercado Livre (aceita `https://mercadolivre.com/sec/...`, `meli.la` ou link direto do anúncio).
  2. Ao colar o link (ou clicar em **⚡ Puxar Dados & Gerar Anúncio**), o sistema extrai **automaticamente**:
     - O **título limpo** do produto (imune a títulos genéricos);
     - A **foto oficial em 2X HD** do produto;
     - O **Preço real do item** diretamente do anúncio principal;
     - O **Preço De** (apenas quando o produto realmente possui preço riscado anterior);
     - O **Cupom de Desconto** ativo (se houver).
  3. **Edição Reativa em Tempo Real**: Ao alterar Cupom ou Valor com Cupom, o preview atualiza instantaneamente.
  4. Marque os grupos de destino e clique em **🚀 Publicar no WhatsApp**.

### 1.5. Módulo de Finanças & Gestão de Tráfego Pago Meta Ads
- **Acesso**: Aba **📊 Finanças** no Cockpit do Disparador (`:3333`).
- **Upload de Relatórios Meta Ads**:
  1. No Gerenciador de Anúncios da Meta, exporte o relatório da semana em `.xlsx`, `.xls` ou `.csv`.
  2. No painel, selecione o Mês de Referência (ex: `2026-09`) e o rótulo da semana (ex: `Semana 1`).
  3. Faça o upload. O sistema calcula automaticamente: Investimento Total, Leads Gerados, CPL com selo de eficiência, CTR, CPC, CPM e Ranking das melhores campanhas.
- **Lançamentos Diários & DRE (Regra 70% Reinvestimento)**:
  1. Na seção **Lançamento Diário**, informe os gastos com anúncios do dia e o faturamento/lucro bruto apurado.
  2. O DRE consolida o resultado líquido: 70% reservado para reinvestimento em campanhas de escala e 30% reservado para distribuição livre aos sócios.
  3. Clique em **Exportar Balanço** para gerar o arquivo `.csv` ou **Imprimir / PDF** para o relatório contábil executivo formatado.

### 1.6. Protocolo de Reativação Rápida em 30s (Pelo Celular)
1. Abra no navegador do smartphone: **`http://108.174.145.77:3000`** (ou `:3333`).
2. Se indicar 🔴 **Desconectado** ou 🟡 **Aguardando QR**:
   - Toque em **📱 Conectar WhatsApp**.
   - Se o QR Code estiver visível, leia com a câmera no WhatsApp.
   - Se a sessão parecer travada: toque no botão **🔄 Reiniciar Sessão / Gerar Novo QR Code**. O sistema limpa as chaves antigas e emite um QR novo em 2 segundos.

---

## 2. Operação e Desenvolvimento em Novo Computador (Turnkey)

Para continuar o desenvolvimento, criar novas melhorias ou rodar localmente em outro computador:

Consulte o checklist detalhado: [GUIA_MIGRACAO_NOVO_PC.md](../GUIA_MIGRACAO_NOVO_PC.md).

### 2.1. Configuração Inicial Rápida
- **Windows:** Duplo clique em `setup-novo-pc.bat`.
- **Linux/macOS:** `./setup-novo-pc.sh`
- **Via Terminal (Monorepo):** `npm run setup`

### 2.2. Modo Desenvolvimento com Hot Reload
- **Windows:** Duplo clique em `iniciar-dev.bat`.
- **Linux/macOS:** `./iniciar-dev.sh`
- **Via Terminal:** `npm run dev:app` e `npm run dev:bot` em terminais separados.
- *Qualquer alteração de código TypeScript recarrega a aplicação imediatamente.*

### 2.3. Execução dos Testes Automatizados (128 Testes)
```bash
npm test
```

### 2.4. Finalização Segura dos Processos
- **Windows:** Duplo clique em `parar.bat` (finaliza portas 3000 e 3333).
- **Linux/macOS:** `./parar.sh`

---

## 3. Deploy Contínuo via Coolify (CI/CD)

- Repositório GitHub Oficial: `https://github.com/cardoso-ix/promo-pokemon-tcg` (Branch: `main`).
- Após realizar `git push origin main`, acione o deploy instantâneo na VPS via Webhook:
```bash
curl -X POST "http://108.174.145.77:8000/api/v1/deploy?uuid=devvejts27nuuqhefh5gvwra" \
  -H "Authorization: Bearer 1|mmJOTnEZkh8NikYsxDTj60AVgh9ZZ6j0tJ7X5PNk4c8fa5ed"
```
- O Coolify recompila as imagens Docker, aplica as novas alterações e reativa os serviços sem derrubar as sessões ativas do WhatsApp.
