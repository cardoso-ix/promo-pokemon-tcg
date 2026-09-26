import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Users,
  Send,
  Play,
  Pause,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  QrCode,
  CheckCircle,
  MessageSquare,
  Bot,
  Sparkles,
  Cloud,
  Shield,
  Terminal,
  Download,
  Upload,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Key
} from 'lucide-react';
import type {
  Campanha,
  LeadContact,
  MetaTemplate,
  WarmupStatus,
  LogSistema
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';

export const DisparadorView: React.FC = () => {
  // Aba principal interna do Disparador
  const [tab, setTab] = useState<
    'campanhas' | 'grupos' | 'leads' | 'meta_cloud' | 'antiban' | 'ia' | 'logs' | 'conectar'
  >('campanhas');

  // Campanhas
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [pastaCampanha, setPastaCampanha] = useState('');
  const [templateTexto, setTemplateTexto] = useState('{Olá|Opa|E aí} {nome}! Tudo bem? Garanta seus boosters Pokémon com desconto!');
  const [canalEnvio, setCanalEnvio] = useState<'baileys' | 'meta_cloud'>('baileys');
  const [metaTemplateNome, setMetaTemplateNome] = useState('');

  // Grupos & Leads
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string; total_membros?: number }>>([]);
  const [pastas, setPastas] = useState<Array<{ pasta: string; total: number }>>([]);
  const [pastaAtiva, setPastaAtiva] = useState('');
  const [buscaLead, setBuscaLead] = useState('');
  const [leads, setLeads] = useState<LeadContact[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPasta, setImportPasta] = useState('');

  // Meta Cloud Oficial
  const [metaStatus, setMetaStatus] = useState<any>(null);
  const [templatesMeta, setTemplatesMeta] = useState<MetaTemplate[]>([]);
  const [metaToken, setMetaToken] = useState('');
  const [metaWabaId, setMetaWabaId] = useState('');
  const [metaPhoneId, setMetaPhoneId] = useState('');
  const [metaAtivo, setMetaAtivo] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [showNovoMetaTpl, setShowNovoMetaTpl] = useState(false);
  const [tplNome, setTplNome] = useState('');
  const [tplCategoria, setTplCategoria] = useState<'UTILITY' | 'MARKETING'>('UTILITY');
  const [tplTexto, setTplTexto] = useState('');

  // Anti-Ban & Aquecimento
  const [warmup, setWarmup] = useState<WarmupStatus | null>(null);
  const [botConfigs, setBotConfigs] = useState<Record<string, string>>({});
  const [salvandoConfigs, setSalvandoConfigs] = useState(false);

  // IA Playground
  const [iaMensagem, setIaMensagem] = useState('');
  const [iaResposta, setIaResposta] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaPromptSistema, setIaPromptSistema] = useState('');
  const [iaAtivo, setIaAtivo] = useState(false);

  // Logs ao Vivo
  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Mensagem Feedback
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const mostrarFeedback = (tipo: 'sucesso' | 'erro', texto: string) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback(null), 4000);
  };

  const { status } = useUnifiedStatus();
  const botWa = status?.bot?.whatsapp;
  const isBotConectado = botWa?.status === 'connected';

  useEffect(() => {
    carregarDadosBase();
  }, [pastaAtiva, buscaLead]);

  useEffect(() => {
    if (tab === 'meta_cloud') {
      carregarMetaCloud();
    } else if (tab === 'antiban') {
      carregarAntiBan();
    } else if (tab === 'logs') {
      carregarLogs();
      const interval = setInterval(carregarLogs, 3000);
      return () => clearInterval(interval);
    } else if (tab === 'ia') {
      carregarIaConfigs();
    }
  }, [tab]);

  useEffect(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const carregarDadosBase = async () => {
    try {
      const [camps, grps, psts, lds, metaTpls] = await Promise.all([
        api.getCampanhas().catch(() => []),
        api.getBotGrupos().catch(() => []),
        api.getPastasLeads().catch(() => []),
        api.getLeads(pastaAtiva, buscaLead).catch(() => []),
        api.getMetaTemplates().catch(() => [])
      ]);
      setCampanhas(camps);
      setGrupos(grps);
      setPastas(psts);
      setLeads(lds);
      setTemplatesMeta(metaTpls);
    } catch {
      // Ignorar falhas transitórias
    }
  };

  const carregarMetaCloud = async () => {
    try {
      const [st, tpls, cfgs] = await Promise.all([
        api.getMetaStatus().catch(() => null),
        api.getMetaTemplates().catch(() => []),
        api.getBotConfigs().catch(() => ({} as Record<string, string>))
      ]);
      setMetaStatus(st);
      setTemplatesMeta(tpls);
      const confMap = (cfgs || {}) as Record<string, string>;
      setMetaToken(confMap.meta_cloud_token || '');
      setMetaWabaId(confMap.meta_waba_id || '');
      setMetaPhoneId(confMap.meta_phone_number_id || '');
      setMetaAtivo(confMap.meta_cloud_ativo === 'true');
    } catch {
      // Ignorar
    }
  };

  const carregarAntiBan = async () => {
    try {
      const [wm, cfgs] = await Promise.all([
        api.getWarmupStatus().catch(() => null),
        api.getBotConfigs().catch(() => ({}))
      ]);
      setWarmup(wm);
      setBotConfigs(cfgs);
    } catch {
      // Ignorar
    }
  };

  const carregarLogs = async () => {
    try {
      const lista = await api.getBotLogs(120);
      setLogs(lista);
    } catch {
      // Ignorar
    }
  };

  const carregarIaConfigs = async () => {
    try {
      const cfgs = await api.getBotConfigs();
      setIaPromptSistema(cfgs.deepseek_prompt_sistema || '');
      setIaAtivo(cfgs.deepseek_ativo === 'true');
    } catch {
      // Ignorar
    }
  };

  // Handlers Campanhas
  const handleCriarCampanha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCampanha || !pastaCampanha || !templateTexto) {
      return alert('Preencha os campos obrigatórios da campanha!');
    }

    try {
      await api.createCampanha({
        nome: nomeCampanha,
        targetPastaNome: pastaCampanha,
        targetType: 'pasta',
        mensagemTemplate: templateTexto,
        canalEnvio: canalEnvio,
        metaTemplateNome: canalEnvio === 'meta_cloud' ? metaTemplateNome : undefined
      });
      setShowNovaCampanha(false);
      setNomeCampanha('');
      mostrarFeedback('sucesso', 'Campanha criada e enfileirada com sucesso!');
      carregarDadosBase();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao criar campanha');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await api.startCampanha(id);
      carregarDadosBase();
      mostrarFeedback('sucesso', 'Campanha iniciada com sucesso!');
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao iniciar');
    }
  };

  const handlePause = async (id: number) => {
    try {
      await api.pauseCampanha(id);
      carregarDadosBase();
      mostrarFeedback('sucesso', 'Campanha pausada.');
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao pausar');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Deseja realmente cancelar esta campanha?')) return;
    try {
      await api.cancelCampanha(id);
      carregarDadosBase();
      mostrarFeedback('sucesso', 'Campanha cancelada.');
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao cancelar');
    }
  };

  // Handlers Grupos & Leads
  const handleSyncGrupos = async () => {
    try {
      const res = await api.syncBotGrupos();
      mostrarFeedback('sucesso', `${res.total} grupos sincronizados do WhatsApp!`);
      carregarDadosBase();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao sincronizar');
    }
  };

  const handleExtrairMembros = async (grupoId: string, nomeGrupo: string) => {
    const pastaNome = prompt(`Nome da pasta de destino para "${nomeGrupo}":`, nomeGrupo);
    if (!pastaNome) return;
    try {
      const res = await api.extractGrupoMembros(grupoId, pastaNome);
      mostrarFeedback('sucesso', `Extraídos ${res.inseridos} contatos para a pasta "${pastaNome}"!`);
      carregarDadosBase();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha na extração');
    }
  };

  const handleImportLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText || !importPasta) return alert('Preencha o texto e o nome da pasta.');
    try {
      const res = await api.importLeads(importText, importPasta);
      setShowImportModal(false);
      setImportText('');
      setImportPasta('');
      mostrarFeedback('sucesso', `${res.totalImported} contatos importados na pasta "${res.pasta}"!`);
      carregarDadosBase();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha na importação');
    }
  };

  // Handlers Meta Cloud Oficial
  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveMetaConfig({
        ativo: metaAtivo,
        token: metaToken,
        wabaId: metaWabaId,
        phoneNumberId: metaPhoneId
      });
      mostrarFeedback('sucesso', 'Configurações da Meta Cloud salvas com sucesso!');
      carregarMetaCloud();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao salvar configurações da Meta');
    }
  };

  const handleSyncMetaTemplates = async () => {
    setSyncingMeta(true);
    try {
      const res = await api.syncMetaTemplates();
      mostrarFeedback('sucesso', `${res.totalSincronizados} templates sincronizados com a Meta!`);
      carregarMetaCloud();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao sincronizar com a Meta');
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleSubmitMetaTpl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplNome || !tplTexto) return alert('Preencha o nome e o texto do template.');
    try {
      await api.submitMetaTemplate({
        name: tplNome,
        category: tplCategoria,
        bodyText: tplTexto
      });
      setShowNovoMetaTpl(false);
      setTplNome('');
      setTplTexto('');
      mostrarFeedback('sucesso', 'Template submetido para aprovação na Meta!');
      carregarMetaCloud();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao submeter template');
    }
  };

  // Handlers Anti-Ban
  const handleSaveAntiBan = async () => {
    setSalvandoConfigs(true);
    try {
      await api.saveBotConfigs(botConfigs);
      mostrarFeedback('sucesso', 'Parâmetros anti-ban salvos com sucesso!');
      carregarAntiBan();
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSalvandoConfigs(false);
    }
  };

  // Handlers IA DeepSeek
  const handleTestDeepSeek = async () => {
    if (!iaMensagem) return;
    setIaLoading(true);
    try {
      const res = await api.testDeepSeek(iaMensagem, iaPromptSistema);
      setIaResposta(res.resposta || res.message || 'Sem resposta');
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha no teste da IA');
    } finally {
      setIaLoading(false);
    }
  };

  const handleSaveIaConfigs = async () => {
    try {
      await api.saveBotConfigs({
        deepseek_prompt_sistema: iaPromptSistema,
        deepseek_ativo: iaAtivo ? 'true' : 'false'
      });
      mostrarFeedback('sucesso', 'Instruções da IA salvas com sucesso!');
    } catch (err: unknown) {
      mostrarFeedback('erro', err instanceof Error ? err.message : 'Falha ao salvar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-semibold transition-all ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Top Banner Disparador */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-orange-950/70 via-slate-900 to-slate-900/90 border border-orange-500/25 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shadow-inner">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-extrabold text-white flex items-center gap-2">
              Disparador Pro & Motor Multicanal
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isBotConectado
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isBotConectado ? '● Chip 2 Ativo' : '○ Chip 2 Offline'}
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Disparo em massa humanizado com Spintax, Meta Cloud Oficial, aquecimento seguro e IA DeepSeek integrada.
            </p>
          </div>
        </div>

        {/* Sub-Navegação por Abas */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-x-auto max-w-full">
          {[
            { id: 'campanhas', label: `Campanhas (${campanhas.length})`, icon: Send },
            { id: 'grupos', label: `Grupos (${grupos.length})`, icon: Users },
            { id: 'leads', label: `Base Leads (${leads.length})`, icon: Layers },
            { id: 'meta_cloud', label: 'Meta Cloud Oficial', icon: Cloud },
            { id: 'antiban', label: 'Anti-Ban & Ajustes', icon: Shield },
            { id: 'ia', label: 'Atendimento IA', icon: Bot },
            { id: 'logs', label: 'Logs ao Vivo', icon: Terminal },
            { id: 'conectar', label: 'Conectar Chip', icon: QrCode }
          ].map(item => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. ABA: CAMPANHAS DE DISPARO */}
      {tab === 'campanhas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-400" />
              Filas de Disparos Ativas
            </h3>
            <button
              onClick={() => setShowNovaCampanha(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/25 active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Campanha</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campanhas.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-slate-400 text-xs glass-panel rounded-2xl border border-white/[0.08]">
                Nenhuma campanha criada ainda. Clique em "Nova Campanha" para iniciar disparos.
              </div>
            ) : (
              campanhas.map(camp => (
                <div
                  key={camp.id}
                  className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-heading font-bold text-white text-sm">{camp.nome}</h4>
                      <p className="text-[11px] text-slate-400">
                        Canal:{' '}
                        <span className="uppercase text-orange-400 font-mono text-[10px] font-bold">
                          {camp.canal_envio}
                        </span>
                        {camp.meta_template_nome && (
                          <span className="text-cyan-300 ml-1">({camp.meta_template_nome})</span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        camp.status === 'executando'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : camp.status === 'pausada'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-mono">
                      <span>Progresso:</span>
                      <span>
                        {camp.enviados}/{camp.total_destinatarios} (
                        {Math.round((camp.enviados / (camp.total_destinatarios || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (camp.enviados / (camp.total_destinatarios || 1)) * 100)}%`
                        }}
                      />
                    </div>
                    {camp.falhas > 0 && (
                      <span className="text-[10px] text-red-400 font-mono">{camp.falhas} falhas registradas</span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
                    {camp.status !== 'executando' && camp.status !== 'concluida' && (
                      <button
                        onClick={() => handleStart(camp.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Iniciar / Retomar"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar</span>
                      </button>
                    )}
                    {camp.status === 'executando' && (
                      <button
                        onClick={() => handlePause(camp.id)}
                        className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Pausar"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(camp.id)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Cancelar"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. ABA: GRUPOS DO WHATSAPP */}
      {tab === 'grupos' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                Grupos Detectados no WhatsApp ({grupos.length})
              </h3>
              <p className="text-xs text-slate-400">
                Sincronize os grupos do chip de WhatsApp para extrair contatos para pastas de leads.
              </p>
            </div>
            <button
              onClick={handleSyncGrupos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Grupos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grupos.length === 0 ? (
              <div className="col-span-3 text-center py-10 text-slate-500 text-xs">
                Nenhum grupo sincronizado. Conecte o WhatsApp e clique em "Sincronizar Grupos".
              </div>
            ) : (
              grupos.map(g => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-orange-500/30 transition-all flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 text-xs truncate">
                    <h5 className="font-bold text-white truncate">{g.nome}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">{g.total_membros || '?'} participantes</p>
                  </div>
                  <button
                    onClick={() => handleExtrairMembros(g.id, g.nome)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-orange-500 text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
                  >
                    Extrair Leads
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. ABA: BASE DE LEADS */}
      {tab === 'leads' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Pasta:</span>
              <select
                value={pastaAtiva}
                onChange={e => setPastaAtiva(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0b1329] border border-white/10 text-white text-xs font-medium cursor-pointer"
              >
                <option value="">Todas as Pastas</option>
                {pastas.map(p => (
                  <option key={p.pasta} value={p.pasta}>
                    {p.pasta} ({p.total})
                  </option>
                ))}
              </select>

              {pastaAtiva && (
                <button
                  onClick={async () => {
                    if (confirm(`Excluir a pasta "${pastaAtiva}" e todos os contatos nela?`)) {
                      await api.deletePastaLeads(pastaAtiva);
                      setPastaAtiva('');
                      carregarDadosBase();
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 bg-white/[0.04] transition-colors cursor-pointer"
                  title="Excluir Pasta Inteira"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por telefone ou nome..."
                  value={buscaLead}
                  onChange={e => setBuscaLead(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Lista</span>
              </button>

              <button
                onClick={() => api.exportarLeadsCsv(pastaAtiva, 'meta')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer"
                title="Exportar no formato Meta Ads Custom Audiences com DDI 55"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Meta Ads</span>
              </button>

              <button
                onClick={() => api.exportarLeadsCsv(pastaAtiva, 'excel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-all cursor-pointer"
                title="Exportar no formato Microsoft Excel com BOM UTF-8"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.01]">
                <tr>
                  <th className="py-2.5 px-3">Telefone</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Pasta / Grupo</th>
                  <th className="py-2.5 px-3">Origem</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-500">
                      Nenhum contato encontrado. Extraia membros de grupos ou faça a importação manual.
                    </td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-cyan-300 font-semibold">
                        {lead.numero || lead.jid.split('@')[0]}
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{lead.nome || 'Lead Sem Nome'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.05] text-slate-300">
                          {lead.grupo_nome || lead.pasta || 'Geral'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">{lead.origem_tipo || 'extracao'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={async () => {
                            if (confirm('Excluir este contato?')) {
                              await api.deleteLead(lead.id);
                              carregarDadosBase();
                            }
                          }}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ABA: META CLOUD API OFICIAL */}
      {tab === 'meta_cloud' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Status Meta */}
            <div className="glass-panel rounded-2xl p-5 border border-blue-500/20 space-y-2">
              <span className="text-[11px] text-blue-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                Status da Conexão Meta
              </span>
              <div className="text-xl font-heading font-extrabold text-white">
                {metaStatus?.configured ? 'WABA Conectada' : 'Aguardando Token'}
              </div>
              <p className="text-[11px] text-slate-400">
                {metaStatus?.ativo ? '● Canal Meta Cloud Ativado' : '○ Canal Meta Cloud Desativado'}
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-2">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                Templates Sincronizados
              </span>
              <div className="text-xl font-heading font-extrabold text-emerald-400">
                {metaStatus?.templatesCount?.total || templatesMeta.length} Modelos
              </div>
              <p className="text-[11px] text-slate-400">
                Aprovados: {metaStatus?.templatesCount?.aprovados || 0} · Pendentes:{' '}
                {metaStatus?.templatesCount?.pendentes || 0}
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  Sincronização
                </span>
                <p className="text-xs text-slate-300 mt-1">Atualizar templates da Meta Cloud</p>
              </div>
              <button
                onClick={handleSyncMetaTemplates}
                disabled={syncingMeta}
                className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingMeta ? 'animate-spin' : ''}`} />
                <span>{syncingMeta ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>

          {/* Configurações de Credenciais Meta */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              Credenciais Oficiais Meta Business Cloud
            </h3>
            <form onSubmit={handleSaveMetaConfig} className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <input
                  type="checkbox"
                  id="chkMetaAtivo"
                  checked={metaAtivo}
                  onChange={e => setMetaAtivo(e.target.checked)}
                  className="w-4 h-4 accent-blue-500 cursor-pointer"
                />
                <label htmlFor="chkMetaAtivo" className="text-xs text-slate-200 font-semibold cursor-pointer">
                  Habilitar envio oficial via Meta Cloud API nos disparadores
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">WhatsApp Business Account ID (WABA):</label>
                  <input
                    type="text"
                    placeholder="Ex: 104829102938102"
                    value={metaWabaId}
                    onChange={e => setMetaWabaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number ID:</label>
                  <input
                    type="text"
                    placeholder="Ex: 582910293810293"
                    value={metaPhoneId}
                    onChange={e => setMetaPhoneId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Access Token Permanente (Bearer):</label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={metaToken}
                    onChange={e => setMetaToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
                >
                  Salvar Credenciais Meta
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Templates Oficiais */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-heading font-bold text-white text-base">Templates Oficiais Sincronizados</h4>
                <p className="text-xs text-slate-400">Modelos validados pela Meta para disparo sem risco de bloqueio</p>
              </div>
              <button
                onClick={() => setShowNovoMetaTpl(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Template Meta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templatesMeta.map(tpl => (
                <div key={tpl.nome} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{tpl.nome}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tpl.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {tpl.status || 'APPROVED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono bg-black/30 p-2.5 rounded-lg whitespace-pre-wrap">
                    {tpl.corpo_texto}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Categoria: {tpl.categoria}</span>
                    <button
                      onClick={async () => {
                        if (confirm(`Excluir template "${tpl.nome}"?`)) {
                          await api.deleteMetaTemplate(tpl.nome);
                          carregarMetaCloud();
                        }
                      }}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA: ANTI-BAN & AJUSTES DE CHIP */}
      {tab === 'antiban' && (
        <div className="space-y-6">
          {/* Card Aquecimento (Warm Up) */}
          <div className="glass-panel rounded-2xl p-6 border border-orange-500/25 space-y-4 bg-gradient-to-br from-orange-950/20 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Status de Aquecimento do Chip (Warm Up Automático)
                </h3>
                <p className="text-xs text-slate-400">
                  Aumento progressivo da cota diária de disparos para consolidar a reputação do número perante a Meta
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('Reiniciar o ciclo de aquecimento deste chip para o Dia 1?')) {
                    await api.resetWarmup();
                    carregarAntiBan();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-orange-300 text-xs font-semibold border border-orange-500/30 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reiniciar Aquecimento</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Dia de Aquecimento</span>
                <div className="text-xl font-heading font-bold text-orange-400 mt-1">
                  Dia {warmup?.diasAquecimento || 1}
                </div>
                <span className="text-[10px] text-slate-500">Fase: {warmup?.fase || 'Inicial'}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Limite Diário Hoje</span>
                <div className="text-xl font-heading font-bold text-emerald-400 mt-1">
                  {warmup?.limiteDiarioAtual || 20} msgs/dia
                </div>
                <span className="text-[10px] text-slate-500">Enviados hoje: {warmup?.enviadosHoje || 0}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Progresso da Cota</span>
                <div className="text-xl font-heading font-bold text-cyan-300 mt-1">
                  {warmup?.porcentagemHoje || 0}%
                </div>
                <span className="text-[10px] text-slate-500">
                  Restantes: {(warmup?.limiteDiarioAtual || 20) - (warmup?.enviadosHoje || 0)} msgs
                </span>
              </div>
            </div>
          </div>

          {/* Configurações Anti-Ban */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Parâmetros de Ritmo Humano & Delays Randômicos
                </h3>
                <p className="text-xs text-slate-400">Proteção matemática contra detecção de metralhadora de mensagens</p>
              </div>
              <button
                onClick={handleSaveAntiBan}
                disabled={salvandoConfigs}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {salvandoConfigs ? 'Salvando...' : 'Salvar Parâmetros'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delay Mínimo entre Mensagens (segundos):</label>
                <input
                  type="number"
                  value={botConfigs.delay_minimo || '15'}
                  onChange={e => setBotConfigs({ ...botConfigs, delay_minimo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Recomendado: 15s</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Delay Máximo entre Mensagens (segundos):</label>
                <input
                  type="number"
                  value={botConfigs.delay_maximo || '45'}
                  onChange={e => setBotConfigs({ ...botConfigs, delay_maximo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Recomendado: 45s</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pausa a cada N Mensagens (Bloco):</label>
                <input
                  type="number"
                  value={botConfigs.pausa_bloco_qtd || '50'}
                  onChange={e => setBotConfigs({ ...botConfigs, pausa_bloco_qtd: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">A cada 50 disparos</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Duração da Pausa em Bloco (minutos):</label>
                <input
                  type="number"
                  value={botConfigs.pausa_bloco_minutos || '30'}
                  onChange={e => setBotConfigs({ ...botConfigs, pausa_bloco_minutos: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Simulação de descanso de 30 min</span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Simular Digitação no WhatsApp:</label>
                <select
                  value={botConfigs.simular_digitacao || 'true'}
                  onChange={e => setBotConfigs({ ...botConfigs, simular_digitacao: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white"
                >
                  <option value="true">Ativado ("Digitando..." proporcional)</option>
                  <option value="false">Desativado</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Horário Permitido de Envio:</label>
                <select
                  value={botConfigs.janela_envio || 'comercial'}
                  onChange={e => setBotConfigs({ ...botConfigs, janela_envio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white"
                >
                  <option value="comercial">Apenas Horário Comercial (08h às 21h)</option>
                  <option value="24h">Livre (24 horas)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ABA: ATENDIMENTO IA (DEEPSEEK) */}
      {tab === 'ia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-orange-400" />
                Persona & Regras da IA (DeepSeek V4)
              </h3>
              <button
                onClick={handleSaveIaConfigs}
                className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Salvar Regras
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <input
                  type="checkbox"
                  id="chkIaAtivo"
                  checked={iaAtivo}
                  onChange={e => setIaAtivo(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <label htmlFor="chkIaAtivo" className="text-slate-300 font-medium cursor-pointer">
                  Responder clientes automaticamente no privado do WhatsApp
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Instruções do Sistema (Prompt & Link do Grupo):
                </label>
                <textarea
                  rows={8}
                  value={iaPromptSistema}
                  onChange={e => setIaPromptSistema(e.target.value)}
                  placeholder="Ex: Você é o especialista em Pokémon TCG do Promo Pokémon TCG. Responda dúvidas com simpatia e envie o link do grupo https://chat.whatsapp.com/..."
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Simular Pergunta do Cliente:</label>
                <input
                  type="text"
                  placeholder="Ex: 'Opa, como entro no grupo de promoções?'"
                  value={iaMensagem}
                  onChange={e => setIaMensagem(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                onClick={handleTestDeepSeek}
                disabled={iaLoading || !iaMensagem}
                className="w-full py-2.5 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50 cursor-pointer"
              >
                {iaLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{iaLoading ? 'DeepSeek Pensando...' : 'Testar Resposta da IA'}</span>
              </button>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Preview da Resposta da IA no WhatsApp
              </h4>
              <p className="text-xs text-slate-400 mb-3">Como o cliente receberá no chat:</p>

              {iaResposta ? (
                <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs font-mono text-slate-100 whitespace-pre-line shadow-xl">
                  {iaResposta}
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>Envie uma pergunta ao lado para testar as instruções da IA.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. ABA: LOGS AO VIVO */}
      {tab === 'logs' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Terminal className="w-4 h-4 text-orange-400" />
                Console de Eventos em Tempo Real ({logs.length})
              </h3>
              <p className="text-xs text-slate-400">Stream contínuo de envios, pausas e atividades do motor</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScrollLogs}
                  onChange={e => setAutoScrollLogs(e.target.checked)}
                  className="accent-orange-500 cursor-pointer"
                />
                <span>Auto-scroll</span>
              </label>
              <button
                onClick={carregarLogs}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors cursor-pointer"
                title="Atualizar Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-96 rounded-xl bg-[#070d19] border border-white/[0.06] p-4 overflow-y-auto font-mono text-xs space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-12">Nenhum evento registrado ainda.</div>
            ) : (
              logs.map(l => (
                <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-500 text-[10px] shrink-0">
                    {new Date(l.criado_em).toLocaleTimeString('pt-BR')}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                      l.nivel === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : l.nivel === 'warn'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-cyan-500/10 text-cyan-300'
                    }`}
                  >
                    {l.categoria || 'bot'}
                  </span>
                  <span
                    className={`${
                      l.nivel === 'error'
                        ? 'text-red-300'
                        : l.nivel === 'warn'
                        ? 'text-amber-200'
                        : 'text-slate-300'
                    }`}
                  >
                    {l.mensagem}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* 8. ABA: CONECTAR CHIP 2 */}
      {tab === 'conectar' && (
        <div className="glass-panel rounded-2xl p-8 border border-white/[0.08] max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
            <QrCode className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-heading font-bold text-white">
              Pareamento do WhatsApp · Chip 2 (Disparador)
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Conecte o número de WhatsApp exclusivo para campanhas de massa e respostas de IA aos leads.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl w-64 h-64 mx-auto flex items-center justify-center shadow-2xl border-4 border-orange-500/30 relative">
            {botWa?.qrDataUrl ? (
              <img src={botWa.qrDataUrl} alt="QR Code Disparador" className="w-full h-full object-contain" />
            ) : isBotConectado ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <CheckCircle className="w-12 h-12" />
                <span className="text-xs font-bold font-sans">Chip 2 Conectado!</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                <span>Aguardando QR Code...</span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBotConectado ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-slate-500'
              }`}
            />
            <span>Status: {isBotConectado ? 'Conectado e operacional' : 'Aguardando pareamento'}</span>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CAMPANHA COM SPINTAX */}
      {showNovaCampanha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/15 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" />
                Criar Nova Campanha com Spintax
              </h4>
              <button
                onClick={() => setShowNovaCampanha(false)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarCampanha} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Campanha:</label>
                <input
                  type="text"
                  placeholder="Ex: Aquecimento - Booster Box 30 Anos"
                  value={nomeCampanha}
                  onChange={e => setNomeCampanha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Pasta de Leads:</label>
                <select
                  value={pastaCampanha}
                  onChange={e => setPastaCampanha(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white focus:outline-none focus:border-orange-500"
                  required
                >
                  <option value="">Selecione uma pasta...</option>
                  {pastas.map(p => (
                    <option key={p.pasta} value={p.pasta}>
                      {p.pasta} ({p.total} contatos)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Canal de Envio:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCanalEnvio('baileys')}
                    className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      canalEnvio === 'baileys'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    WhatsApp Chip (Baileys)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCanalEnvio('meta_cloud')}
                    className={`py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
                      canalEnvio === 'meta_cloud'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06]'
                    }`}
                  >
                    Meta Cloud API (Oficial)
                  </button>
                </div>
              </div>

              {canalEnvio === 'meta_cloud' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Template Meta Oficial:</label>
                  <select
                    value={metaTemplateNome}
                    onChange={e => setMetaTemplateNome(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Selecione um template cadastrado...</option>
                    {templatesMeta.map(t => (
                      <option key={t.nome} value={t.nome}>
                        {t.nome} ({t.categoria})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mensagem com Spintax e Tags {'{nome}'}:
                </label>
                <textarea
                  rows={4}
                  value={templateTexto}
                  onChange={e => setTemplateTexto(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Use {'{Olá|Opa|E aí}'} para alternar sinônimos e {'{nome}'} para o primeiro nome do destinatário.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowNovaCampanha(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Criar e Enfileirar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR LISTA MANUAL DE LEADS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/15 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                Importar Contatos Manualmente
              </h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportLeads} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Pasta:</label>
                <input
                  type="text"
                  placeholder="Ex: Leads Telegram / Evento TCG"
                  value={importPasta}
                  onChange={e => setImportPasta(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cole a lista (um contato por linha):
                </label>
                <textarea
                  rows={6}
                  placeholder={`5511999998888, João\n5521988887777, Maria\n+55 41 97777-6666`}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Formatos aceitos: Telefone com DDD e opcionalmente nome separado por vírgula.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Importar Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO TEMPLATE META CLOUD */}
      {showNovoMetaTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-panel rounded-2xl p-6 border border-white/15 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                Criar Template Meta Oficial
              </h4>
              <button
                onClick={() => setShowNovoMetaTpl(false)}
                className="text-slate-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitMetaTpl} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome Técnico (sem espaços, snake_case):
                </label>
                <input
                  type="text"
                  placeholder="aviso_oferta_pokemon_v1"
                  value={tplNome}
                  onChange={e => setTplNome(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Categoria:</label>
                <select
                  value={tplCategoria}
                  onChange={e => setTplCategoria(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1329] border border-white/10 text-white"
                >
                  <option value="UTILITY">UTILITY (Avisos operacionais / Risco menor)</option>
                  <option value="MARKETING">MARKETING (Ofertas e promoções)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Texto do Template:</label>
                <textarea
                  rows={5}
                  placeholder="Olá {{1}}, informamos que o colecionável Pokémon TCG já está disponível."
                  value={tplTexto}
                  onChange={e => setTplTexto(e.target.value)}
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Use {'{{1}}'}, {'{{2}}'} para variáveis aceitas pela Meta.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowNovoMetaTpl(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Submeter à Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
