import { getConfig, addHistoricoIA, getHistoricoIA, logSistema } from '../db/database.js';

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

  const rawBaseUrl = getConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1').trim();
  let endpoint = rawBaseUrl.replace(/\/+$/, '');
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

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

    const res = await fetch(endpoint, {
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
