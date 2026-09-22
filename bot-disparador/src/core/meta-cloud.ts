import { saveMetaTemplate, deleteMetaTemplateFromDb, MetaTemplate } from '../db/database.js';

export interface MetaConnectionResult {
  ok: boolean;
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
  error?: string;
}

export interface SubmitTemplateParams {
  token: string;
  wabaId: string;
  name: string;
  category: 'UTILITY' | 'MARKETING';
  language?: string;
  bodyText: string;
  exampleVariables?: string[];
}

export interface SendTemplateMessageParams {
  token: string;
  phoneNumberId: string;
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: string[];
}

/**
 * Normaliza o nome do template para as regras da Meta:
 * Somente letras minúsculas, números e sublinhados (ex: 'pokemon_alerta_utilidade')
 */
export function formatMetaTemplateName(name: string): string {
  if (!name) return 'template_meta';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 512);
}

/**
 * Auditor de Risco de Reclassificação para Utilidade:
 * Detecta palavras comerciais que fariam a Meta reclassificar automaticamente de UTILITY para MARKETING
 */
export interface UtilitySafetyAudit {
  safe: boolean;
  isSafeForUtility: boolean;
  score: number;
  wordsFound: string[];
  detectedTriggers: string[];
  infractions: { trigger: string; reason: string }[];
  warningMessage?: string;
}

/**
 * Auditor de Risco de Reclassificação para Utilidade:
 * Detecta palavras comerciais que fariam a Meta reclassificar automaticamente de UTILITY para MARKETING
 */
export function validateUtilitySafety(text: string): UtilitySafetyAudit {
  if (!text) {
    return {
      safe: true,
      isSafeForUtility: true,
      score: 100,
      wordsFound: [],
      detectedTriggers: [],
      infractions: []
    };
  }

  const commercialTriggers = [
    { word: 'compre', reason: 'Apelo direto de compra força reclassificação para MARKETING.' },
    { word: 'comprar', reason: 'Menção a compra comercial é avaliada como MARKETING pela Meta.' },
    { word: 'desconto', reason: 'Menção a descontos financeiros aciona tarifa cara de MARKETING.' },
    { word: 'descontos', reason: 'Menção a descontos financeiros aciona tarifa cara de MARKETING.' },
    { word: 'promoção', reason: 'Termos de promoção acionam custo de MARKETING (~R$ 0,38).' },
    { word: 'promocao', reason: 'Termos de promoção acionam custo de MARKETING (~R$ 0,38).' },
    { word: 'promocoes', reason: 'Termos de promoção acionam custo de MARKETING (~R$ 0,38).' },
    { word: 'promoções', reason: 'Termos de promoção acionam custo de MARKETING (~R$ 0,38).' },
    { word: 'cupom', reason: 'Cupons são estritamente classificados como MARKETING pela Meta.' },
    { word: 'cupons', reason: 'Cupons são estritamente classificados como MARKETING pela Meta.' },
    { word: 'aproveite', reason: 'Gatilho de urgência comercial reprova categoria UTILIDADE.' },
    { word: 'imperdível', reason: 'Gatilho de vendas típico de MARKETING.' },
    { word: 'imperdivel', reason: 'Gatilho de vendas típico de MARKETING.' },
    { word: 'queima', reason: 'Expressão de liquidação comercial.' },
    { word: 'preço', reason: 'Foco em preço comercial em vez de notificação de status.' },
    { word: 'preco', reason: 'Foco em preço comercial em vez de notificação de status.' },
    { word: 'frete grátis', reason: 'Benefício promocional exclusivo de MARKETING.' },
    { word: 'frete gratis', reason: 'Benefício promocional exclusivo de MARKETING.' },
    { word: 'r$', reason: 'Valores explícitos em moeda (R$) indicam venda comercial.' },
    { word: 'off', reason: 'Percentuais de desconto (% off) indicam oferta comercial.' },
    { word: 'barato', reason: 'Adjetivo comercial de preço.' },
    { word: 'liquidação', reason: 'Liquidação de vendas aciona MARKETING.' },
    { word: 'liquidacao', reason: 'Liquidação de vendas aciona MARKETING.' },
    { word: 'black friday', reason: 'Evento promocional classificado como MARKETING.' }
  ];

  const lower = text.toLowerCase();
  const detected: string[] = [];
  const infractions: { trigger: string; reason: string }[] = [];

  for (const item of commercialTriggers) {
    let matches = false;
    if (item.word === 'r$') {
      matches = lower.includes('r$');
    } else if (item.word === 'off') {
      matches = /\b\d+%\s*off\b|\boff\b/i.test(lower);
    } else {
      const regex = new RegExp(`\\b${item.word}\\b`, 'i');
      matches = regex.test(lower);
    }

    if (matches && !detected.includes(item.word)) {
      detected.push(item.word);
      infractions.push({ trigger: item.word, reason: item.reason });
    }
  }

  const score = Math.max(0, 100 - (detected.length * 25));
  const isSafe = detected.length === 0;

  return {
    safe: isSafe,
    isSafeForUtility: isSafe,
    score,
    wordsFound: detected,
    detectedTriggers: detected,
    infractions,
    warningMessage: isSafe
      ? undefined
      : `Gatilhos comerciais detectados (${detected.join(', ')}). A Meta reclassificará este template para MARKETING (tarifa mais cara). Recomendamos reescrever no formato de Notificação/Alerta informativo.`
  };
}

