import { CONFIG } from '../config.js';
import { getConfig } from '../db/database.js';
import {
  extrairCupom,
  calcularDesconto
} from './anuncio.js';
import { extrairDadosOferta } from './sheets.js';

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
 * Normaliza e humaniza frases brutas ou em caixa alta (ex: "PROMO BOA PESSOAL 5 UNIDADES")
 */
function humanizarTexto(bruto: string): string {
  let texto = bruto.trim();

  // Se tudo estiver em caixa alta, converter primeiro para minúsculas
  if (texto === texto.toUpperCase()) {
    texto = texto.toLowerCase();
  }

  // Substitui abreviações populares de internet
  texto = texto
    .replace(/\bpromo\b/gi, 'promoção')
    .replace(/\bpromocao\b/gi, 'promoção')
    .replace(/\bta\b/gi, 'está')
    .replace(/\bvc\b/gi, 'você')
    .replace(/\bvcs\b/gi, 'vocês')
    .replace(/\bpq\b/gi, 'porque')
    .replace(/\bmt\b/gi, 'muito')
    .replace(/\bmto\b/gi, 'muito')
    .replace(/\bunid\b/gi, 'unidades')
    .replace(/\bvaleu\b/gi, 'aproveitem');

  // Remove pontuação solta no fim
  texto = texto.replace(/[!.]+$/, '');

  // Capitalizar primeira letra
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Fallback Local para Chamada Rápida (0ms):
 * Embeleza a frase com emojis e pontuação sem @ e sem links
 */
export function embelezarChamadaLocal(rascunho: string): string[] {
  const limpo = humanizarTexto(rascunho);

  // Variação 1: Urgência & Fogo
  const op1 = `🚨 *${limpo}!* Aproveitem enquanto ainda tem estoque! 🔥⚡`;

  // Variação 2: Atenção & Oportunidade
  const op2 = `⚡ *Atenção, pessoal!* ${limpo}. Vale muito a pena conferir! 🏃‍♂️💨`;

  // Variação 3: Direta & Animada
  const op3 = `🔥 *Oportunidade top pra vocês!* ${limpo} Corram pra garantir! 📦✨`;

  return [op1, op2, op3];
}

/**
 * Fallback Local para Anúncio Completo com Produto e Links
 */
export function gerarCopiesLocaisFallback(
  rascunho: string,
  linkAfiliado: string
): { modeloUrgencia: string; modeloComunidade: string } {
  const dados = extrairDadosOferta(rascunho, linkAfiliado);
  const cupom = extrairCupom(rascunho);
  const link = linkAfiliado || dados.link || getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');
  const titulo = dados.produto && dados.produto !== 'Colecionável Pokémon TCG' ? dados.produto : (rascunho.split('\n')[0] || 'Colecionável Pokémon TCG');

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

  const modeloUrgencia = `@pokemon_tcg_promo

🚨 *ALERTA DE OFERTA RELÂMPAGO!* ⚡

📦 *${titulo}*${precoDeStr}${precoPorStr}${cupomStr}

🛒 *Garanta o seu antes que o estoque esgote:*
${link}

⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._`.trim();

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
 * Motor Principal: DeepSeek v4.1 via OpenCode Gateway
 */
export async function redigirOfertaComIA(
  input: GerarCopiesIARequest
): Promise<GerarCopiesIAResponse> {
  const rascunho = (input.rascunho || '').trim();
  const modo = input.modo || (input.link ? 'anuncio' : 'chamada');
  const linkAfiliado = (input.link || '').trim() || getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

  if (!rascunho) {
    return {
      ok: false,
      modo,
      opcoes: [],
      modeloUrgencia: '',
      modeloComunidade: '',
      linkAfiliado,
      fonte: 'fallback_local',
      erro: 'Digite uma frase ou chamada para a IA embelezar.'
    };
  }

  const apiKey = getConfig('deepseek_api_key', CONFIG.deepseekApiKey || '').trim();
  const baseUrl = getConfig('deepseek_base_url', CONFIG.deepseekBaseUrl || 'https://opencode.ai/zen/go/v1').trim();
  const model = getConfig('deepseek_model', CONFIG.deepseekModel || 'deepseek-v4-flash').trim();

  // MODO 1: CHAMADA RÁPIDA (Sem arroba, sem links, sem disclaimers pesados)
  if (modo === 'chamada') {
    if (!apiKey) {
      const opcoes = embelezarChamadaLocal(rascunho);
      return {
        ok: true,
        modo: 'chamada',
        opcoes,
        modeloUrgencia: opcoes[0] || '',
        modeloComunidade: opcoes[1] || '',
        linkAfiliado: '',
        fonte: 'fallback_local'
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const promptSistemaChamada = `Você é um assistente que reescreve e embeleza avisos e chamadas curtas para grupos de WhatsApp.
O usuário vai enviar uma frase bruta ou informal (ex: "PROMO BOA PESSOAL 5 UNIDADES").
Sua missão é transformá-la em chamadas bonitas, bem escritas, atraentes e naturais.

REGRAS ESTRITAS:
1. NUNCA inclua arrobas (@) nem nomes de canais ou perfis.
2. NUNCA inclua links ou URLs.
3. NUNCA invente preços ou disclaimers longos de rodapé.
4. Use emojis adequados e de bom gosto (ex: 🔥, ⚡, 🚨, 📦, 🏃‍♂️, ✨, 🎯).
5. Mantenha as mensagens curtas (1 a 2 linhas no máximo).
6. Gere 3 opções variadas de chamada (uma direta de urgência, uma amigável de oportunidade e uma curta vibrante).
7. Retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
  "opcoes": [
    "🚨 Opção 1 formatada...",
    "⚡ Opção 2 formatada...",
    "🔥 Opção 3 formatada..."
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
            { role: 'system', content: promptSistemaChamada },
            { role: 'user', content: `FRASE BRUTA DO USUÁRIO:\n${rascunho}` }
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json() as any;
        const contentStr = data.choices?.[0]?.message?.content || '';
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.opcoes) && parsed.opcoes.length > 0) {
            const opcoesFiltradas = parsed.opcoes.map((op: string) => op.trim()).filter(Boolean);
            return {
              ok: true,
              modo: 'chamada',
              opcoes: opcoesFiltradas,
              modeloUrgencia: opcoesFiltradas[0] || '',
              modeloComunidade: opcoesFiltradas[1] || '',
              linkAfiliado: '',
              fonte: 'deepseek'
            };
          }
        }
      }
    } catch {
      clearTimeout(timeoutId);
    }

    // Fallback local se a API externa demorar ou falhar
    const fallbackOpcoes = embelezarChamadaLocal(rascunho);
    return {
      ok: true,
      modo: 'chamada',
      opcoes: fallbackOpcoes,
      modeloUrgencia: fallbackOpcoes[0] || '',
      modeloComunidade: fallbackOpcoes[1] || '',
      linkAfiliado: '',
      fonte: 'fallback_local'
    };
  }

  // MODO 2: ANÚNCIO COMPLETO COM PRODUTO E LINK
  if (!apiKey) {
    const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
    return {
      ok: true,
      modo: 'anuncio',
      opcoes: [fallback.modeloUrgencia, fallback.modeloComunidade],
      modeloUrgencia: fallback.modeloUrgencia,
      modeloComunidade: fallback.modeloComunidade,
      linkAfiliado,
      fonte: 'fallback_local'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const promptSistema = `Você é o copywriter profissional de elite do canal "@pokemon_tcg_promo" no WhatsApp.
Sua missão é transformar rascunhos em 2 copies comerciais completas para WhatsApp.

REGRAS:
1. Inicie ambas as mensagens com "@pokemon_tcg_promo".
2. Formate com *negrito*, _itálico_ e emojis (⚡, 📦, 🔥, 💰, 🛒, 🎟️, ⚠️).
3. Mantenha o link fornecido intacto.
4. Termine com: "⚠️ _Preço e estoque promocional sujeitos a alteração a qualquer momento._"
5. Retorne EXCLUSIVAMENTE um objeto JSON:
{
  "modeloUrgencia": "Texto completo modelo urgência",
  "modeloComunidade": "Texto completo modelo comunidade"
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
          { role: 'user', content: `RASCUNHO:\n${rascunho}\n\nLINK:\n${linkAfiliado}` }
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      const contentStr = data.choices?.[0]?.message?.content || '';
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.modeloUrgencia && parsed.modeloComunidade) {
          return {
            ok: true,
            modo: 'anuncio',
            opcoes: [parsed.modeloUrgencia.trim(), parsed.modeloComunidade.trim()],
            modeloUrgencia: parsed.modeloUrgencia.trim(),
            modeloComunidade: parsed.modeloComunidade.trim(),
            linkAfiliado,
            fonte: 'deepseek'
          };
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  const fallback = gerarCopiesLocaisFallback(rascunho, linkAfiliado);
  return {
    ok: true,
    modo: 'anuncio',
    opcoes: [fallback.modeloUrgencia, fallback.modeloComunidade],
    modeloUrgencia: fallback.modeloUrgencia,
    modeloComunidade: fallback.modeloComunidade,
    linkAfiliado,
    fonte: 'fallback_local'
  };
}
