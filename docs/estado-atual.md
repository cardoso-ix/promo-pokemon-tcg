# Estado Atual — Réplica Autônoma Promo Pokémon TCG

**Última atualização:** Setembro/2026

## 1. Situação Atual
A esteira de replicação de promoções de Pokémon TCG foi totalmente modernizada e opera de maneira 100% autônoma através de uma aplicação dedicada em **Node.js / TypeScript** (`app/`), eliminando completamente a dependência de n8n, Evolution API externa e VPS Hostinger.

---

## 2. O que está Ativo e Funcionando

| Módulo | Tecnologia | Descrição |
| --- | --- | --- |
| **Núcleo de Replicação** | TypeScript + Baileys | Escuta grupos de origem, remove spam, extrai imagens e envia para grupos de destino |
| **Encurtador Oficial** | API Mercado Livre (`meli.la`) | Converte links longos em links curtos oficiais utilizando o cookie de sessão do afiliado |
| **Tratamento de Mídia** | Buffer Baileys + ML Scraper | Baixa mídias diretas, temporárias e de múltiplos dispositivos; fallback para foto oficial 2X do produto |
| **Banco de Dados** | SQLite local (`data/replica.db`) | Armazena configurações, rotas ativas, cache de nomes de chats e histórico de postagens |
| **Cockpit Web** | Fastify + WebSockets | Dashboard em tempo real disponível em `http://localhost:3000` |

---

## 3. Comandos e Operação Diária

- **Iniciar**: Executar `iniciar.bat` (visível com logs) ou `iniciar-segundo-plano.vbs` (silencioso).
- **Parar / Reiniciar**: Executar `parar.bat` para encerrar o processo na porta 3000.
- **Painel de Controle**: Acessar `http://localhost:3000` no navegador.
- **Testes Unitários**: Executar `npm test` dentro de `app/`.
