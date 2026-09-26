import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import type { Campanha, LeadContact, MetaTemplate } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';

export const DisparadorView: React.FC = () => {
  const [tab, setTab] = useState<'campanhas' | 'grupos' | 'leads' | 'ia' | 'conectar'>('campanhas');
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string; total_membros?: number }>>([]);
  const [leads, setLeads] = useState<LeadContact[]>([]);
  const [pastas, setPastas] = useState<Array<{ pasta: string; total: number }>>([]);
  const [pastaAtiva, setPastaAtiva] = useState('');
  const [buscaLead, setBuscaLead] = useState('');
  const [templatesMeta, setTemplatesMeta] = useState<MetaTemplate[]>([]);

  // Criação de Nova Campanha
  const [showNovaCampanha, setShowNovaCampanha] = useState(false);
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [pastaCampanha, setPastaCampanha] = useState('');
  const [templateTexto, setTemplateTexto] = useState('{Olá|Opa|E aí} {nome}! Tudo bem? Garanta suas cartas com desconto!');
  const [canalEnvio, setCanalEnvio] = useState<'baileys' | 'meta_cloud'>('baileys');
  const [metaTemplateNome, setMetaTemplateNome] = useState('');

  // IA Playground
  const [iaMensagem, setIaMensagem] = useState('');
  const [iaResposta, setIaResposta] = useState('');
  const [iaLoading, setIaLoading] = useState(false);

  const { status } = useUnifiedStatus();

  useEffect(() => {
    carregarDados();
  }, [pastaAtiva, buscaLead]);

  const carregarDados = async () => {
    try {
      const [camps, grps, psts, lds, metaTpls] = await Promise.all([
        api.getCampanhas(),
        api.getBotGrupos(),
        api.getPastasLeads(),
        api.getLeads(pastaAtiva, buscaLead),
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

  const handleCriarCampanha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCampanha || !pastaCampanha || !templateTexto) {
      return alert('Preencha todos os campos obrigatórios!');
    }

    try {
      await api.createCampanha({
        nome: nomeCampanha,
        pasta: pastaCampanha,
        template: templateTexto,
        canal_envio: canalEnvio,
        meta_template_nome: canalEnvio === 'meta_cloud' ? metaTemplateNome : undefined
      });
      alert('Campanha criada com sucesso!');
      setShowNovaCampanha(false);
      setNomeCampanha('');
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao criar campanha');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await api.startCampanha(id);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao iniciar');
    }
  };

  const handlePause = async (id: number) => {
    try {
      await api.pauseCampanha(id);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao pausar');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Deseja realmente cancelar esta campanha?')) return;
    try {
      await api.cancelCampanha(id);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao cancelar');
    }
  };

  const handleSyncGrupos = async () => {
    try {
      const res = await api.syncBotGrupos();
      alert(`Sincronizados ${res.grupos} grupos com sucesso!`);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao sincronizar');
    }
  };

  const handleExtrairMembros = async (grupoId: string, nomeGrupo: string) => {
    const pastaNome = prompt(`Digite o nome da pasta de leads para o grupo "${nomeGrupo}":`, nomeGrupo);
    if (!pastaNome) return;
    try {
      const res = await api.extractGrupoMembros(grupoId, pastaNome);
      alert(`Extração concluída: ${res.contatos} novos contatos extraídos!`);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha na extração');
    }
  };

  const handleTestDeepSeek = async () => {
    if (!iaMensagem) return;
    setIaLoading(true);
    try {
      const res = await api.testDeepSeek(iaMensagem);
      setIaResposta(res.resposta);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha no teste da IA');
    } finally {
      setIaLoading(false);
    }
  };

  const botWa = status?.bot?.whatsapp;
  const isBotConectado = botWa?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Top Banner Disparador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-orange-950/60 to-slate-900/80 border border-orange-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
              Disparador Pro & IA DeepSeek
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  isBotConectado
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isBotConectado ? '● WhatsApp Online' : '○ Aguardando Conexão'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Disparo em massa humanizado com Spintax, aquecimento inteligente de chip e atendimento com IA.
            </p>
          </div>
        </div>

        {/* Sub-Navegação */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setTab('campanhas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'campanhas'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Campanhas ({campanhas.length})
          </button>
          <button
            onClick={() => setTab('grupos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'grupos'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Grupos ({grupos.length})
          </button>
          <button
            onClick={() => setTab('leads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'leads'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => setTab('ia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'ia'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Atendimento IA
          </button>
          <button
            onClick={() => setTab('conectar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'conectar'
                ? 'bg-orange-500 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Conectar Chip 2
          </button>
        </div>
      </div>

      {/* Conteúdo: Campanhas */}
      {tab === 'campanhas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-orange-400" />
              Campanhas de Disparo Ativas
            </h3>
            <button
              onClick={() => setShowNovaCampanha(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Campanha</span>
            </button>
          </div>

          {/* Modal Nova Campanha */}
          {showNovaCampanha && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <div className="glass-panel rounded-2xl p-6 border border-white/10 max-w-lg w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Criar Campanha com Spintax
                  </h4>
                  <button onClick={() => setShowNovaCampanha(false)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCriarCampanha} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nome da Campanha:</label>
                    <input
                      type="text"
                      placeholder="Ex: Aquecimento - Coleção 30 Anos"
                      value={nomeCampanha}
                      onChange={e => setNomeCampanha(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-orange-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Pasta de Leads:</label>
                    <select
                      value={pastaCampanha}
                      onChange={e => setPastaCampanha(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0d1527] border border-white/[0.08] text-white focus:outline-none focus:border-orange-500/50"
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
                    <label className="block text-slate-300 font-medium mb-1">Canal de Envio:</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCanalEnvio('baileys')}
                        className={`py-2 rounded-xl border text-xs font-semibold ${
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
                        className={`py-2 rounded-xl border text-xs font-semibold ${
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
                      <label className="block text-slate-300 font-medium mb-1">Template Meta Oficial:</label>
                      <select
                        value={metaTemplateNome}
                        onChange={e => setMetaTemplateNome(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0d1527] border border-white/[0.08] text-white focus:outline-none focus:border-orange-500/50"
                      >
                        <option value="">Selecione um template cadastrado...</option>
                        {templatesMeta.map(t => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Mensagem com Spintax e Tags {'{nome}'}:
                    </label>
                    <textarea
                      rows={4}
                      value={templateTexto}
                      onChange={e => setTemplateTexto(e.target.value)}
                      className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-orange-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Use {'{Olá|Opa|E aí}'} para variação anti-ban e {'{nome}'} para o primeiro nome do lead.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNovaCampanha(false)}
                      className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 font-bold text-white shadow-lg shadow-orange-500/25"
                    >
                      Criar e Enfileirar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de Campanhas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campanhas.length === 0 ? (
              <div className="col-span-2 text-center py-12 text-slate-400 text-sm glass-panel rounded-2xl border border-white/[0.08]">
                Nenhuma campanha criada ainda. Clique em "Nova Campanha" para começar.
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
                        Pasta: <span className="text-cyan-300 font-semibold">{camp.pasta}</span> · Canal:{' '}
                        <span className="uppercase text-orange-400 font-mono text-[10px]">{camp.canal_envio}</span>
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        camp.status === 'em_andamento'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : camp.status === 'pausada'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
                        {camp.enviados}/{camp.total_alvos} ({Math.round((camp.enviados / (camp.total_alvos || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (camp.enviados / (camp.total_alvos || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Controles de Ação */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.05]">
                    {camp.status !== 'em_andamento' && camp.status !== 'concluida' && (
                      <button
                        onClick={() => handleStart(camp.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1"
                        title="Iniciar / Retomar Disparo"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar</span>
                      </button>
                    )}
                    {camp.status === 'em_andamento' && (
                      <button
                        onClick={() => handlePause(camp.id)}
                        className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1"
                        title="Pausar Disparos"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCancel(camp.id)}
                      className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-semibold flex items-center gap-1"
                      title="Cancelar Campanha"
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

      {/* Conteúdo: Grupos do WhatsApp */}
      {tab === 'grupos' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-400" />
                Grupos do WhatsApp Detectados ({grupos.length})
              </h3>
              <p className="text-xs text-slate-400">
                Sincronize os grupos do chip 2 para extrair contatos segmentados para campanhas.
              </p>
            </div>
            <button
              onClick={handleSyncGrupos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30 text-xs font-bold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sincronizar Grupos</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {grupos.map(g => (
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
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-orange-500 text-slate-300 hover:text-white transition-all whitespace-nowrap"
                >
                  Extrair Leads
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conteúdo: Base de Leads */}
      {tab === 'leads' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Pasta:</span>
              <select
                value={pastaAtiva}
                onChange={e => setPastaAtiva(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0d1527] border border-white/[0.08] text-white text-xs"
              >
                <option value="">Todas as Pastas</option>
                {pastas.map(p => (
                  <option key={p.pasta} value={p.pasta}>
                    {p.pasta} ({p.total})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por telefone ou nome..."
                value={buscaLead}
                onChange={e => setBuscaLead(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06]">
                <tr>
                  <th className="py-2.5 px-3">Telefone / JID</th>
                  <th className="py-2.5 px-3">Nome</th>
                  <th className="py-2.5 px-3">Pasta</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-mono text-cyan-300">{lead.jid.split('@')[0]}</td>
                    <td className="py-2.5 px-3 text-slate-200">{lead.nome || 'Lead Sem Nome'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-slate-300">
                        {lead.pasta}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={async () => {
                          if (confirm('Excluir este contato?')) {
                            await api.deleteLead(lead.id);
                            carregarDados();
                          }
                        }}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo: Atendimento IA (DeepSeek) */}
      {tab === 'ia' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <Bot className="w-4 h-4 text-orange-400" />
              Simulador de Conversa com DeepSeek V4
            </h3>
            <p className="text-xs text-slate-400">
              Teste as respostas humanizadas com a persona oficial "De fã para fãs" e conversão para o link oficial do grupo.
            </p>

            <div className="space-y-3 text-xs">
              <textarea
                rows={3}
                placeholder="Ex: 'Opa, como faço pra entrar no grupo de ofertas de Pokémon?'"
                value={iaMensagem}
                onChange={e => setIaMensagem(e.target.value)}
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-orange-500/50"
              />

              <button
                onClick={handleTestDeepSeek}
                disabled={iaLoading || !iaMensagem}
                className="w-full py-2.5 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 disabled:opacity-50"
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
                Resposta Gerada pela IA
              </h4>
              <p className="text-xs text-slate-400 mb-3">Saída formatada para o WhatsApp:</p>

              {iaResposta ? (
                <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs font-mono text-slate-100 whitespace-pre-line shadow-xl">
                  {iaResposta}
                </div>
              ) : (
                <div className="h-44 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <span>Envie uma mensagem ao lado para testar a IA.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo: Conectar Chip 2 */}
      {tab === 'conectar' && (
        <div className="glass-panel rounded-2xl p-8 border border-white/[0.08] max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto">
            <QrCode className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-heading font-bold text-white">Pareamento do WhatsApp · Chip 2 (Disparador)</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Conecte o seu segundo chip de WhatsApp exclusivo para disparos em massa e atendimento da IA.
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
                <span>Gerando QR Code...</span>
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
    </div>
  );
};
