# Design System — Cockpits Promo Pokémon TCG

## 🎨 Conceito Visual Elemental

O design system da plataforma baseia-se nos elementos clássicos do universo **Pokémon TCG**, combinando alta tecnologia, interfaces dark modernas e efeitos visuais imersivos:

1. **💧 Réplica Promo Cockpit (`:3000`):**
   - **Tema:** Tipo Água (Water TCG).
   - **Cores Predominantes:** Azul Oceano profundo (`#0284c7`), Azul Céu (`#38bdf8`), Cyan Elétrico (`#00e5ff`) e Fundo Abissal (`#050b14`).
   - **Efeito Visual Dinâmico:** Motor Canvas 2D em 60fps acelerado por GPU com **Bolhas Cristalinas 3D** (borda luminosa cyan e highlight especular branco) e **Orbes de Orvalho** que flutuam organicamente.
   - **Identidade:** Pokéball estilizada Tipo Água com aura luminosa.

2. **🔥 Disparador Pro Cockpit (`:3333`):**
   - **Tema:** Tipo Fogo (Fire TCG).
   - **Cores Predominantes:** Vermelho Rubi (`#ef4444`), Laranja Brasa (`#f97316`), Dourado Incandescente (`#f59e0b`) e Fundo Forja (`#0c0505`).
   - **Efeito Visual Dinâmico:** Motor Canvas 2D em 60fps acelerado por GPU com **Brasas Incandescentes 3D** (núcleo térmico dourado e halo carmesim) e **Micro-fagulhas Cintilantes** que sobem com convecção térmica senoidal.
   - **Identidade:** Pokéball estilizada Tipo Fogo com aura incandescente.

---

## 🔤 Tipografia Oficial Unificada

Ambos os cockpits utilizam uma hierarquia tipográfica idêntica para garantir paridade e profissionalismo:
- **Títulos e Headings:** `'Outfit', sans-serif` (pesos 400, 500, 600, 700) com proporções equilibradas e letter-spacing levemente condensado.
- **Corpo de Texto, Dados e Formulários:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (pesos 300, 400, 500, 600, 700) para máxima clareza e legibilidade.
- **Códigos e IDs:** `Fira Code, SF Mono, Consolas, monospace`.

---

## 🛡️ Glassmorphism & Proteção de Legibilidade

Para assegurar que os efeitos visuais não criem poluição visual e não prejudiquem o uso contínuo:
1. **Camada de Fundo Isolada (`z-index: 0`):** O canvas de partículas opera estritamente no fundo com `pointer-events: none` e `mix-blend-mode: screen`.
2. **Vidro Fosco Protetor (`backdrop-filter: blur(16px)`):** Cards, painéis, modais e o top-header possuem fundo semi-opaco com desfoque de vidro. Ao passarem por trás dos cards, as partículas são suavizadas, garantindo **contraste de 100% no texto e nos dados**.
3. **Sidebar Limpa:** A barra lateral de ambos os módulos é dedicada exclusivamente à navegação interna de abas, sem links concorrentes.
4. **Top Header Switcher Dinâmico:** Um botão compacto no cabeçalho superior direito (`[🔥 Disparador Pro]` ou `[💧 Replicador Pro]`) permite alternar entre os sistemas instantaneamente.
