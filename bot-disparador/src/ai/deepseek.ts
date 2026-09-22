import { getConfig, setConfig, addHistoricoIA, getHistoricoIA, logSistema } from '../db/database.js';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Consulta a IA DeepSeek para responder mensagens no privado com contexto e personalidade
 */
export async function generateDeepSeekResponse(
  chatJid: string,
  userMessage: string,
  senderName?: string
): Promise<string | null> {
  const apiKey = getConfig('deepseek_api_key', '').trim();
  const ativo = getConfig('deepseek_ativo', 'true') === 'true';

  if (!ativo) {
    return null;
  }

  if (!apiKey) {
    logSistema('warn', 'deepseek', 'Chave de API do DeepSeek não configurada no painel.');
    return null;
  }

  let rawBaseUrl = getConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1').trim();
  let model = getConfig('deepseek_model', 'deepseek-flash').trim();

  // Normalização de aliases amigáveis para modelos OpenCode e DeepSeek
  const modelLower = model.toLowerCase();
  if (modelLower === 'deepseek flash' || modelLower === 'deepseek-flash' || modelLower === 'flash') {
    model = 'deepseek-flash';
  } else if (modelLower === 'deepseek-v4-flash' || modelLower === 'v4-flash') {
    model = 'deepseek-v4-flash';
  } else if (modelLower === 'open code go' || modelLower === 'opencode go' || modelLower === 'go') {
    model = 'deepseek-flash';
  } else if (modelLower === 'deepseek-v4-pro' || modelLower === 'v4-pro') {
    model = 'deepseek-v4-pro';
  }

  // Auto-correção: se a URL for api.deepseek.com mas o modelo for do OpenCode (flash, v4, etc.)
  if (rawBaseUrl.includes('api.deepseek.com') && (model.includes('flash') || model.includes('pro') || model.includes('v4') || model === 'deepseek-flash')) {
    rawBaseUrl = 'https://opencode.ai/zen/go/v1';
    setConfig('deepseek_base_url', rawBaseUrl);
  }

  let endpoint = rawBaseUrl.replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  // Se estiver usando o gateway OpenCode e o modelo for o padrão deepseek-chat ou vazio, usa deepseek-flash
  if (endpoint.includes('opencode.ai') && (!model || model === 'deepseek-chat')) {
    model = 'deepseek-flash';
  }

  const systemPrompt = getConfig('deepseek_prompt_sistema', '');

  // Salvar mensagem recebida do lead no histórico
  addHistoricoIA(chatJid, 'lead', userMessage);

  // Buscar histórico recente para dar continuidade coerente
  const historicoAntigo = getHistoricoIA(chatJid, 8);

  const messages: DeepSeekMessage[] = [
    {
      role: 'system',
      content: `${systemPrompt}\n\n[Informações do Contato]: O nome do cliente é ${senderName || 'Amigo'}. Responda diretamente a ele.`
    }
  ];

  for (const item of historicoAntigo) {
    messages.push({
      role: item.remetente === 'lead' ? 'user' : 'assistant',
      content: item.mensagem
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-opencode-session': `session-${chatJid.replace(/[^a-zA-Z0-9_-]/g, '') || Date.now()}`
    };

    let res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 600,
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    // Se deu 401 na API oficial da DeepSeek, tenta automaticamente no gateway OpenCode
    if (!res.ok && res.status === 401 && endpoint.includes('api.deepseek.com')) {
      logSistema('warn', 'deepseek', 'Chave rejeitada pela api.deepseek.com (401). Redirecionando automaticamente para gateway OpenCode Zen Go...');
      const opencodeEndpoint = 'https://opencode.ai/zen/go/v1/chat/completions';
      const retryModel = (model === 'deepseek-chat' || !model) ? 'deepseek-flash' : model;
      try {
        const retryRes = await fetch(opencodeEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: retryModel,
            messages,
            temperature: 0.7,
            max_tokens: 600,
            stream: false
          })
        });
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as any;
          const retryReply = retryData?.choices?.[0]?.message?.content?.trim() || retryData?.choices?.[0]?.message?.reasoning_content?.trim();
          if (retryReply) {
            setConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
            setConfig('deepseek_model', retryModel);
            addHistoricoIA(chatJid, 'bot', retryReply);
            logSistema('ia', 'deepseek', `Resposta gerada com sucesso via OpenCode para ${chatJid.split('@')[0]}: "${retryReply.slice(0, 70)}..."`);
            return retryReply;
          }
        }
      } catch (retryErr) {
        // Segue para o log de erro original
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      logSistema('error', 'deepseek', `Erro na API DeepSeek HTTP ${res.status}: ${errText.slice(0, 250)}`);
      return null;
    }

    const data = (await res.json()) as any;
    const reply = data?.choices?.[0]?.message?.content?.trim() || data?.choices?.[0]?.message?.reasoning_content?.trim();

    if (reply) {
      // Salvar resposta no histórico
      addHistoricoIA(chatJid, 'bot', reply);
      logSistema('ia', 'deepseek', `Resposta gerada para ${chatJid.split('@')[0]}: "${reply.slice(0, 70)}..."`);
      return reply;
    }

    return null;
  } catch (err: any) {
    logSistema('error', 'deepseek', `Falha na requisição para DeepSeek: ${err?.message || err}`);
    return null;
  }
}

