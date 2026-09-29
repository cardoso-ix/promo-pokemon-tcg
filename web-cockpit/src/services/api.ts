import type {
  UnifiedStatus,
  OfertaLog,
  RotaGrupo,
  BalancoFinanceiro,
  ResumoDespesasPdf,
  UploadPlanilhaFinancas,
  FluxoHorarioItem,
  MetaInsightsOverview,
  MeliOrdersOverview,
  MeliAffiliateOverview,
  ProdutoValorConsolidado,
  RegistroHistoricoProduto,
  BenchmarkPrecoProduto,
  MetaAdBalanceInfo
} from '../types/index.ts';

// Helper genérico para requests com tratamento de erro e resiliência
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const method = (options?.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {})
  };

  // Suporte a autenticação híbrida via Bearer token para navegadores móveis com restrição de cookies
  if (!headers['Authorization'] && typeof window !== 'undefined') {
    try {
      const localToken = localStorage.getItem('promo_token');
      if (localToken) {
        headers['Authorization'] = `Bearer ${localToken}`;
      }
    } catch {
      // Ignorar caso localStorage não esteja acessível
    }
  }

  let body = options?.body;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (body === undefined || body === null) {
      body = '{}';
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    body
  });

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
      }
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || `Erro HTTP ${response.status}`);
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

  // --- META ADS: GASTOS & INSIGHTS ---
  getMetaInsights: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<MetaInsightsOverview>(`/api/dashboard/meta-insights${query}`);
  },
  saveMetaAdsConfig: (dados: { accessToken: string; accountId: string; syncNow?: boolean }) =>
    request<{ ok: boolean; message: string; sync?: any }>('/api/integrations/meta/config', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  syncMetaInsights: (since?: string, until?: string, accountId?: string) =>
    request<{ ok: boolean; totalSincronizados: number }>('/api/integrations/meta/sync', {
      method: 'POST',
      body: JSON.stringify({ since, until, accountId })
    }),
  getMetaBalance: (accountId?: string) => {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
    return request<{ ok: boolean; data: MetaAdBalanceInfo }>(`/api/integrations/meta/balance${query}`);
  },
  updateMetaBalance: (dados: {
    saldo?: number;
    recarga?: number;
    descricao?: string;
    threshold?: number;
    mode?: 'hybrid' | 'auto' | 'manual';
  }) =>
    request<{ ok: boolean; message: string; data: MetaAdBalanceInfo }>('/api/integrations/meta/balance', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),

  // --- MERCADO LIVRE: VENDAS, PEDIDOS & WEBHOOK EM TEMPO REAL ---
  getMeliInsights: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<MeliOrdersOverview>(`/api/dashboard/meli-insights${query}`);
  },
  getMeliConfig: () =>
    request<{ ok: boolean; configured: boolean; userId: string; clientId: string; webhookUrl: string; tokenExpiresAt: string }>('/api/integrations/meli/config'),
  saveMeliConfig: (dados: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    userId?: number;
    syncNow?: boolean;
  }) =>
    request<{ ok: boolean; message: string; sync?: any }>('/api/integrations/meli/config', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  getMeliAuthUrl: () =>
    request<{ ok: boolean; authUrl: string }>('/api/integrations/meli/auth-url'),
  syncMeliOrders: (days = 30) =>
    request<{ ok: boolean; totalProcessados: number; totalEncontrados: number }>('/api/integrations/meli/sync', {
      method: 'POST',
      body: JSON.stringify({ days })
    }),
  getMeliAffiliateMetrics: (refresh = false) =>
    request<{ ok: boolean; connected?: boolean; data: MeliAffiliateOverview }>(`/api/dashboard/meli-affiliate${refresh ? '?refresh=true' : ''}`),
  syncMeliAffiliate: (dados?: { cookie?: string }) =>
    request<{ ok: boolean; connected?: boolean; message: string; data: MeliAffiliateOverview }>('/api/integrations/meli-affiliate/sync', {
      method: 'POST',
      body: JSON.stringify(dados || {})
    }),
  syncAll: () =>
    request<{ ok: boolean; message: string; meta?: any; affiliate?: any; meliOrders?: any; timestamp: string }>('/api/integrations/sync-all', {
      method: 'POST',
      body: JSON.stringify({})
    }),

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
  saveRota: (dados: { id?: number; nome: string; ativa?: boolean; origens: string[]; destinos: string[] }) => {
    const cleanOrigens = Array.isArray(dados.origens)
      ? Array.from(new Set(dados.origens.map(o => String(o || '').trim()).filter(Boolean)))
      : [];
    const cleanDestinos = Array.isArray(dados.destinos)
      ? Array.from(new Set(dados.destinos.map(d => String(d || '').trim()).filter(Boolean)))
      : [];
    return request<{ ok: boolean; id: number }>('/api/rotas', {
      method: 'POST',
      body: JSON.stringify({
        ...dados,
        nome: dados.nome.trim(),
        origens: cleanOrigens,
        destinos: cleanDestinos
      })
    });
  },
  deleteRota: (id: number) =>
    request<{ ok: boolean }>(`/api/rotas/${id}`, {
      method: 'DELETE'
    }),
  getChats: async (): Promise<Array<{ id: string; chat_id: string; nome: string; total_membros?: number }>> => {
    try {
      const raw = await request<any[]>('/api/chats');
      if (!Array.isArray(raw)) return [];
      return raw.map(c => {
        const id = String(c.id || c.chat_id || '');
        return {
          id,
          chat_id: id,
          nome: String(c.nome || c.name || id || 'Grupo'),
          total_membros: c.total_membros
        };
      }).filter(c => Boolean(c.id));
    } catch {
      return [];
    }
  },
  syncChats: async (): Promise<{ ok: boolean; total: number; chats: Array<{ id: string; chat_id: string; nome: string }> }> => {
    try {
      const res = await request<any>('/api/chats/sync', { method: 'POST' });
      const list = Array.isArray(res?.chats) ? res.chats : [];
      const chats = list.map((c: any) => {
        const id = String(c.id || c.chat_id || '');
        return {
          id,
          chat_id: id,
          nome: String(c.nome || c.name || id || 'Grupo')
        };
      }).filter((c: any) => Boolean(c.id));
      return { ok: true, total: chats.length, chats };
    } catch {
      return { ok: false, total: 0, chats: [] };
    }
  },
  getReplicaConfig: () => request<Record<string, string>>('/api/configs'),
  saveReplicaConfig: (configs: Record<string, string>) =>
    request<{ ok: boolean }>('/api/configs', {
      method: 'POST',
      body: JSON.stringify(configs)
    }),
  getAgendadorStatus: () =>
    request<{
      ativo: boolean;
      horario: string;
      texto: string;
      modelos: Array<{ id: string; nome: string; icone: string; descricao: string; texto: string }>;
      previa: string;
      ultimoEnvio: string;
      horaAtualBrasilia: string;
      dataFormatadaBrasilia: string;
      diaSemana: string;
      destinosCount: number;
      destinos: string[];
    }>('/api/agendador/status'),
  saveAgendadorConfig: (dados: { ativo?: boolean; horario?: string; texto?: string }) =>
    request<{ ok: boolean; message: string }>('/api/agendador/config', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  testarAgendador: () =>
    request<{ ok: boolean; totalEnviados?: number; message?: string; error?: string }>('/api/agendador/testar', {
      method: 'POST'
    }),
  renewCookie: (cookie: string) =>
    request<{ ok: boolean; message: string; sessionExpired?: boolean; data?: MeliAffiliateOverview }>('/api/afiliados/cookie', {
      method: 'POST',
      body: JSON.stringify({ cookie })
    }),
  saveMeliAffiliateManual: (dados: {
    commissionsToday: number;
    ordersToday: number;
    totalSalesToday?: number;
    clicksToday?: number;
    buyersToday?: number;
    productsEstimatedToday?: number;
    unrealizedSalesToday?: number;
  }) =>
    request<{ ok: boolean; message: string; data: MeliAffiliateOverview }>('/api/dashboard/meli-affiliate/manual', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  gerarAnuncio: (dados: { link: string; precoDe?: number; precoPor?: number; cupom?: string; templateId?: number }) =>
    request<{
      ok: boolean;
      mensagem: string;
      textoGerado?: string;
      fotoUrl?: string;
      imageUrl?: string;
      titulo?: string;
      linkAfiliado?: string;
      precoDe?: string;
      precoPor?: string;
      cupom?: string;
    }>('/api/gerador/anuncio', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  dispararAnuncio: (mensagem: string, fotoUrl?: string, destinos?: string[]) =>
    request<{
      ok: boolean;
      enviados: number;
      totalEnviados?: number;
      totalDestinos?: number;
      falhas?: string[];
      message?: string;
    }>('/api/gerador/disparar', {
      method: 'POST',
      body: JSON.stringify({ mensagem, fotoUrl, destinos })
    }),

  // --- BASE DE PREÇOS TCG (PLANILHA DE PRODUTOS NATIVA) ---
  getProdutosValores: (busca = '', limite = 100, offset = 0) =>
    request<{
      ok: boolean;
      itens: ProdutoValorConsolidado[];
      total: number;
      limite: number;
      offset: number;
    }>(`/api/produtos-valores?busca=${encodeURIComponent(busca)}&limite=${limite}&offset=${offset}`),

  getBenchmarkPreco: (termo: string) =>
    request<{
      ok: boolean;
      benchmark: BenchmarkPrecoProduto;
    }>(`/api/produtos-valores/benchmark?termo=${encodeURIComponent(termo)}`),

  getExtratoProdutoValores: (produto: string, limite = 50) =>
    request<{
      ok: boolean;
      registros: RegistroHistoricoProduto[];
    }>(`/api/produtos-valores/extrato?produto=${encodeURIComponent(produto)}&limite=${limite}`),

  migrarProdutosValores: () =>
    request<{
      ok: boolean;
      inseridos: number;
      message: string;
    }>('/api/produtos-valores/migrar', { method: 'POST' }),

  // --- FINANÇAS & DRE META ADS / MERCADO LIVRE ---
  getFinancasMeses: () =>
    request<{ ok: boolean; meses: string[] }>('/api/financas/meses').then(r => r.meses || []),
  getBalanco: (mes: string) =>
    request<{ ok: boolean; balanco: BalancoFinanceiro }>(`/api/financas/balanco?mes=${encodeURIComponent(mes)}`).then(r => r.balanco),
  getLancamentos: (mes: string) =>
    request<{ ok: boolean; balanco: BalancoFinanceiro }>(`/api/financas/balanco?mes=${encodeURIComponent(mes)}`).then(r => r.balanco?.itens || []),
  getRelatorioMensal: (mes: string) =>
    request<{
      ok: boolean;
      mesReferencia: string;
      geradoEm: string;
      kpis: {
        faturamentoMeli: number;
        comissoesConfirmadasMeli: number;
        investimentoMetaAds: number;
        lucroOperacionalLiquido: number;
        reservaReinvestimento70: number;
        lucroDisponivel30: number;
        blendedRoas: number;
        margemLucroPercentual: number;
        cliquesMeta: number;
        impressoesMeta: number;
        cpcMedio: number;
        ctrMedio: number;
      };
      detalhamentoDiario: Array<{
        dataLancamento: string;
        gastoCampanhas: number;
        lucroBruto: number;
        vendasBrutas: number;
        saldoDia: number;
        blendedRoas: number;
        cliquesMeta: number;
        impressoesMeta: number;
      }>;
    }>(`/api/financas/relatorio-mensal?mes=${encodeURIComponent(mes)}`),
  addLancamento: (dados: {
    dataLancamento: string;
    gastoCampanhas: number;
    lucroBruto: number;
    vendasBrutas?: number;
    cliquesMeta?: number;
    impressoesMeta?: number;
    descricao?: string;
    categoria?: string;
  }) =>
    request<{ ok: boolean; id?: number; data?: string }>('/api/financas/lancamentos', {
      method: 'POST',
      body: JSON.stringify(dados)
    }),
  deleteLancamento: (idOuData: number | string) =>
    request<{ ok: boolean }>(`/api/financas/lancamentos/${encodeURIComponent(idOuData)}`, { method: 'DELETE' }),
  getDespesasPdf: (inicio = '', fim = '') =>
    request<{ ok: boolean; resumo: ResumoDespesasPdf }>(`/api/financas/despesas?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`).then(r => r.resumo),
  deleteDespesaPdf: (id: number) =>
    request<{ ok: boolean; message: string }>(`/api/financas/despesas/${id}`, { method: 'DELETE' }),
  uploadDespesaPdf: async (formData: FormData) => {
    const res = await fetch('/api/financas/despesas/upload', {
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
    request<{ ok: boolean; uploads: UploadPlanilhaFinancas[] }>(`/api/financas/uploads?mes=${encodeURIComponent(mes)}`).then(r => r.uploads || []),
  deleteUploadPlanilha: (id: number) =>
    request<{ ok: boolean; message: string }>(`/api/financas/upload/${id}`, { method: 'DELETE' }),
  uploadPlanilhaSemanal: async (formData: FormData) => {
    const res = await fetch('/api/financas/upload', {
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
    window.open(`/api/financas/exportar-csv?mes=${encodeURIComponent(mes)}`, '_blank');
  },
  exportarDespesasPdfCsv: (inicio = '', fim = '') => {
    window.open(`/api/financas/exportar-csv?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`, '_blank');
  },

  // --- ATENDIMENTO IA (DEEPSEEK) ---
  testDeepSeek: (mensagem: string, promptSistema?: string) =>
    request<{ ok: boolean; pergunta?: string; resposta?: string; message?: string }>('/api/bot/deepseek/test', {
      method: 'POST',
      body: JSON.stringify({ prompt: mensagem, promptSistema })
    }),

  // --- LOGOUT UNIFICADO ---
  logout: async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('promo_token');
      }
    } catch {}
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  }
};

