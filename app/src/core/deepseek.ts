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
 * Dicionário Ortográfico PT-BR e Regras de Normalização Especializadas em E-commerce e TCG
 */
export const DICIONARIO_ORTOGRAFICO: [RegExp, string][] = [
  // Abreviações populares e vícios de digitação
  [/\bpromo\b/gi, 'promoção'],
  [/\bpromocao\b/gi, 'promoção'],
  [/\bpromocoes\b/gi, 'promoções'],
  [/\bta\b/gi, 'está'],
  [/\btamem\b/gi, 'também'],
  [/\btbm\b/gi, 'também'],
  [/\btb\b/gi, 'também'],
  [/\bvc\b/gi, 'você'],
  [/\bvcs\b/gi, 'vocês'],
  [/\bpq\b/gi, 'porque'],
  [/\bpra\b/gi, 'para'],
  [/\bpro\b/gi, 'para o'],
  [/\bpras\b/gi, 'para as'],
  [/\bpros\b/gi, 'para os'],
  [/\bmt\b/gi, 'muito'],
  [/\bmto\b/gi, 'muito'],
  [/\bunid\b/gi, 'unidades'],
  [/\bunids\b/gi, 'unidades'],
  [/\bpct\b/gi, 'pacotes'],
  [/\bpcts\b/gi, 'pacotes'],
  [/\bvlw\b/gi, 'aproveitem'],
  [/\bblz\b/gi, 'beleza'],
  [/\btd\b/gi, 'tudo'],
  [/\bq\b/gi, 'que'],
  [/\bngm\b/gi, 'ninguém'],
  [/\bmsg\b/gi, 'mensagem'],
  [/\bmsgs\b/gi, 'mensagens'],
  [/\bwpp\b/gi, 'WhatsApp'],
  [/\bzap\b/gi, 'WhatsApp'],
  [/\bwhats\b/gi, 'WhatsApp'],
  [/\bwhatsapp\b/gi, 'WhatsApp'],

  // Acentuações e ortografia PT-BR essenciais
  [/\bdisponiveis\b/gi, 'disponíveis'],
  [/\bdisponivel\b/gi, 'disponível'],
  [/\bindisponiveis\b/gi, 'indisponíveis'],
  [/\bindisponivel\b/gi, 'indisponível'],
  [/\bpreco\b/gi, 'preço'],
  [/\bprecos\b/gi, 'preços'],
  [/\botimo\b/gi, 'ótimo'],
  [/\botima\b/gi, 'ótima'],
  [/\botimos\b/gi, 'ótimos'],
  [/\botimas\b/gi, 'ótimas'],
  [/\bimperdivel\b/gi, 'imperdível'],
  [/\bimperdiveis\b/gi, 'imperdíveis'],
  [/\bincrivel\b/gi, 'incrível'],
  [/\bincriveis\b/gi, 'incríveis'],
  [/\bedicao\b/gi, 'edição'],
  [/\bedicoes\b/gi, 'edições'],
  [/\bcolecao\b/gi, 'coleção'],
  [/\bcolecoes\b/gi, 'coleções'],
  [/\blancamento\b/gi, 'lançamento'],
  [/\blancamentos\b/gi, 'lançamentos'],
  [/\breposicao\b/gi, 'reposição'],
  [/\breposicoes\b/gi, 'reposições'],
  [/\bgratis\b/gi, 'grátis'],
  [/\brapido\b/gi, 'rápido'],
  [/\brapida\b/gi, 'rápida'],
  [/\brapidos\b/gi, 'rápidos'],
  [/\brapidas\b/gi, 'rápidas'],
  [/\bfacil\b/gi, 'fácil'],
  [/\bfaceis\b/gi, 'fáceis'],
  [/\bdificil\b/gi, 'difícil'],
  [/\bdificeis\b/gi, 'difíceis'],
  [/\bja\b/gi, 'já'],
  [/\bso\b/gi, 'só'],
  [/\bate\b/gi, 'até'],
  [/\btambem\b/gi, 'também'],
  [/\bvoce\b/gi, 'você'],
  [/\bvoces\b/gi, 'vocês'],
  [/\bnao\b/gi, 'não'],
  [/\bentao\b/gi, 'então'],
  [/\bcartao\b/gi, 'cartão'],
  [/\bcartoes\b/gi, 'cartões'],
  [/\batencao\b/gi, 'atenção'],
  [/\bultimo\b/gi, 'último'],
  [/\bultima\b/gi, 'última'],
  [/\bultimos\b/gi, 'últimos'],
  [/\bultimas\b/gi, 'últimas'],
  [/\bunico\b/gi, 'único'],
  [/\bunica\b/gi, 'única'],
  [/\bunicos\b/gi, 'únicos'],
  [/\bunicas\b/gi, 'únicas'],
  [/\bnumero\b/gi, 'número'],
  [/\bnumeros\b/gi, 'números'],
  [/\bvalido\b/gi, 'válido'],
  [/\bvalida\b/gi, 'válida'],
  [/\bvalidos\b/gi, 'válidos'],
  [/\bvalidas\b/gi, 'válidas'],
  [/\binvalido\b/gi, 'inválido'],
  [/\binvalida\b/gi, 'inválida'],
  [/\bbeneficio\b/gi, 'benefício'],
  [/\bbeneficios\b/gi, 'benefícios'],
  [/\bfichario\b/gi, 'fichário'],
  [/\bficharios\b/gi, 'fichários'],
  [/\bpagina\b/gi, 'página'],
  [/\bpaginas\b/gi, 'páginas'],
  [/\bduvida\b/gi, 'dúvida'],
  [/\bduvidas\b/gi, 'dúvidas'],
  [/\bcomentario\b/gi, 'comentário'],
  [/\bcomentarios\b/gi, 'comentários'],
  [/\bpublicacao\b/gi, 'publicação'],
  [/\bpublicacoes\b/gi, 'publicações'],
  [/\bnoticia\b/gi, 'notícia'],
  [/\bnoticias\b/gi, 'notícias'],
  [/\bvisao\b/gi, 'visão'],
  [/\bopcao\b/gi, 'opção'],
  [/\bopcoes\b/gi, 'opções'],
  [/\bversao\b/gi, 'versão'],
  [/\bversoes\b/gi, 'versões'],
  [/\bhistorico\b/gi, 'histórico'],
  [/\bautomatico\b/gi, 'automático'],
  [/\bautomatica\b/gi, 'automática'],
  [/\balguem\b/gi, 'alguém'],
  [/\bninguem\b/gi, 'ninguém'],
  [/\bparabens\b/gi, 'parabéns'],
  [/\bconteudo\b/gi, 'conteúdo'],
  [/\bmaximo\b/gi, 'máximo'],
  [/\bminimo\b/gi, 'mínimo'],
  [/\bpratico\b/gi, 'prático'],
  [/\bpratica\b/gi, 'prática'],
  [/\bavariado\b/gi, 'avariado'],
  [/\blacrado\b/gi, 'lacrado'],
  [/\blacrada\b/gi, 'lacrada'],
  [/\boriginal\b/gi, 'original'],
  [/\boriginais\b/gi, 'originais'],

  // Pokémon & TCG termos canônicos
  [/\bpokemon\b/gi, 'Pokémon'],
  [/\bpokémon\b/gi, 'Pokémon'],
  [/\btcg\b/gi, 'TCG'],
  [/\betb\b/gi, 'ETB'],
  [/\betbs\b/gi, 'ETBs'],
  [/\bbooster\b/gi, 'booster'],
  [/\bboosters\b/gi, 'boosters'],
  [/\bblister\b/gi, 'blister'],
  [/\bblisters\b/gi, 'blisters'],
  [/\btripack\b/gi, 'tripack'],
  [/\btripacks\b/gi, 'tripacks'],
  [/\bsleeve\b/gi, 'sleeve'],
  [/\bsleeves\b/gi, 'sleeves']
];

