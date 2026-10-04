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
 * Fallback Local: Gera 3 variações de anúncios de alta conversão para Meta Ads (0ms)
 * Com quebra de objeção do grupo silencioso, combate ao ágio e frase para imagem.
 */
export function gerarAnuncioMetaLocal(
  tema?: string,
  produtosDestaque?: string
): ItemAnuncioMeta[] {
  const produtosLimpos = (produtosDestaque || '').trim();
  const temaLimpo = (tema || '').trim();

  const produtosTexto = produtosLimpos
    ? `(${produtosLimpos})`
    : 'Booster Boxes, ETBs, Tripacks e Bundles';

  return [
    {
      id: 'amigo',
      tituloEstilo: '☕ Amigo Colecionador (UGC & Conexão Real)',
      badge: 'Menor Custo por Lead',
      fraseImagem: 'ENTRE NO NOSSO GRUPO VIP • E VENHA ECONOMIZAR EM POKÉMON TCG',
      textoPrincipal: `Quem coleciona Pokémon sabe a raiva que dá ver produto esgotando em minutos pra depois aparecer pelo dobro do preço na internet. 😅

Eu também compro, abro meus pacotes e acompanho os lançamentos. Como já passo boa parte do meu dia olhando os estoques do Mercado Livre e lojas oficiais, criei um grupo no WhatsApp para compartilhar onde tá valendo a pena comprar no preço justo de tabela.

🔒 Grupo silencioso (apenas admins postam ofertas reais)
📦 Reposição de ${produtosTexto}
🏷️ Cupons testados no carrinho e links 100% seguros

Toque em "Saiba Mais" e venha economizar com a gente! 🃏✨`,
      tituloAnuncio: 'Acesse o Grupo de Promoções TCG',
      descricao: 'Preço de tabela & Sem spam',
      ctaRecomendada: 'Saiba mais'
    },
    {
      id: 'urgencia',
      tituloEstilo: '🚨 Radar de Estoque & Urgência (Reposições)',
      badge: 'Maior Taxa de Clique',
      fraseImagem: 'RADAR DE OFERTAS POKÉMON • CAIXAS LACRADAS PELO MENOR PREÇO',
      textoPrincipal: `Cansado de pagar preço abusivo de revenda em Pokémon TCG? 🎯

Nosso radar monitora reposições em tempo real no Mercado Livre e Amazon para você garantir ${produtosTexto} antes que os estoques esgotem.

🔒 Grupo 100% silencioso (zero conversa fiada, só ofertas)
⚡ Alertas instantâneos de drops oficiais e reposições
🎟️ Cupons exclusivos testados no carrinho antes de postar

👉 Toque em "Saiba Mais" e entre no Grupo VIP antes do próximo drop! 🚀`,
      tituloAnuncio: 'Radar VIP de Ofertas Pokémon TCG',
      descricao: 'Alertas em tempo real',
      ctaRecomendada: 'Obter Acesso'
    },
    {
      id: 'direto',
      tituloEstilo: '⚡ Direto & Objetivo (Preço Justo)',
      badge: 'Alta Conversão Mobile',
      fraseImagem: 'PARE DE PAGAR ÁGIO • AS MELHORES OFERTAS DE POKÉMON TCG',
      textoPrincipal: `Alguém já comparou os preços por você. 🃏🔥

Garimpamos as melhores ofertas de Pokémon TCG para você não perder tempo nem dinheiro caçando na internet.

• Preço justo de tabela em produtos disputados ${produtosLimpos ? `(${produtosLimpos})` : ''}
• Links de Lojas Oficiais e MercadoLíderes Platinum
🔒 Grupo silencioso: apenas administradores postam

Clique no botão abaixo e participe gratuitamente do nosso grupo VIP! 📲`,
      tituloAnuncio: 'Grupo VIP de Ofertas e Cupons TCG',
      descricao: 'Acesso imediato e gratuito',
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

  const promptSistema = `Você é um Copywriter especialista em anúncios do Meta Ads (Instagram e Facebook) focado em atrair colecionadores de Pokémon TCG para grupos VIP de WhatsApp.
Sua missão é gerar EXATAMENTE 3 variações de anúncios de alta conversão:
1. "amigo" (tom de amigo colecionador, UGC, natural, 1ª pessoa)
2. "urgencia" (alerta de radar, reposições de estoque, velocidade)
3. "direto" (curto, quebra de objeções, focado em preço justo e praticidade)

REGRAS MANDATÓRIAS DE TRÁFEGO PAGO NO META:
- O texto principal (Primary Text) DEVE incluir a linha de quebra de objeção do grupo silencioso: "🔒 Grupo silencioso (apenas administradores postam)".
- DEVE citar combate a preço de cambista / revenda abusiva e garantia de preço de tabela em lojas oficiais (Mercado Livre / Amazon).
- O título (Headline) DEVE ser magnético e ter menos de 40 caracteres.
- A descrição DEVE ter menos de 30 caracteres.
- DEVE sugerir uma Frase de Impacto para colocar no centro da Imagem/Arte (Banner).
- Retorne EXCLUSIVAMENTE um objeto JSON com array "variacoes" contendo os 3 objetos:
{
  "variacoes": [
    {
      "id": "amigo",
      "tituloEstilo": "☕ Amigo Colecionador (UGC & Conexão Real)",
      "badge": "Menor Custo por Lead",
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
            content: `Crie anúncios Meta Ads para o tema: ${tema || 'Entrar no grupo VIP para pegar caixas de Pokémon no preço de tabela'}.${produtos ? ` Produtos em destaque: ${produtos}.` : ''}`
          }
        ],
        temperature: 0.6,
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