/**
 * Modelos pré-prontos homologados no padrão UTILIDADE para Pokémon TCG
 */
export const PRESET_UTILITY_TEMPLATES = [
  {
    nome: 'pokemon_tcg_comunicado_membros',
    name: 'pokemon_tcg_comunicado_membros',
    categoria: 'UTILITY' as const,
    category: 'UTILITY' as const,
    titulo: '💼 Notificação de Membros da Comunidade',
    corpo: 'Olá {{1}}, este é um comunicado informativo da Comunidade Pokémon TCG. A lista de atualizações e disponibilidade de itens colecionáveis foi renovada. Você pode conferir os informativos completos pelo link: {{2}}',
    body: 'Olá {{1}}, este é um comunicado informativo da Comunidade Pokémon TCG. A lista de atualizações e disponibilidade de itens colecionáveis foi renovada. Você pode conferir os informativos completos pelo link: {{2}}',
    exemplos: ['Treinador', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo'],
    exampleValues: ['Treinador', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo']
  },
  {
    nome: 'pokemon_tcg_alerta_monitoramento',
    name: 'pokemon_tcg_alerta_monitoramento',
    categoria: 'UTILITY' as const,
    category: 'UTILITY' as const,
    titulo: '💼 Alerta de Monitoramento de Itens',
    corpo: 'Olá {{1}}, conforme seu interesse em colecionáveis de Pokémon TCG, informamos que o status dos produtos monitorados na nossa comunidade foi atualizado hoje. Acesse para visualizar os detalhes: {{2}}',
    body: 'Olá {{1}}, conforme seu interesse em colecionáveis de Pokémon TCG, informamos que o status dos produtos monitorados na nossa comunidade foi atualizado hoje. Acesse para visualizar os detalhes: {{2}}',
    exemplos: ['Rodrigo', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo'],
    exampleValues: ['Rodrigo', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo']
  },
  {
    nome: 'pokemon_tcg_confirmacao_notificacoes',
    name: 'pokemon_tcg_confirmacao_notificacoes',
    categoria: 'UTILITY' as const,
    category: 'UTILITY' as const,
    titulo: '💼 Confirmação de Acesso aos Avisos',
    corpo: 'Olá {{1}}, confirmamos o seu registro na lista de notificações da comunidade Pokémon TCG. O acesso aos informativos e alertas diários já está disponível pelo link oficial: {{2}}',
    body: 'Olá {{1}}, confirmamos o seu registro na lista de notificações da comunidade Pokémon TCG. O acesso aos informativos e alertas diários já está disponível pelo link oficial: {{2}}',
    exemplos: ['Amigo Colecionador', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo'],
    exampleValues: ['Amigo Colecionador', 'https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo']
  },
  {
    nome: 'pokemon_tcg_atendimento_suporte',
    name: 'pokemon_tcg_atendimento_suporte',
    categoria: 'UTILITY' as const,
    category: 'UTILITY' as const,
    titulo: '💼 Notificação de Suporte e Atendimento',
    corpo: 'Olá {{1}}, aqui é o atendimento do Eduardo sobre colecionáveis Pokémon TCG. Caso precise de assistência sobre cartas, boxes ou produtos colecionáveis, nosso canal direto está à disposição: {{2}}',
    body: 'Olá {{1}}, aqui é o atendimento do Eduardo sobre colecionáveis Pokémon TCG. Caso precise de assistência sobre cartas, boxes ou produtos colecionáveis, nosso canal direto está à disposição: {{2}}',
    exemplos: ['Eduardo', 'https://wa.me/5549998095955'],
    exampleValues: ['Eduardo', 'https://wa.me/5549998095955']
  }
];

/**
 * Otimizador com IA para transformar mensagens comerciais em Templates de Utilidade da Meta
 */
export async function optimizeTemplateForUtility(
  rawText: string,
  deepseekKey?: string,
  deepseekBaseUrl = 'https://opencode.ai/zen/go/v1',
  deepseekModel = 'deepseek-v4-flash'
): Promise<string> {
  if (!rawText || !rawText.trim()) return '';

  if (deepseekKey && deepseekKey.trim()) {
    try {
      const prompt = `Você é um engenheiro especialista nas diretrizes oficiais da WhatsApp Business Cloud API da Meta.
Sua missão é reescrever a mensagem fornecida abaixo para que ela seja 100% APROVADA NA CATEGORIA "UTILIDADE" (UTILITY), pagando metade da tarifa da Meta.

REGRAS RÍGIDAS DE UTILIDADE DA META:
1. PROIBIDO usar palavras comerciais diretas: "compre", "promoção", "desconto", "cupom", "oferta", "aproveite", "imperdível", "preço baixo", "R$".
2. O tom deve ser estritamente de NOTIFICAÇÃO INFORMATIVA, ALERTA DE STATUS SOLICITADO ou ATUALIZAÇÃO DE COMUNIDADE.
3. Use a variável {{1}} para o nome da pessoa e {{2}} para o link de acesso.
4. Mantenha a mensagem natural, clara, amigável e em português do Brasil.
5. Retorne APENAS o texto reescrito do template pronto, sem introduções ou explicações.

Mensagem original para transformar em Utilidade:
"""
${rawText}
"""`;

      const res = await fetch(`${deepseekBaseUrl.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${deepseekKey}`
        },
        body: JSON.stringify({
          model: deepseekModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 400
        })
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        const textRes = data?.choices?.[0]?.message?.content?.trim();
        if (textRes) {
          return textRes.replace(/^["'`]+|["'`]+$/g, '').trim();
        }
      }
    } catch (err) {
      console.warn('[Meta Cloud] Falha na otimização com IA, usando heurística de utilidade:', err);
    }
  }

  // Heurística de fallback caso a IA esteja sem chave ou offline
  let sanitized = rawText
    .replace(/compre\s+agora|compre|comprar/gi, 'verifique os detalhes')
    .replace(/promo[çc][aã]o|promo[çc][oõ]es|ofertas?|descontos?/gi, 'atualizações informativas')
    .replace(/cupo(?:m|ns)/gi, 'código de acesso')
    .replace(/aproveite|n[aã]o\s+perca/gi, 'acompanhe');

  if (!sanitized.includes('{{1}}')) {
    sanitized = `Olá {{1}}, aviso informativo da Comunidade Pokémon TCG: ${sanitized}`;
  }

  return sanitized;
}

/**
 * Testa a conexão com a WhatsApp Business Cloud API da Meta
 */
export async function testMetaConnection(
  token: string,
  phoneNumberId: string,
  apiVersion = 'v21.0'
): Promise<MetaConnectionResult> {
  if (!token || !phoneNumberId) {
    return { ok: false, error: 'Token de Acesso e ID do Número de Telefone são obrigatórios.' };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=id,verified_name,display_phone_number,quality_rating`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Erro HTTP ${res.status} retornado pela Meta.`;
      return { ok: false, error: errorMsg };
    }

    return {
      ok: true,
      verifiedName: data.verified_name || 'Nome não configurado',
      displayPhoneNumber: data.display_phone_number || phoneNumberId,
      qualityRating: data.quality_rating || 'UNKNOWN'
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao conectar com a Meta Graph API.' };
  }
}

/**
 * Submete um novo template de mensagem para validação e aprovação na Meta
 */
export async function submitMetaTemplate(
  params: SubmitTemplateParams,
  apiVersion = 'v21.0'
): Promise<{ ok: boolean; templateId?: string; status?: string; error?: string }> {
  const { token, wabaId, name, category, language = 'pt_BR', bodyText, exampleVariables } = params;

  if (!token || !wabaId) {
    return { ok: false, error: 'Token de Acesso e WABA ID são obrigatórios.' };
  }

  const cleanName = formatMetaTemplateName(name);
  if (!cleanName || cleanName.length < 2) {
    return { ok: false, error: 'Nome do template inválido (use apenas letras minúsculas e sublinhado).' };
  }

  try {
    const components: any[] = [
      {
        type: 'BODY',
        text: bodyText
      }
    ];

    // Se houver variáveis {{1}}, {{2}}... a Meta exige a propriedade example.body_text
    const varMatches = bodyText.match(/\{\{(\d+)\}\}/g);
    if (varMatches && varMatches.length > 0) {
      const examples = exampleVariables && exampleVariables.length >= varMatches.length
        ? exampleVariables
        : varMatches.map((_, i) => (i === 0 ? 'Treinador' : 'https://wa.me/suporte'));

      components[0].example = {
        body_text: [examples]
      };
    }

    const payload = {
      name: cleanName,
      category,
      language,
      components
    };

    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Falha na Meta: código ${res.status}`;
      return { ok: false, error: errorMsg };
    }

    // Salvar no banco local com status PENDING / APPROVED
    const initialStatus = (data.status || 'PENDING').toUpperCase() as MetaTemplate['status'];
    saveMetaTemplate({
      meta_id: data.id || `meta_${Date.now()}`,
      nome: cleanName,
      categoria: category,
      idioma: language,
      status: initialStatus,
      corpo_texto: bodyText,
      exemplo_variaveis: exampleVariables ? JSON.stringify(exampleVariables) : undefined,
      sincronizado_em: new Date().toISOString()
    });

    return {
      ok: true,
      templateId: data.id,
      status: initialStatus
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao submeter template para a Meta.' };
  }
}

/**
 * Consulta e sincroniza todos os templates da WABA na Meta Graph API
 */
export async function syncMetaTemplates(
  token: string,
  wabaId: string,
  apiVersion = 'v21.0'
): Promise<{ ok: boolean; totalSincronizados: number; error?: string }> {
  if (!token || !wabaId) {
    return { ok: false, totalSincronizados: 0, error: 'Credenciais da Meta não configuradas.' };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Erro HTTP ${res.status} ao sincronizar templates.`;
      return { ok: false, totalSincronizados: 0, error: errorMsg };
    }

    const templates = data?.data || [];
    let sincronizados = 0;

    for (const t of templates) {
      const bodyComp = (t.components || []).find((c: any) => c.type === 'BODY');
      const corpoTexto = bodyComp?.text || '';
      const statusMeta = (t.status || 'PENDING').toUpperCase() as MetaTemplate['status'];
      const categoriaMeta = (t.category || 'UTILITY').toUpperCase() as 'UTILITY' | 'MARKETING';

      saveMetaTemplate({
        meta_id: t.id,
        nome: t.name,
        categoria: categoriaMeta,
        idioma: t.language || 'pt_BR',
        status: statusMeta,
        motivo_rejeicao: t.rejected_reason || undefined,
        corpo_texto: corpoTexto,
        sincronizado_em: new Date().toISOString()
      });
      sincronizados++;
    }

    return { ok: true, totalSincronizados: sincronizados };
  } catch (err: any) {
    return { ok: false, totalSincronizados: 0, error: err?.message || 'Falha ao sincronizar templates.' };
  }
}

/**
 * Deleta um template de mensagem na Meta Graph API e no banco local
 */
export async function deleteMetaTemplate(
  token: string,
  wabaId: string,
  name: string,
  apiVersion = 'v21.0'
): Promise<{ ok: boolean; error?: string }> {
  if (!token || !wabaId || !name) {
    return { ok: false, error: 'Parâmetros incompletos para exclusão de template.' };
  }

  try {
    const url = `https://graph.facebook.com/${apiVersion}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = (await res.json()) as any;

    if (!res.ok && res.status !== 404) {
      const errorMsg = data?.error?.message || `Erro HTTP ${res.status} ao excluir template na Meta.`;
      return { ok: false, error: errorMsg };
    }

    deleteMetaTemplateFromDb(name);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha ao conectar com a Meta para excluir template.' };
  }
}

/**
 * Envia mensagem oficial de template via WhatsApp Business Cloud API
 */
export async function sendMetaTemplateMessage(
  params: SendTemplateMessageParams,
  apiVersion = 'v21.0'
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { token, phoneNumberId, to, templateName, languageCode = 'pt_BR', bodyParameters = [] } = params;

  if (!token || !phoneNumberId || !to || !templateName) {
    return { ok: false, error: 'Parâmetros obrigatórios de envio ausentes.' };
  }

  // Normalizar número de telefone (apenas dígitos, sem '@s.whatsapp.net')
  const cleanPhone = to.replace(/@.*$/, '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return { ok: false, error: `Número de telefone destinatário inválido: "${to}"` };
  }

  try {
    const components: any[] = [];
    if (bodyParameters && bodyParameters.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParameters.map((param) => ({
          type: 'text',
          text: String(param || '')
        }))
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components.length > 0 ? components : undefined
      }
    };

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = (await res.json()) as any;

    if (!res.ok) {
      const errorMsg = data?.error?.message || `Falha no envio da Meta: código ${res.status}`;
      return { ok: false, error: errorMsg };
    }

    const msgId = data?.messages?.[0]?.id || 'meta_ok';
    return { ok: true, messageId: msgId };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede ao disparar template pela Meta.' };
  }
}
