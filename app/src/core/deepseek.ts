import { CONFIG } from '../config.js';
import { getConfig } from '../db/database.js';

export interface GerarCopiesIARequest {
  rascunho: string;
  link?: string;
  modo?: 'chamada' | 'anuncio';
}

export interface GerarCopiesIAResponse {
  ok: boolean;
  modo: 'chamada' | 'anuncio';
  opcoes: string[];
  modeloUrgencia: string;
  modeloComunidade: string;
  linkAfiliado: string;
  fonte: 'deepseek' | 'fallback_local';
  erro?: string;
}

/**
 * Normaliza e humaniza frases brutas ou com erros de digitação
 */
export function humanizarTexto(bruto: string): string {
  let texto = bruto.trim();
  if (!texto) return '';

  // Se tudo estiver em caixa alta, converter primeiro para minúsculas
  if (texto === texto.toUpperCase() && texto.length > 4) {
    texto = texto.toLowerCase();
  }

  // Substitui abreviações populares de internet e vícios de digitação
  texto = texto
    .replace(/\bpromo\b/gi, 'promoção')
    .replace(/\bpromocao\b/gi, 'promoção')
    .replace(/\bpromocoes\b/gi, 'promoções')
    .replace(/\bta\b/gi, 'está')
    .replace(/\btamem\b/gi, 'também')
    .replace(/\btbm\b/gi, 'também')
    .replace(/\btb\b/gi, 'também')
    .replace(/\bvc\b/gi, 'você')
    .replace(/\bvcs\b/gi, 'vocês')
    .replace(/\bpq\b/gi, 'porque')
    .replace(/\bpra\b/gi, 'para')
    .replace(/\bpro\b/gi, 'para o')
    .replace(/\bmt\b/gi, 'muito')
    .replace(/\bmto\b/gi, 'muito')
    .replace(/\bunid\b/gi, 'unidades')
    .replace(/\bpct\b/gi, 'pacotes')
    .replace(/\bpcts\b/gi, 'pacotes')
    .replace(/\bvlw\b/gi, 'aproveitem')
    .replace(/\bblz\b/gi, 'beleza')
    .replace(/\btd\b/gi, 'tudo')
    .replace(/\bq\b/gi, 'que');

  // Ajusta pontuação solta no fim
  texto = texto.replace(/\s+([.,!?:;])/g, '$1');

  // Garante que a primeira letra da frase seja maiúscula
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Fallback Local: Polimento e embelezamento rápido da mensagem (0ms)
 * Gera 5 opções padronizadas sem frases de efeito inventadas, adaptando estritamente
 * o texto do usuário com combinações estratégicas de emojis.
 */
export function embelezarChamadaLocal(rascunho: string, link?: string): string[] {
  const limpo = humanizarTexto(rascunho);
  const linkStr = link?.trim() ? `\n\n🔗 ${link.trim()}` : '';

  // Opção 1: Alerta & Velocidade (🚨 ... ⚡)
  const op1 = `🚨 *${limpo}* ⚡${linkStr}`;

  // Opção 2: Fogo & Estoque (🔥 ... 📦)
  const op2 = `🔥 *${limpo}* 📦${linkStr}`;

  // Opção 3: Mira & Brilho (🎯 ... ✨)
  const op3 = `🎯 *${limpo}* ✨${linkStr}`;

  // Opção 4: Carrinho & Foguete (🛒 ... 🚀)
  const op4 = `🛒 *${limpo}* 🚀${linkStr}`;

  // Opção 5: Raio & Fogo Dinâmico (⚡ ... 🔥✨)
  const op5 = `⚡ *${limpo}* 🔥✨${linkStr}`;

  return [op1, op2, op3, op4, op5];
}

/**
 * Fallback de compatibilidade para anúncios
 */
export function gerarCopiesLocaisFallback(
  rascunho: string,
  linkAfiliado: string
): { modeloUrgencia: string; modeloComunidade: string } {
  const opcoes = embelezarChamadaLocal(rascunho, linkAfiliado);
  return {
    modeloUrgencia: opcoes[0] || '',
    modeloComunidade: opcoes[1] || opcoes[0] || ''
  };
}

/**
 * Motor Principal: Polimento e Redação Profissional de Mensagens com IA
 */
export async function redigirOfertaComIA(
  input: GerarCopiesIARequest
): Promise<GerarCopiesIAResponse> {
  const rascunho = (input.rascunho || '').trim();
  const modo = input.modo || (input.link ? 'anuncio' : 'chamada');
  const linkAfiliado = (input.link || '').trim();

  if (!rascunho) {
    return {
      ok: false,
      modo,
      opcoes: [],
      modeloUrgencia: '',
      modeloComunidade: '',
      linkAfiliado,
      fonte: 'fallback_local',
      erro: 'Digite uma mensagem para a IA melhorar.'
    };
  }

  const apiKey = getConfig('deepseek_api_key', CONFIG.deepseekApiKey || '').trim();
  const baseUrl = getConfig('deepseek_base_url', CONFIG.deepseekBaseUrl || 'https://opencode.ai/zen/go/v1').trim();
  const model = getConfig('deepseek_model', CONFIG.deepseekModel || 'deepseek-v4-flash').trim();

  // Se não houver API key configurada, executa o polimento local imediato (0ms)
  if (!apiKey) {
    const opcoes = embelezarChamadaLocal(rascunho, linkAfiliado);
    return {
      ok: true,
      modo,
      opcoes,
      modeloUrgencia: opcoes[0] || '',
      modeloComunidade: opcoes[1] || '',
      linkAfiliado,
      fonte: 'fallback_local'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const promptSistema = `Você é um assistente especialista em comunicação e redação de mensagens para WhatsApp.
O usuário vai enviar uma mensagem digitada por ele (que pode conter abreviações, digitação informal ou caixa alta).

SUA ÚNICA MISSÃO É:
1. Padronizar e gerar EXATAMENTE 5 OPÇÕES da mensagem digitada pelo usuário.
2. Adaptar o texto corrigindo apenas gramática, acentuação e pontuação, mantendo 100% as palavras e o sentido exato do que ele escreveu.
3. INCLUIR APENAS EMOJIS estratégicos e profissionais do WhatsApp (ex: 🚨, 🔥, ⚡, 🎯, 🛒, 📦, 🚀, ✨).
4. Usar formatação em negrito (*texto*) para dar destaque à mensagem.

REGRA CRÍTICA MANDATÓRIA (PROIBIÇÃO ABSOLUTA):
- NUNCA adicione frases de efeito, ganchos ou bordões que o usuário NÃO escreveu (PROIBIDO adicionar frases como "Aproveitem enquanto ainda tem estoque", "Atenção pessoal", "Vale muito a pena conferir", "Oportunidade top pra vocês", "Corram pra garantir", etc.).
- NÃO invente nenhuma palavra ou chamada extra. Apenas formate e adapte O QUE O USUÁRIO DIGITOU com emojis.
- NÃO adicione arrobas (@) nem nomes de canais ou assinaturas.
- NÃO adicione avisos de rodapé longos ou disclaimers.
${linkAfiliado ? `- Inclua o link fornecido intacto no final da mensagem precedido por 🔗: ${linkAfiliado}` : '- Se houver algum link dentro do texto do usuário, mantenha-o intacto.'}

Retorne EXCLUSIVAMENTE um objeto JSON com 5 opções distintas no formato:
{
  "opcoes": [
    "🚨 *Texto adaptado do usuário!* ⚡",
    "🔥 *Texto adaptado do usuário!* 📦",
    "🎯 *Texto adaptado do usuário!* ✨",
    "🛒 *Texto adaptado do usuário!* 🚀",
    "⚡ *Texto adaptado do usuário!* 🔥✨"
  ]
}`;

  try {
    const urlEndpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(urlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: promptSistema },
          {
            role: 'user',
            content: `MENSAGEM DIGITADA PELO USUÁRIO:\n${rascunho}${linkAfiliado ? `\n\nLINK:\n${linkAfiliado}` : ''}`
          }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = (await response.json()) as any;
      const contentStr = data.choices?.[0]?.message?.content || '';
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.opcoes) && parsed.opcoes.length > 0) {
          const opcoesFiltradas = parsed.opcoes.map((op: string) => op.trim()).filter(Boolean);
          return {
            ok: true,
            modo,
            opcoes: opcoesFiltradas,
            modeloUrgencia: opcoesFiltradas[0] || '',
            modeloComunidade: opcoesFiltradas[1] || opcoesFiltradas[0] || '',
            linkAfiliado,
            fonte: 'deepseek'
          };
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  // Fallback local caso a chamada à API externa falhe ou demore
  const fallbackOpcoes = embelezarChamadaLocal(rascunho, linkAfiliado);
  return {
    ok: true,
    modo,
    opcoes: fallbackOpcoes,
    modeloUrgencia: fallbackOpcoes[0] || '',
    modeloComunidade: fallbackOpcoes[1] || '',
    linkAfiliado,
    fonte: 'fallback_local'
  };
}
