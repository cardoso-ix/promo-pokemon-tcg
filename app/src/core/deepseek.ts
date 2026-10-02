import { CONFIG } from '../config.js';
import { getConfig } from '../db/database.js';
import {
  formatarMensagemReplicada,
  extrairCupom,
  calcularDesconto
} from './anuncio.js';
import { extrairDadosOferta } from './sheets.js';

export interface GerarCopiesIARequest {
  rascunho: string;
  link?: string;
}

export interface GerarCopiesIAResponse {
  ok: boolean;
  modeloUrgencia: string;
  modeloComunidade: string;
  linkAfiliado: string;
  fonte: 'deepseek' | 'fallback_local';
  erro?: string;
}

/**
 * Fallback Local Ultrarrápido (0ms): Gera cópias de alta conversão sem depender de APIs externas
 */
export function gerarCopiesLocaisFallback(
  rascunho: string,
  linkAfiliado: string
): { modeloUrgencia: string; modeloComunidade: string } {
  const dados = extrairDadosOferta(rascunho, linkAfiliado);
  const cupom = extrairCupom(rascunho);
  const link = linkAfiliado || dados.link || getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');
  const titulo = dados.produto && dados.produto !== 'Colecionável Pokémon TCG' ? dados.produto : (rascunho.split('\n')[0] || 'Colecionável Pokémon TCG');

  // Calcula desconto caso tenha De e Por
  let descLinha = '';
  if (dados.valorDe && dados.valorPor) {
    const desc = calcularDesconto(dados.valorDe, dados.valorPor);
    if (desc && desc.percentualOff > 0) {
      descLinha = ` (${desc.percentualOff}% OFF)`;
    }
  }

  const precoDeStr = dados.valorDe ? `\n❌ ~De: ${dados.valorDe}~` : '';
  const precoPorStr = dados.valorPor ? `\n🔥 *Por apenas: ${dados.valorPor}*${descLinha}` : '';
  const cupomStr = cupom ? `\n🎟️ *Cupom:* \`${cupom}\`` : '';

  // Modelo 1: Urgência & Relâmpago
  const modeloUrgencia = `@pokemon_tcg_promo

🚨 *ALERTA DE OFERTA RELÂMPAGO!* ⚡

📦 *${titulo}*${precoDeStr}${precoPorStr}${cupomStr}

🛒 *Garanta o seu antes que o estoque esgote:*
${link}

⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._`.trim();

  // Modelo 2: Comunidade & Curadoria Pessoal
  const modeloComunidade = `@pokemon_tcg_promo

🌟 *OPORTUNIDADE RECOMENDADA DE HOJE!* 🎯

📦 *${titulo}*${precoDeStr}${precoPorStr}${cupomStr}

🔎 _Produto oficial com procedência garantida e o melhor preço de tabela garimpado hoje no Mercado Livre._

🛒 *Compre com segurança através do link oficial:*
${link}

⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._`.trim();

  return {
    modeloUrgencia,
    modeloComunidade
  };
}

/**
 * Motor Principal de IA: Consulta a API do DeepSeek v4.1 via OpenCode com Fallback Local automático
 */
export async function redigirOfertaComIA(
  input: GerarCopiesIARequest
): Promise<GerarCopiesIAResponse> {
  const rascunho = (input.rascunho || '').trim();
  const linkAfiliado = (input.link || '').trim() || getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

  if (!rascunho) {
    return {
      ok: false,
      modeloUrgencia: '',
      modeloComunidade: '',
      linkAfiliado,
      fonte: 'fallback_local',
      erro: 'Digite uma ideia ou frase para a IA redigir.'
    };
  }

  // Tenta obter credenciais do DeepSeek (.env ou configs da Central de Ajustes)
  const apiKey = getConfig('deepseek_api_key', CONFIG.deepseekApiKey || '').trim();
  const baseUrl = getConfig('deepseek_base_url', CONFIG.deepseekBaseUrl || 'https://opencode.ai/zen/go/v1').trim();
  const model = getConfig('deepseek_model', CONFIG.deepseekModel || 'deepseek-v4-flash').trim();

  // Se não houver API Key cadastrada, ativa o Fallback Local instantaneamente em 0ms
  if (!apiKey) {
    const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
    return {
      ok: true,
      modeloUrgencia: fallback.modeloUrgencia,
      modeloComunidade: fallback.modeloComunidade,
      linkAfiliado,
      fonte: 'fallback_local'
    };
  }

  // Chamada à API DeepSeek v4.1 com timeout de 4.5 segundos
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  const promptSistema = `Você é o copywriter profissional de elite do canal oficial de promoções de Pokémon TCG "@pokemon_tcg_promo" no WhatsApp.
Sua missão é transformar rascunhos, frases soltas ou notas do usuário em 2 copies comerciais de altíssimo impacto para WhatsApp.

REGRAS OBRIGATÓRIAS:
1. Sempre inicie ambas as mensagens exatamente com a assinatura "@pokemon_tcg_promo" na primeira linha.
2. Formate com rica estilização para WhatsApp (*negrito*, _itálico_, ~tachado~).
3. Use emojis estratégicos de e-commerce e Pokémon: ⚡, 📦, 🔥, 💰, 🛒, 🎟️, ⚠️.
4. Mantenha o link fornecido intacto e limpo no campo de compra.
5. Termine obrigatoriamente ambas as mensagens com o rodapé:
"⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._"
6. Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown adicionais) com as chaves:
{
  "modeloUrgencia": "Texto completo do modelo focado em escassez/urgência",
  "modeloComunidade": "Texto completo do modelo focado em curadoria/recomendação amigável"
}`;

  const promptUsuario = `RASCUNHO DO USUÁRIO:
${rascunho}

LINK OFICIAL DO PRODUTO:
${linkAfiliado}`;

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
          { role: 'user', content: promptUsuario }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[DeepSeek IA] Resposta HTTP ${response.status} da API. Acionando Fallback Local.`);
      const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
      return {
        ok: true,
        modeloUrgencia: fallback.modeloUrgencia,
        modeloComunidade: fallback.modeloComunidade,
        linkAfiliado,
        fonte: 'fallback_local'
      };
    }

    const data = await response.json() as any;
    const contentStr = data.choices?.[0]?.message?.content || '';

    // Sanitiza e extrai JSON da resposta
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.modeloUrgencia && parsed.modeloComunidade) {
        return {
          ok: true,
          modeloUrgencia: parsed.modeloUrgencia.trim(),
          modeloComunidade: parsed.modeloComunidade.trim(),
          linkAfiliado,
          fonte: 'deepseek'
        };
      }
    }

    // Se o parse JSON falhar, aciona Fallback
    const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
    return {
      ok: true,
      modeloUrgencia: fallback.modeloUrgencia,
      modeloComunidade: fallback.modeloComunidade,
      linkAfiliado,
      fonte: 'fallback_local'
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn('[DeepSeek IA] Erro ou timeout na chamada externa. Acionando Fallback Local:', err);
    const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
    return {
      ok: true,
      modeloUrgencia: fallback.modeloUrgencia,
      modeloComunidade: fallback.modeloComunidade,
      linkAfiliado,
      fonte: 'fallback_local'
    };
  }
}
