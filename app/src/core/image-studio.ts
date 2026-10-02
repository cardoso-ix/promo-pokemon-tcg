import sharp from 'sharp';

export interface PadronizarFotoOptions {
  /**
   * Tamanho do canvas quadrado em pixels (padrão: 1080 px para Full HD no WhatsApp)
   */
  tamanhoCanvas?: number;
  /**
   * Percentual de respiro/margem interna em relação à borda (padrão: 12%)
   * Ex: 12% em 1080px deixa ~130px de respiro elegante em volta do produto
   */
  paddingPercentual?: number;
  /**
   * Cor de fundo do canvas (padrão: '#FFFFFF' para catálogo limpo de e-commerce)
   */
  corFundo?: string;
  /**
   * Qualidade da compressão JPEG de 1 a 100 (padrão: 90)
   */
  qualidadeJpeg?: number;
}

/**
 * Padroniza qualquer imagem de produto (quadrada, vertical ou panorâmica) em um canvas 1:1 de estúdio
 * com margem de respiro proporcional e fundo limpo, garantindo que o produto nunca fique colado nas bordas.
 */
export async function padronizarFotoEstudio(
  inputBuffer: Buffer,
  options?: PadronizarFotoOptions
): Promise<Buffer> {
  if (!inputBuffer || !Buffer.isBuffer(inputBuffer) || inputBuffer.length === 0) {
    return inputBuffer;
  }

  const tamanhoCanvas = Math.max(500, Math.min(2048, options?.tamanhoCanvas || 1080));
  const paddingPercentual = Math.max(4, Math.min(30, options?.paddingPercentual ?? 12));
  const corFundo = options?.corFundo?.trim() || '#FFFFFF';
  const qualidade = Math.max(60, Math.min(100, options?.qualidadeJpeg || 90));

  try {
    const sharpInput = sharp(inputBuffer);
    const metadata = await sharpInput.metadata();

    if (!metadata.width || !metadata.height) {
      return inputBuffer;
    }

    // Calcula a área máxima disponível para o produto dentro da margem de respiro
    const fatorEscala = 1 - (paddingPercentual * 2) / 100;
    const larguraMaxProduto = Math.round(tamanhoCanvas * fatorEscala);
    const alturaMaxProduto = Math.round(tamanhoCanvas * fatorEscala);

    // Redimensiona o produto para caber dentro da área disponível preservando proporção exata
    const produtoRedimensionado = await sharp(inputBuffer)
      .resize({
        width: larguraMaxProduto,
        height: alturaMaxProduto,
        fit: 'inside',
        withoutEnlargement: false
      })
      .toBuffer();

    // Cria o canvas quadrado perfeito de estúdio com fundo limpo e centraliza o produto
    const canvasFinal = await sharp({
      create: {
        width: tamanhoCanvas,
        height: tamanhoCanvas,
        channels: 3,
        background: corFundo
      }
    })
      .composite([
        {
          input: produtoRedimensionado,
          gravity: 'center'
        }
      ])
      .jpeg({
        quality: qualidade,
        mozjpeg: true
      })
      .toBuffer();

    return canvasFinal;
  } catch (err) {
    console.warn('[Estúdio de Imagem] Falha ao padronizar enquadramento da foto, mantendo original:', err);
    return inputBuffer;
  }
}
