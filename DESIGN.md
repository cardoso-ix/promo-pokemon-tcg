# Design System — Cockpit Réplica Promo

## Conceito Visual

Interface inspirada em cockpit de operações noturnas e arena de Pokémon TCG: fundo escuro profundo, cartões elevados com bordas sutis e acentos em amarelo elétrico (Foil) e ciano de energia. O foco é a máxima legibilidade das postagens replicadas e controle tátil de rotas tanto no desktop quanto em telas móveis.

---

## Paleta de Cores e Tokens

| Token | Valor Hex | Aplicação |
| --- | --- | --- |
| `--bg-base` | `#0b0914` | Fundo principal da aplicação |
| `--bg-surface` | `#131022` | Cartões, painéis e contêineres |
| `--bg-raised` | `#1c1833` | Modais, tabelas e cabeçalhos elevados |
| `--border` | `#2d264f` | Linhas divisórias e contornos de inputs |
| `--text-main` | `#f5f3ff` | Títulos e textos de alta ênfase |
| `--text-muted` | `#968eb3` | Legendas, datas e informações secundárias |
| `--accent-foil`| `#ffe033` | Botões primários, badges de destaque e alertas |
| `--accent-cyan`| `#3de6ff` | Links, badges de canal e indicadores ativos |
| `--status-ok`  | `#10b981` | Conexão WhatsApp ativa, posts enviados |
| `--status-err` | `#ef4444` | Desconexão, erros de envio, exclusão |

---

## Tipografia

- **Família Principal**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
- **Códigos e Logs**: `Fira Code`, `SF Mono`, `Consolas`, monospace.

---

## Componentes do Cockpit

1. **Header com Status em Tempo Real**:
   - Badge dinâmico de conexão com WhatsApp (Pendente, Conectando, Conectado, Desconectado) com pulso luminoso.
   - Alternador Geral da Esteira com feedback tátil e atualização instantânea.

2. **Cartões de KPI**:
   - Métricas em tempo real: "Posts na Última Hora", "Enviados Hoje", "Rotas Ativas".

3. **Gerenciador de Rotas**:
   - Cards visuais com origem ➔ destino, toggle de ativação individual e botão de exclusão.
   - Seletor de grupos com busca inteligente e autocomplete pelos nomes reais dos grupos.

4. **Feed de Atividades (Logs)**:
   - Timeline de postagens com visualização do texto original, texto processado, links encurtados e thumbnail da mídia replicada.

5. **Responsividade**:
   - Layout fluido com suporte completo a celulares, tablets e monitores ultrawide.
