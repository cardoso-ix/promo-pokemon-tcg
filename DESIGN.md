# Design

<!-- impeccable:design-schema 1 -->

## Surface

Replica Painel — Operate, night desk.

## World

Linhagem Impeccable (print do site): preto absoluto, branco, um ambar `#ffb800`. Titulos em Archivo Narrow (condensado). Corpo em Source Sans 3. Traco 1px, canto vivo, muito respiro. Sem azul SaaS e sem canto arredondado de cartao.

## Tokens

- Ink `#000000` / panel `#050505` / raised `#0c0c0c` / line `#222222`
- Text `#ffffff` / muted `#8a8a8a` / foil `#ffb800`
- Radius 0
- WhatsApp e Telegram so nas badges de marca

## Components

`.surface` cartão, `.kpi` métrica, `.btn-foil` ação primária, `.btn-ghost` secundário, `.btn-danger` destrutivo, `.field` input, `.nav-on` / `.pill-on` seleção.

## Constraints

HTML do painel não pode ter `"` nem `\`. Fonte via Google Fonts. Comportamento (token de save, combo, rotas) não muda com o visual.