/**
 * Otimiza um template com IA para adequação total às diretrizes do Meta Shield e Anti-Ban
 */
export async function optimizeTemplateWithDeepSeek(rawTemplate: string): Promise<string> {
  const apiKey = getConfig('deepseek_api_key', '').trim();
  const rawBaseUrl = getConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1').trim();
  let model = getConfig('deepseek_model', 'deepseek-flash').trim();

  const promptSistema = `Você é um especialista em WhatsApp Anti-Ban e Copywriting Humanizado da Meta.
Sua missão é reescrever a mensagem fornecida tornando-a 100% segura contra bloqueios no WhatsApp.

Diretrizes Obrigatórias:
1. Comece com uma saudação amigável e a tag {nome} (ex: "{Fala|E aí|Oi} {nome}!").
2. Utilize Spintax em várias partes no formato {Opção A|Opção B|Opção C} para gerar dezenas de variações únicas.
3. NUNCA use palavras de spam agressivas (ex: "compre já", "urgente", "clique aqui", "renda extra").
4. Remova links diretos no primeiro contato: transforme em uma pergunta amigável pedindo permissão para enviar o link (ex: "{posso te mandar o link do grupo|quer que eu te envie o acesso}?").
5. Finalize sempre com uma pergunta calorosa para estimular o cliente a responder.
6. Mantenha o tom de Eduardo, colecionador fã de Pokémon TCG que fala de fã para fãs.
7. Retorne APENAS o texto reescrito com {nome} e Spintax {A|B}, sem aspas ou introduções.`;

  if (apiKey) {
    let endpoint = rawBaseUrl.replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}/chat/completions`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'x-opencode-session': `optimize-${Date.now()}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: promptSistema },
            { role: 'user', content: `Reescreva este template aplicando Spintax e blindagem contra banimento da Meta:\n\n${rawTemplate}` }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = (await res.json()) as any;
        let reply = data?.choices?.[0]?.message?.content?.trim() || data?.choices?.[0]?.message?.reasoning_content?.trim();
        if (reply) {
          reply = reply.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
          return reply;
        }
      }
    } catch (err) {
      console.warn('[Meta Optimizer] Falha ao consultar DeepSeek, usando otimizador heurístico:', err);
    }
  }

  // Fallback Heurístico se a IA estiver offline ou sem chave de API
  let clean = rawTemplate;
  clean = clean.replace(/https?:\/\/[^\s]+/gi, '').replace(/\s{2,}/g, ' ').trim();
  clean = clean.replace(/\bcompre\s+j[aá]\b/gi, '{dá uma olhada|dá uma conferida}');
  clean = clean.replace(/\bclique\s+aqui\b/gi, '{me avisa se quiser ver|se fizer sentido te mando}');
  clean = clean.replace(/\bpromo[cç][aã]o\s+imperd[ií]vel\b/gi, '{oportunidade bacana|achado bem legal}');

  if (!clean.includes('{nome}')) {
    clean = `{Fala|E aí|Oi} {nome}! {Tudo bem|Tudo certo|Como vai}?\n\n` + clean;
  }

  if (!clean.includes('?')) {
    clean += `\n\n{Posso te mandar o link certinho por aqui|Quer que eu te envie o acesso}?`;
  }

  return clean;
}

