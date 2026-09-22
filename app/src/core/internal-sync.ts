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
 * Notifica o Bot Disparador via rede interna Docker/Coolify sobre uma nova oferta replicada.
 * A chamada é assíncrona, não bloqueante e com timeout estrito de 3 segundos.
 */
export async function notificarDisparadorOferta(oferta: OfertaSyncPayload): Promise<boolean> {
  if (!CONFIG.syncDisparadorAtivo) {
    return false;
  }

  const endpoint = `${CONFIG.disparadorUrl.replace(/\/$/, '')}/api/internal/oferta`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': CONFIG.internalApiKey
      },
      body: JSON.stringify({
        ...oferta,
        origem: oferta.origem || 'replicador-ofertas'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log(`[Ponte Interna Coolify] Oferta enviada com sucesso para o Bot Disparador: "${oferta.titulo}"`);
      return true;
    } else {
      console.warn(`[Ponte Interna Coolify] Disparador respondeu com status ${response.status}`);
      return false;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // Erros de conexão esperados caso o disparador esteja offline ou em deploy
    console.log(`[Ponte Interna Coolify] Aviso ao sincronizar com disparador: ${errorMsg}`);
    return false;
  }
}