export function preserveCase(match: string, target: string): string {
  if (match === match.toUpperCase()) return target.toUpperCase();
  if (['Pokémon', 'WhatsApp', 'TCG', 'ETB', 'ETBs'].includes(target)) {
    return target;
  }
  if (/[A-Z]/.test(target.slice(1))) return target;
  if (match.charAt(0) === match.charAt(0).toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  }
  return target.toLowerCase();
}

/**
 * Corretor ortográfico e gramatical nativo de alto desempenho (0ms)
 * Corrige acentuação, ortografia, pontuação e termos de e-commerce e TCG.
 */
export function corrigirTexto(bruto: string): string {
  let texto = (bruto || '').trim();
  if (!texto) return '';

  for (const [regex, substituicao] of DICIONARIO_ORTOGRAFICO) {
    texto = texto.replace(regex, (match) => preserveCase(match, substituicao));
  }

  // Ajusta pontuação solta e espaçamento duplicado
  texto = texto.replace(/\s+([.,!?:;])/g, '$1');
  texto = texto.replace(/\s{2,}/g, ' ');

  // Garante que a primeira letra da frase seja maiúscula
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Normaliza e humaniza frases brutas ou com erros de digitação
 */
export function humanizarTexto(bruto: string): string {
  let texto = (bruto || '').trim();
  if (!texto) return '';

  // Se tudo estiver em caixa alta, converter primeiro para minúsculas
  if (texto === texto.toUpperCase() && texto.length > 4) {
    texto = texto.toLowerCase();
  }

  return corrigirTexto(texto);
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

export interface ItemAnuncioMeta {
  id: 'amigo' | 'urgencia' | 'direto';
  tituloEstilo: string;
  badge: string;
  fraseImagem: string;
  textoPrincipal: string;
  tituloAnuncio: string;
  descricao: string;
  ctaRecomendada: string;
}

export interface GerarAnuncioMetaRequest {
  tema?: string;
  produtosDestaque?: string;
}

export interface GerarAnuncioMetaResponse {
  ok: boolean;
  variacoes: ItemAnuncioMeta[];
  fonte: 'deepseek' | 'fallback_local';
  erro?: string;
}

/**
 * Fallback Local: Gera 3 variações de anúncios de captação de leads para Meta Ads (0ms)
 * Com linguagem simples, zero palavras difíceis, quebra de objeção do grupo silencioso e frase para imagem.
 */
export function gerarAnuncioMetaLocal(
  tema?: string,
  produtosDestaque?: string
): ItemAnuncioMeta[] {
  const produtosLimpos = (produtosDestaque || '').trim();
  const temaLimpo = (tema || '').trim();

  const produtosTexto = produtosLimpos
    ? produtosLimpos
    : 'caixas, boosters, latas e cartas';

  return [
    {
      id: 'amigo',
      tituloEstilo: '☕ Convite Simples & Amigo',
      badge: 'Mais Leve e Natural',
      fraseImagem: 'GRUPO NO WHATSAPP • PROMOÇÕES DE POKÉMON TCG',
      textoPrincipal: `Quem coleciona Pokémon sabe como é chato ver um produto esgotar rápido e depois ver gente cobrando o dobro do preço na internet. 😅

Eu também coleciono, abro pacotes e acompanho os lançamentos. Como fico de olho nos estoques do Mercado Livre e das lojas oficiais o dia todo, criei um grupo gratuito no WhatsApp para avisar onde tem produto no preço normal de loja.

🔒 Grupo silencioso: só os administradores mandam mensagens. Zero bagunça e zero conversa fiada.
📦 Avisos de ${produtosTexto}
🏷️ Cupons de desconto e links de lojas confiáveis

👉 Toque no botão abaixo e entre no grupo para não perder as próximas promoções! 🃏✨`,
      tituloAnuncio: 'Entre no Grupo de Promoções TCG',
      descricao: 'Grupo grátis & Sem conversas',
      ctaRecomendada: 'Saiba mais'
    },
    {
      id: 'urgencia',
      tituloEstilo: '🚨 Alerta de Estoque & Promoção',
      badge: 'Avisos no WhatsApp',
      fraseImagem: 'AVISO NO WHATSAPP • QUANDO O PREÇO CAIR',
      textoPrincipal: `Cansado de pagar caro demais em Pokémon TCG? 🎯

A gente monitora os estoques e promoções nas lojas oficiais para você conseguir comprar ${produtosTexto} antes que acabe tudo.

🔒 Grupo 100% silencioso: só mandamos promoções reais. Sem conversas e sem spam.
⚡ Aviso rápido no seu WhatsApp assim que o preço baixar
🎟️ Cupons de desconto testados antes de enviar

👉 Toque em "Saiba Mais" e entre agora no grupo gratuito! 📲✨`,
      tituloAnuncio: 'Alerta de Preço Baixo Pokémon TCG',
      descricao: 'Avisos rápidos no WhatsApp',
      ctaRecomendada: 'Saiba mais'
    },
    {
      id: 'direto',
      tituloEstilo: '⚡ Preço de Loja (Sem Pagar Caro)',
      badge: 'Direto ao Ponto',
      fraseImagem: 'CHEGA DE PAGAR CARO • OFERTAS DE POKÉMON TCG',
      textoPrincipal: `Você não precisa mais perder tempo caçando promoções de Pokémon pela internet. 🃏🔥

A gente encontra as melhores ofertas do dia e avisa você direto no WhatsApp:

• Preço justo de loja em produtos lacrados ${produtosLimpos ? `(${produtosLimpos})` : ''}
• Links seguros direto de lojas oficiais e vendedores confiáveis
🔒 Grupo silencioso: só os administradores postam, sem mensagens chatas

👉 Toque no botão e venha economizar no nosso grupo grátis! 📲`,
      tituloAnuncio: 'Grupo de Ofertas de Pokémon TCG',
      descricao: '100% gratuito e silencioso',
      ctaRecomendada: 'Saiba mais'
    }
  ];
}

/**
 * Motor Principal de Anúncios Meta Ads: Gera copies completas prontas para tráfego pago
 */
export async function gerarAnuncioMetaComIA(
  input: GerarAnuncioMetaRequest
): Promise<GerarAnuncioMetaResponse> {
  const tema = (input.tema || '').trim();
  const produtos = (input.produtosDestaque || '').trim();

  const apiKey = getConfig('deepseek_api_key', CONFIG.deepseekApiKey || '').trim();
  const baseUrl = getConfig('deepseek_base_url', CONFIG.deepseekBaseUrl || 'https://opencode.ai/zen/go/v1').trim();
  const model = getConfig('deepseek_model', CONFIG.deepseekModel || 'deepseek-v4-flash').trim();

  if (!apiKey) {
    return {
      ok: true,
      variacoes: gerarAnuncioMetaLocal(tema, produtos),
      fonte: 'fallback_local'
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  const promptSistema = `Você é um especialista em redação de anúncios para Instagram e Facebook (Meta Ads).
Seu objetivo é EXCLUSIVAMENTE A CAPTAÇÃO DE LEADS (convidar e atrair colecionadores, jogadores e pais para ENTRAR NO GRUPO GRATUITO DE WHATSAPP onde são enviadas promoções de Pokémon TCG).

REGRA MANDATÓRIA DE LINGUAGEM (PALAVRAS SIMPLES E NATURAIS):
- USE UMA LINGUAGEM FÁCIL, POPULAR E DIRETA. Não use palavras difíceis ou termos técnicos (PROIBIDO usar palavras como: "ágio", "drops", "scalpers", "leilão", "CPL", "arbitragem", "escutei", "demanda reprimida").
- Em vez de "ágio", diga "pagar caro" ou "pagar o dobro do preço".
- Em vez de "drops", diga "quando o produto voltar para a loja" ou "novas caixas nas lojas".
- O objetivo é fazer a pessoa clicar no anúncio para entrar no grupo gratuito de WhatsApp.

Sua missão é gerar EXATAMENTE 3 variações de anúncios de alta conversão:
1. "amigo" (tom de conversa simples de colecionador para colecionador, convidando pro grupo)
2. "urgencia" (focado em receber avisos rápidos no WhatsApp quando tiver promoção antes de acabar)
3. "direto" (focado em economizar e não pagar caro, direto ao ponto)

REGRAS TÉCNICAS MANDATÓRIAS DO META ADS:
- O texto principal DEVE incluir a linha de quebra de objeção do grupo silencioso com palavras simples: "🔒 Grupo silencioso: só os administradores mandam mensagens. Zero bagunça e zero conversa fiada."
- O texto principal DEVE convidar a pessoa a tocar no botão para entrar no grupo grátis do WhatsApp.
- O título (Headline) DEVE ser curto, direto e ter menos de 40 caracteres.
- A descrição DEVE ter menos de 30 caracteres.
- DEVE sugerir uma Frase de Impacto simples para a imagem/banner.
- Retorne EXCLUSIVAMENTE um objeto JSON com array "variacoes" contendo os 3 objetos:
{
  "variacoes": [
    {
      "id": "amigo",
      "tituloEstilo": "☕ Convite Simples & Amigo",
      "badge": "Mais Leve e Natural",
      "fraseImagem": "...",
      "textoPrincipal": "...",
      "tituloAnuncio": "...",
      "descricao": "...",
      "ctaRecomendada": "Saiba mais"
    },
    ...
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
            content: `Crie anúncios focados em CAPTAÇÃO PARA GRUPO GRATUITO DE WHATSAPP com linguagem simples e clara. Tema: ${tema || 'Entrar no grupo gratuito de ofertas para não pagar caro em Pokémon'}.${produtos ? ` Produtos em destaque: ${produtos}.` : ''}`
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
        if (Array.isArray(parsed.variacoes) && parsed.variacoes.length === 3) {
          return {
            ok: true,
            variacoes: parsed.variacoes,
            fonte: 'deepseek'
          };
        }
      }
    }
  } catch {
    clearTimeout(timeoutId);
  }

  return {
    ok: true,
    variacoes: gerarAnuncioMetaLocal(tema, produtos),
    fonte: 'fallback_local'
  };
}
