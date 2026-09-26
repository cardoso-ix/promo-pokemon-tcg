import type {
  UnifiedStatus,
  OfertaLog,
  RotaGrupo,
  LeadContact,
  Campanha,
  BalancoFinanceiro,
  LancamentoDiario,
  MetaTemplate
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
      // Redireciona para o login se a sessão expirar
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
  // Status Unificado da Plataforma
  getUnifiedStatus: () => request<UnifiedStatus>('/api/unified-status'),

  // --- REPLICADOR DE OFERTAS ---
  getReplicaLogs: (limit = 60) => request<OfertaLog[]>(`/api/logs?limit=${limit}`),
  getRotas: () => request<RotaGrupo[]>('/api/rotas'),
  toggleRota: (id: number, ativo: boolean) =>
    request<{ ok: boolean }>(`/api/rotas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo })
    }),
  getReplicaConfig: () => request<Record<string, string>>('/api/config'),
  saveReplicaConfig: (configs: Record<string, string>) =>
    request<{ ok: boolean }>('/api/config', {
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

  // --- BOT DISPARADOR & LEADS ---
  getBotGrupos: () => request<Array<{ id: string; nome: string; total_membros?: number }>>('/api/bot/grupos'),
  syncBotGrupos: () => request<{ ok: boolean; grupos: number }>('/api/bot/grupos/sync', { method: 'POST' }),
  extractGrupoMembros: (grupoId: string, pastaNome: string) =>
    request<{ ok: boolean; contatos: number }>('/api/bot/grupos/extract', {
      method: 'POST',
      body: JSON.stringify({ grupoId, pasta: pastaNome })
    }),
  getLeads: (pasta = '', busca = '', limit = 150) =>
    request<LeadContact[]>(`/api/bot/contatos?pasta=${encodeURIComponent(pasta)}&busca=${encodeURIComponent(busca)}&limit=${limit}`),
  getPastasLeads: () => request<Array<{ pasta: string; total: number }>>('/api/bot/contatos/pastas'),
  importLeads: (contatos: Array<{ jid: string; nome?: string; pasta: string }>) =>
    request<{ ok: boolean; inseridos: number }>('/api/bot/contatos/import', {
      method: 'POST',
      body: JSON.stringify({ contatos })
    }),
  deleteLead: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/contatos/${id}`, { method: 'DELETE' }),

  // --- CAMPANHAS & META CLOUD ---
  getCampanhas: () => request<Campanha[]>('/api/bot/campanhas'),
  createCampanha: (dados: { nome: string; pasta: string; template: string; canal_envio: string; meta_template_nome?: string }) =>
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
  getMetaTemplates: () => request<MetaTemplate[]>('/api/bot/meta/templates'),

  // --- FINANÇAS META ADS & DRE ---
  getFinancasMeses: () =>
    request<{ ok: boolean; meses: string[] }>('/api/bot/financas/meses').then(r => r.meses || []),
  getBalanco: (mes: string) => request<BalancoFinanceiro>(`/api/bot/financas/balanco?mes=${encodeURIComponent(mes)}`),
  getLancamentos: (mes: string) => request<LancamentoDiario[]>(`/api/bot/financas/relatorio?mes=${encodeURIComponent(mes)}`),
  addLancamento: (dados: { data: string; tipo: string; descricao: string; valor: number }) =>
    request<{ ok: boolean }>('/api/bot/financas/lancamento', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  deleteLancamento: (id: number) =>
    request<{ ok: boolean }>(`/api/bot/financas/lancamento/${id}`, { method: 'DELETE' }),
  uploadFatura: async (formData: FormData) => {
    const res = await fetch('/api/bot/financas/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Falha no upload do arquivo financeiro');
    return res.json() as Promise<{ ok: boolean; message: string }>;
  },

  // --- ATENDIMENTO IA (DEEPSEEK) ---
  testDeepSeek: (mensagem: string) =>
    request<{ ok: boolean; resposta: string }>('/api/bot/deepseek/test', {
      method: 'POST',
      body: JSON.stringify({ mensagem })
    }),

  // --- LOGOUT UNIFICADO ---
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
};
