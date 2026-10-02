import sharp from 'sharp';
import crypto from 'node:crypto';

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

// Configurações do LRU Cache de Memória
const MAX_CACHE_ITEMS = 80; // Máximo de 80 fotos em RAM (~15-20 MB)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos de validade

interface CacheItem {
  buffer: Buffer;
  expiresAt: number;
}

const memoryImageCache = new Map<string, CacheItem>();
let cacheHitsCount = 0;
let cacheMissesCount = 0;

export function obterStatsCacheImagem() {
  return {
    tamanho: memoryImageCache.size,
    maxItens: MAX_CACHE_ITEMS,
    hits: cacheHitsCount,
    misses: cacheMissesCount
  };
}

export function limparCacheImagem(): void {
  memoryImageCache.clear();
  cacheHitsCount = 0;
  cacheMissesCount = 0;
}

function gerarChaveCache(inputBuffer: Buffer, options?: PadronizarFotoOptions): string {
  const hashInput = crypto.createHash('md5').update(inputBuffer).digest('hex');
  const optStr = `${options?.tamanhoCanvas || 1080}_${options?.paddingPercentual ?? 12}_${options?.corFundo || '#FFFFFF'}_${options?.qualidadeJpeg || 90}`;
  return `${hashInput}_${optStr}`;
}

/**
 * Padroniza qualquer imagem de produto (quadrada, vertical ou panorâmica) em um canvas 1:1 de estúdio
 * com margem de respiro proporcional e fundo limpo, garantindo que o produto nunca fique colado nas bordas.
 * Possui LRU Cache de memória nativo para retorno em 0ms de imagens repetidas.
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

  // 1. Verificação no LRU Cache de Memória
  const cacheKey = gerarChaveCache(inputBuffer, {
    tamanhoCanvas,
    paddingPercentual,
    corFundo,
    qualidadeJpeg: qualidade
  });

  const agora = Date.now();
  const cached = memoryImageCache.get(cacheKey);

  if (cached) {
    if (cached.expiresAt > agora) {
      cacheHitsCount++;
      // Reinsere para manter a ordem de acesso mais recente (LRU)
      memoryImageCache.delete(cacheKey);
      memoryImageCache.set(cacheKey, cached);
      return cached.buffer;
    }
    // Expirou
    memoryImageCache.delete(cacheKey);
  }

  cacheMissesCount++;

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

    // 2. Armazena no LRU Cache
    if (memoryImageCache.size >= MAX_CACHE_ITEMS) {
      // Remove o item mais antigo (primeira chave do Map)
      const oldestKey = memoryImageCache.keys().next().value;
      if (oldestKey) {
        memoryImageCache.delete(oldestKey);
      }
    }

    memoryImageCache.set(cacheKey, {
      buffer: canvasFinal,
      expiresAt: agora + CACHE_TTL_MS
    });

    return canvasFinal;
  } catch (err) {
    console.warn('[Estúdio de Imagem] Falha ao padronizar enquadramento da foto, mantendo original:', err);
    return inputBuffer;
  }
}
