# Design

<!-- impeccable:design-schema 1 -->

## Surface

Replica Painel — Operate, night desk.

## World

Fliperama noturno / CRT de arena TCG: indigo de cabinet, amarelo eletrico, ciano de tipo, scanline e orbes. Sem fundo de pintura (a tentativa de JPEG/anime foi revertida). Titulos em Teko. Corpo em M PLUS 1p. Sem logo oficial Pokemon, sem pokebola, sem azul SaaS. Responsivo em mobile/tablet.

## Tokens

- Ink `#07050f` / panel `#100d1c` / raised `#171326` / line `#4a2f88`
- Text `#f3eeff` / muted `#a498c4` / foil `#ffe033` / cyan `#3de6ff`
- Radius 2px nos paineis; marca RP e um orbe eletrico
- WhatsApp e Telegram so nas badges de marca

## Components

`.surface` cartão, `.kpi` métrica, `.btn-foil` ação primária, `.btn-ghost` secundário, `.btn-danger` destrutivo, `.field` input, `.nav-on` / `.pill-on` seleção.

## Constraints

HTML do painel e do login não pode ter `"` nem `\`. Fonte via Google Fonts. Login em `/webhook/replica/entrar` (cabinet CRT); o GET `/painel` continua com Basic Auth por baixo. Comportamento (token de save, combo, rotas) não muda com o visual.
