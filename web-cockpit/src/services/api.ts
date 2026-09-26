import type {
  UnifiedStatus,
  OfertaLog,
  RotaGrupo,
  LeadContact,
  Campanha,
  BalancoFinanceiro,
  ResumoDespesasPdf,
  UploadPlanilhaFinancas,
  MetaTemplate,
  WarmupStatus,
  LogSistema,
  FluxoHorarioItem
} from '../types/index.ts';

// Helper genérico para requests com tratamento de erro
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
      }
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || `Erro HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Status Unificado da Plataforma & Fluxo Horário Real
  getUnifiedStatus: () => request<UnifiedStatus>('/api/unified-status'),
  getFluxoHorario: async (): Promise<FluxoHorarioItem[]> => {
    try {
      const res = await request<{ ok: boolean; data: FluxoHorarioItem[] }>('/api/dashboard/fluxo-horario');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  // --- REPLICADOR DE OFERTAS ---
  getReplicaLogs: async (limit = 80): Promise<OfertaLog[]> => {
    try {
      const raw = await request<any[]>(`/api/logs?limit=${limit}`);
      if (!Array.isArray(raw)) return [];
      return raw.map(l => ({
        id: Number(l.id),
        origem: String(l.origem || l.origem_nome || l.origem_chat_id || 'Grupo Desconhecido'),
        destino: String(l.destino || l.destino_chat_id || 'Destino'),
        texto: String(l.texto || l.texto_publicado || l.texto_original || ''),
        foto_url: l.foto_url || (l.tem_foto ? '/foto' : null),
        status: (l.status === 'enviado' ? 'enviado' : 'ignorado') as 'enviado' | 'ignorado',
        motivo: l.motivo || l.motivo_ignorado || null,
        criado_em: String(l.criado_em || l.timestamp || new Date().toISOString())
      }));
    } catch {
      return [];
    }
  },
  getRotas: async (): Promise<RotaGrupo[]> => {
    try {
      const raw = await request<any[]>('/api/rotas');
      if (!Array.isArray(raw)) return [];
      return raw.map(r => ({
        id: Number(r.id),
        nome: String(r.nome || `Rota #${r.id}`),
        ativa: Boolean(r.ativa ?? r.ativo),
        ativo: Boolean(r.ativa ?? r.ativo),
        origens: Array.isArray(r.origens) ? r.origens : (r.origem_id ? [r.origem_id] : []),
        destinos: Array.isArray(r.destinos) ? r.destinos : (r.destino_id ? [r.destino_id] : []),
        origem_id: String(r.origem_id || (Array.isArray(r.origens) && r.origens[0]) || ''),
        origem_nome: String(r.origem_nome || r.nome || 'Grupo de Origem'),
        destino_id: String(r.destino_id || (Array.isArray(r.destinos) && r.destinos[0]) || ''),
        destino_nome: String(r.destino_nome || (Array.isArray(r.destinos) && r.destinos.length > 1 ? `${r.destinos.length} destinos` : 'Destino')),
        criada_em: String(r.criada_em || '')
      }));
    } catch {
      return [];
    }
  },
  toggleRota: (id: number, ativo: boolean) =>
    request<{ ok: boolean }>(`/api/rotas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo })
    }),
  getReplicaConfig: () => request<Record<string, string>>('/api/configs'),
  saveReplicaConfig: (configs: Record<string, string>) =>
    request<{ ok: boolean }>('/api/configs', {
      method: 'POST',
      body: JSON.stringify(configs)
    }),
  renewCookie: (cookie: string) =>
    request<{ ok: boolean; message: string }>('/api/afiliados/cookie', {
      method: 'POST',
      body: JSON.stringify({ cookie })
    }),
  gerarAnuncio: (dados: { link: string; precoDe?: number; precoPor?: number; cupom?: string; templateId?: number }) =>
    request<{ ok: boolean; mensagem: string; fotoUrl?: string }>('/api/gerador/anuncio', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  dispararAnuncio: (mensagem: string, fotoUrl?: string) =>
    request<{ ok: boolean; enviados: number }>('/api/gerador/disparar', {
      method: 'POST',
      body: JSON.stringify({ mensagem, fotoUrl })
    }),

  // --- BOT DISPARADOR: GRUPOS & LEADS ---
  getBotGrupos: () => request<{ grupos: Array<{ id: string; nome: string; total_membros?: number }> }>('/api/bot/grupos').then(r => r.grupos || []),
  syncBotGrupos: () => request<{ ok: boolean; total: number; grupos: any[] }>('/api/bot/grupos/sync', { method: 'POST' }),
  extractGrupoMembros: (groupJid: string, pastaNome: string) =>
    request<{ ok: boolean; total: number; inseridos: number }>('/api/bot/grupos/extract', {
      method: 'POST',
      body: JSON.stringify({ groupJid, pasta: pastaNome })
    }),
  getLeads: (pasta = '', busca = '', limit = 150) =>
    request<{ contatos: LeadContact[]; total: number }>(`/api/bot/contatos?pasta=${encodeURIComponent(pasta)}&busca=${encodeURIComponent(busca)}&limit=${limit}`).then(r => r.contatos || []),
  getPastasLeads: () => request<{ pastas: Array<{ pasta: string; total: number }> }>('/api/bot/contatos/pastas').then(r => r.pastas || []),
  importLeads: (rawText: string, pastaNome: string) =>
    request<{ ok: boolean; totalImported: number; pasta: string }>('/api/bot/contatos/import', {
      method: 'POST',
      body: JSON.stringify({ rawText, pastaNome })
    }),
  deleteLead: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/contatos/${id}`, { method: 'DELETE' }),
  deletePastaLeads: (pastaNome: string) =>
    request<{ ok: boolean; totalDeleted: number }>('/api/bot/contatos/pasta', {
      method: 'DELETE',
      body: JSON.stringify({ pastaNome })
    }),
  exportarLeadsCsv: (pasta = '', formato = 'meta') => {
    window.open(`/api/bot/contatos/export?pasta=${encodeURIComponent(pasta)}&formato=${formato}`, '_blank');
  },

  // --- BOT DISPARADOR: CAMPANHAS & ANTI-BAN ---
  getCampanhas: () => request<{ campanhas: Campanha[] }>('/api/bot/campanhas').then(r => r.campanhas || []),
  createCampanha: (dados: {
    nome: string;
    mensagemTemplate: string;
    canalEnvio: 'baileys' | 'meta_cloud';
    targetType: 'pasta' | 'grupo';
    targetPastaNome?: string;
    targetGroupJid?: string;
    metaTemplateNome?: string;
  }) =>
    request<{ ok: boolean; id: number }>('/api/bot/campanhas', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  startCampanha: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/campanhas/${id}/start`, { method: 'POST' }),
  pauseCampanha: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/campanhas/${id}/pause`, { method: 'POST' }),
  cancelCampanha: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/campanhas/${id}/cancel`, { method: 'POST' }),
  deleteCampanha: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/campanhas/${id}`, { method: 'DELETE' }),
  getWarmupStatus: () =>
    request<{ warmup: WarmupStatus }>('/api/bot/warmup').then(r => r.warmup),
  resetWarmup: () =>
    request<{ ok: boolean; warmup: WarmupStatus }>('/api/bot/warmup/reset', { method: 'POST' }),
  getBotConfigs: () => request<Record<string, string>>('/api/bot/config'),
  saveBotConfigs: (configs: Record<string, string>) =>
    request<{ ok: boolean }>('/api/bot/config', {
      method: 'POST',
      body: JSON.stringify(configs)
    }),
  getBotLogs: (limit = 100) =>
    request<{ logs: LogSistema[] }>(`/api/bot/logs?limit=${limit}`).then(r => r.logs || []),

  // --- BOT DISPARADOR: META CLOUD API OFICIAL ---
  getMetaStatus: () =>
    request<{
      ativo: boolean;
      configured: boolean;
      wabaId: string;
      phoneNumberId: string;
      apiVersion: string;
      hasToken: boolean;
      templatesCount: { total: number; aprovados: number; pendentes: number; rejeitados: number };
    }>('/api/bot/meta/status'),
  saveMetaConfig: (dados: {
    ativo?: boolean;
    token?: string;
    wabaId?: string;
    phoneNumberId?: string;
    apiVersion?: string;
  }) =>
    request<{ ok: boolean }>('/api/bot/meta/config', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  testMetaConnection: () =>
    request<{ ok: boolean; message?: string; error?: string }>('/api/bot/meta/test-connection', { method: 'POST' }),
  getMetaTemplates: () =>
    request<{ templates: MetaTemplate[]; presets: any[] }>('/api/bot/meta/templates').then(r => r.templates || []),
  syncMetaTemplates: () =>
    request<{ ok: boolean; totalSincronizados: number; templates: MetaTemplate[] }>('/api/bot/meta/templates/sync', { method: 'POST' }),
  submitMetaTemplate: (dados: {
    name: string;
    category: 'UTILITY' | 'MARKETING';
    bodyText: string;
    exampleVariables?: string;
  }) =>
    request<{ ok: boolean; templateId?: string; status?: string; error?: string }>('/api/bot/meta/templates', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  deleteMetaTemplate: (nome: string) =>
    request<{ ok: boolean }>(`/api/bot/meta/templates/${encodeURIComponent(nome)}`, { method: 'DELETE' }),

  // --- FINANÇAS & DRE META ADS / MERCADO LIVRE ---
  getFinancasMeses: () =>
    request<{ ok: boolean; meses: string[] }>('/api/bot/financas/meses').then(r => r.meses || []),
  getBalanco: (mes: string) =>
    request<{ ok: boolean; balanco: BalancoFinanceiro }>(`/api/bot/financas/balanco?mes=${encodeURIComponent(mes)}`).then(r => r.balanco),
  getLancamentos: (mes: string) =>
    request<{ ok: boolean; balanco: BalancoFinanceiro }>(`/api/bot/financas/balanco?mes=${encodeURIComponent(mes)}`).then(r => r.balanco?.itens || []),
  addLancamento: (dados: {
    dataLancamento: string;
    gastoCampanhas: number;
    lucroBruto: number;
    descricao?: string;
    categoria?: string;
  }) =>
    request<{ ok: boolean; id: number }>('/api/bot/financas/lancamento', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  deleteLancamento: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/financas/lancamento/${id}`, { method: 'DELETE' }),
  getDespesasPdf: (inicio = '', fim = '') =>
    request<{ ok: boolean; resumo: ResumoDespesasPdf }>(`/api/bot/financas/despesas?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`).then(r => r.resumo),
  deleteDespesaPdf: (id: number) =>
    request<{ ok: boolean; message: string }>(`/api/bot/financas/despesas/${id}`, { method: 'DELETE' }),
  uploadDespesaPdf: async (formData: FormData) => {
    const res = await fetch('/api/bot/financas/despesas/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha no upload da fatura PDF');
    }
    return res.json() as Promise<{ ok: boolean; message: string; despesaId: number }>;
  },
  getUploadsPlanilhas: (mes = '') =>
    request<{ ok: boolean; uploads: UploadPlanilhaFinancas[] }>(`/api/bot/financas/uploads?mes=${encodeURIComponent(mes)}`).then(r => r.uploads || []),
  deleteUploadPlanilha: (id: number) =>
    request<{ ok: boolean; message: string }>(`/api/bot/financas/upload/${id}`, { method: 'DELETE' }),
  uploadPlanilhaSemanal: async (formData: FormData) => {
    const res = await fetch('/api/bot/financas/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha no upload da planilha');
    }
    return res.json() as Promise<{ ok: boolean; message: string; uploadId: number }>;
  },
  exportarBalancoCsv: (mes: string) => {
    window.open(`/api/bot/financas/exportar-csv?mes=${encodeURIComponent(mes)}`, '_blank');
  },
  exportarDespesasPdfCsv: (inicio = '', fim = '') => {
    window.open(`/api/bot/financas/despesas/exportar-csv?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`, '_blank');
  },

  // --- ATENDIMENTO IA (DEEPSEEK) ---
  testDeepSeek: (mensagem: string, promptSistema?: string) =>
    request<{ ok: boolean; pergunta?: string; resposta?: string; message?: string }>('/api/bot/deepseek/test', {
      method: 'POST',
      body: JSON.stringify({ prompt: mensagem, promptSistema })
    }),

  // --- LOGOUT UNIFICADO ---
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
};

