import { CONFIG } from '../config.js';

export interface OfertaSyncPayload {
  titulo: string;
  linkAfiliado: string;
  linkOriginal?: string;
  precoDe?: number;
  precoPor?: number;
  desconto?: number;
  cupom?: string;
  parcelamento?: string;
  imagemUrl?: string;
  mensagemFormatada?: string;
  origem?: string;
}

/**
 * Disparador IA desintegrado: arquitetura focada 100% em Tráfego Pago e Mercado Livre.
 * Mantida assinatura não bloqueante para compatibilidade.
 */
export async function notificarDisparadorOferta(_oferta: OfertaSyncPayload): Promise<boolean> {
  return false;
}
