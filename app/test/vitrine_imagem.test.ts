import assert from 'node:assert';
import { test } from 'node:test';
import { extrairProdutosVitrineSocial } from '../src/core/affiliate.js';

test('extrairProdutosVitrineSocial - Extrai imagem HD e link do produto de card poly-card sem fatiar', () => {
  const mockHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="Minhas listas de recomendações" />
  <meta property="og:image" content="https://http2.mlstatic.com/D_Q_NP_673565-MLA113439196475_062026-AB{sanitized_title}.webp" />
</head>
<body>
  <div class="andes-card lists-card poly-card poly-card--grid-card poly-card--xlarge andes-card--flat andes-card--primary">
    <div class="poly-card__portada">
      <img class="poly-component__picture" src="https://http2.mlstatic.com/D_Q_NP_2X_673565-MLA113439196475_062026-AB.webp" alt="Álbum Pokémon Pikachu 240 Cartas" />
    </div>
    <div class="poly-card__content">
      <a href="https://www.mercadolivre.com.br/album-pokemon-pikachu-240-cartas-porta-cards-organizador-de-colecao-infantil/p/MLB67663204" class="poly-component__title">
        Álbum Pokémon Pikachu 240 Cartas
      </a>
      <span class="andes-money-amount__fraction">69</span>
    </div>
  </div>
</body>
</html>
  `;

  const candidatos = extrairProdutosVitrineSocial(mockHtml, 'Álbum Pokémon Pikachu 240 Cartas');
  assert.strictEqual(candidatos.length, 1, 'Deve encontrar exatamente 1 candidato');
  assert.strictEqual(
    candidatos[0].url,
    'https://www.mercadolivre.com.br/album-pokemon-pikachu-240-cartas-porta-cards-organizador-de-colecao-infantil/p/MLB67663204'
  );
  assert.ok(candidatos[0].img, 'A imagem DEVE ser extraída e associada ao produto');
  assert.strictEqual(
    candidatos[0].img,
    'https://http2.mlstatic.com/D_NQ_NP_2X_673565-MLA113439196475_062026-AB.jpg',
    'A imagem deve ser normalizada para 2X e JPG'
  );
  assert.ok(candidatos[0].pontos >= 2, 'Pontuação de relevância deve ser >= 2');
});
