import React, { useState, useEffect } from 'react';
import {
  Users,
  Download,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  ShieldCheck,
  Target,
  Sparkles,
  Flame
} from 'lucide-react';
import { api } from '../services/api.ts';
import type {
  WhatsAppGroupItem,
  WhatsAppContactItem,
  WhatsAppContactsStats
} from '../types/index.ts';

interface ExtratorLeadsMetaViewProps {
  onOpenQrModal?: () => void;
}

export const ExtratorLeadsMetaView: React.FC<ExtratorLeadsMetaViewProps> = ({ onOpenQrModal }) => {
  const [grupos, setGrupos] = useState<WhatsAppGroupItem[]>([]);
  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([]);
  const [filtroBusca, setFiltroBusca] = useState('');
  const [conectado, setConectado] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [exportando, setExportando] = useState<'meta' | 'excel' | null>(null);

  const [stats, setStats] = useState<WhatsAppContactsStats | null>(null);
  const [previewContatos, setPreviewContatos] = useState<WhatsAppContactItem[]>([]);
  const [filtroTabela, setFiltroTabela] = useState('');
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const carregarGrupos = async () => {
    setCarregandoGrupos(true);
    setErroMsg(null);
    try {
      const res = await api.getWhatsAppGroups();
      setConectado(res.connected);
      setUserPhone(res.userPhone);
      setGrupos(res.groups || []);
      // Seleciona todos os grupos por padrão
      setGruposSelecionados((res.groups || []).map(g => g.id));
    } catch (err: unknown) {
      setErroMsg(err instanceof Error ? err.message : 'Falha ao buscar grupos do WhatsApp');
    } finally {
      setCarregandoGrupos(false);
    }
  };

  useEffect(() => {
    carregarGrupos();
  }, []);

  const handleToggleGrupo = (id: string) => {
    setGruposSelecionados(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleMarcarTodos = () => {
    setGruposSelecionados(grupos.map(g => g.id));
  };

  const handleDesmarcarTodos = () => {
    setGruposSelecionados([]);
  };

  const handleProcessarPreview = async () => {
    if (gruposSelecionados.length === 0) {
      setErroMsg('Selecione pelo menos 1 grupo para extrair os contatos.');
      return;
    }
    setProcessando(true);
    setErroMsg(null);
    setSucessoMsg(null);
    try {
      const res = await api.previewWhatsAppContacts(gruposSelecionados);
      setStats(res.stats);
      setPreviewContatos(res.preview || []);
      setSucessoMsg(`Extração concluída com sucesso! ${res.stats.totalUnicos.toLocaleString('pt-BR')} contatos únicos deduplicados.`);
    } catch (err: unknown) {
      setErroMsg(err instanceof Error ? err.message : 'Falha ao processar contatos dos grupos selecionados');
    } finally {
      setProcessando(false);
    }
  };

  const handleExportar = async (format: 'meta' | 'excel') => {
    if (gruposSelecionados.length === 0) {
      setErroMsg('Selecione pelo menos 1 grupo antes de exportar.');
      return;
    }
    setExportando(format);
    setErroMsg(null);
    try {
      await api.exportWhatsAppContacts(gruposSelecionados, format);
      const formatoNome = format === 'meta' ? 'Meta Ads (CSV)' : 'Excel Completo (CSV)';
      setSucessoMsg(`Download da planilha no formato ${formatoNome} iniciado com sucesso!`);
    } catch (err: unknown) {
      setErroMsg(err instanceof Error ? err.message : 'Erro ao exportar arquivo');
    } finally {
      setExportando(null);
    }
  };

  const gruposFiltrados = grupos.filter(g =>
    g.nome.toLowerCase().includes(filtroBusca.toLowerCase()) ||
    g.id.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  const previewFiltrado = previewContatos.filter(c =>
    c.phone.includes(filtroTabela) ||
    c.formattedPhone.includes(filtroTabela) ||
    c.groups.some(g => g.toLowerCase().includes(filtroTabela.toLowerCase()))
  );

  const totalMembrosSelecionados = grupos
    .filter(g => gruposSelecionados.includes(g.id))
    .reduce((acc, curr) => acc + (curr.total_membros || 0), 0);

  return (
    <div className="space-y-6">
      {/* Banner Superior: Contexto Estratégico Meta Ads */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/20 p-5 sm:p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Target className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Estratégia de Aquecimento · Meta Ads + Lookalike 1%
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Extrator Inteligente de Contatos para Meta Ads
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Exporte todos os membros dos seus grupos de WhatsApp em uma planilha única, com{' '}
              <strong className="text-cyan-300">deduplicação automática</strong> e no padrão internacional{' '}
              <strong className="text-cyan-300">E.164 (55DDD...)</strong> exigido pelo Gerenciador de Anúncios. Crie um{' '}
              <span className="text-amber-300 font-semibold">Público Semelhante (Lookalike 1%)</span> e alcance mais de{' '}
              <span className="text-emerald-300 font-semibold">1,7 milhão de colecionadores reais</span> de Pokémon TCG no Brasil com seu orçamento de R$ 30,00/dia!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {conectado ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs text-emerald-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WhatsApp Conectado {userPhone ? `(${userPhone})` : ''}</span>
              </div>
            ) : (
              <button
                onClick={onOpenQrModal}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all font-semibold text-xs"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Conectar WhatsApp (QR Code)</span>
              </button>
            )}

            <button
              onClick={carregarGrupos}
              disabled={carregandoGrupos}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-white/10 text-slate-200 text-xs font-medium transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${carregandoGrupos ? 'animate-spin' : ''}`} />
              <span>Sincronizar Grupos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alertas de Sucesso ou Erro */}
      {erroMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{erroMsg}</span>
        </div>
      )}

        {sucessoMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-slate-900/60 border border-white/[0.07] rounded-xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Grupos Selecionados
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400">
              {gruposSelecionados.length}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {grupos.length} total
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/[0.07] rounded-xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Membros Brutos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-200">
              {stats ? stats.totalMembrosBrutos.toLocaleString('pt-BR') : totalMembrosSelecionados.toLocaleString('pt-BR')}
            </span>
            <span className="text-xs text-slate-500">
              nos grupos
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Únicos para o Meta</span>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">
              {stats ? stats.totalUnicos.toLocaleString('pt-BR') : '—'}
            </span>
            <span className="text-xs text-emerald-500/80 font-medium">
              sem repetição
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/[0.07] rounded-xl p-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Duplicados Removidos
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">
              {stats ? stats.totalDuplicadosRemovidos.toLocaleString('pt-BR') : '—'}
            </span>
            <span className="text-xs text-slate-500">
              eliminados
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/[0.07] rounded-xl p-4 col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Aproveitamento
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">
              {stats ? `${stats.taxaAproveitamento}%` : '—'}
            </span>
            <span className="text-xs text-slate-500">
              base líquida
            </span>
          </div>
        </div>
      </div>

      {/* Painel Principal com 2 Colunas: Seletor de Grupos e Ações de Exportação */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Lista e Seleção de Grupos (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-white/[0.07] rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Grupos de Pokémon TCG</span>
              </h3>
              <p className="text-xs text-slate-400">
                Selecione os grupos de onde os leads serão extraídos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarcarTodos}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 transition-all"
              >
                Marcar Todos
              </button>
              <button
                onClick={handleDesmarcarTodos}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-all"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Campo de Busca nos Grupos */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filtroBusca}
              onChange={e => setFiltroBusca(e.target.value)}
              placeholder="Buscar por nome do grupo..."
              className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Lista com Rolagem */}
          <div className="flex-1 max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {gruposFiltrados.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                {grupos.length === 0 ? 'Nenhum grupo encontrado no WhatsApp.' : 'Nenhum grupo corresponde ao filtro.'}
              </div>
            ) : (
              gruposFiltrados.map(grupo => {
                const isSelected = gruposSelecionados.includes(grupo.id);
                return (
                  <div
                    key={grupo.id}
                    onClick={() => handleToggleGrupo(grupo.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                        : 'bg-slate-950/40 border-white/[0.05] text-slate-400 hover:border-white/10 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {grupo.nome}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {grupo.id}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/[0.07]">
                        <Users className="w-3 h-3 text-cyan-400" />
                        {grupo.total_membros || 0}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Ações de Exportação e Estrutura Meta Ads (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card de Disparo e Download */}
          <div className="bg-slate-900/80 border border-white/[0.07] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Extrair & Baixar Planilhas</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Processe os contatos e faça o download pronto para importar
                </p>
              </div>

              <button
                onClick={handleProcessarPreview}
                disabled={processando || gruposSelecionados.length === 0}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${processando ? 'animate-spin' : ''}`} />
                <span>{processando ? 'Analisando...' : 'Analisar e Deduplicar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Botão de Exportação Meta Ads */}
              <div className="bg-gradient-to-br from-blue-950/40 to-slate-900/60 border border-blue-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>Formato Oficial Meta Ads</span>
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                      Pronto para Subir
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    Gera arquivo CSV com cabeçalhos <code className="text-cyan-300 font-mono text-[11px]">phone,country</code> no padrão internacional E.164.
                  </p>
                </div>

                <button
                  onClick={() => handleExportar('meta')}
                  disabled={exportando === 'meta' || gruposSelecionados.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${exportando === 'meta' ? 'animate-bounce' : ''}`} />
                  <span>{exportando === 'meta' ? 'Gerando...' : 'Baixar CSV para Meta Ads'}</span>
                </button>
              </div>

              {/* Botão de Exportação Excel */}
              <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Planilha Completa Excel</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      BOM UTF-8
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug">
                    Abre direto no Excel com colunas formatadas, nomes dos grupos onde o membro está e se é administrador.
                  </p>
                </div>

                <button
                  onClick={() => handleExportar('excel')}
                  disabled={exportando === 'excel' || gruposSelecionados.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
                >
                  <FileSpreadsheet className={`w-4 h-4 ${exportando === 'excel' ? 'animate-bounce' : ''}`} />
                  <span>{exportando === 'excel' ? 'Gerando...' : 'Baixar Planilha Excel'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Guia Passo a Passo: Como Subir no Meta e Ativar o Lookalike 1% */}
          <div className="bg-slate-900/80 border border-white/[0.07] rounded-2xl p-5 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Passo a Passo: Como Ativar a Nova Campanha no Meta Ads</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 border border-white/[0.05] rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px]">1</span>
                  <span>Subir a Lista</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  No Gerenciador de Anúncios, vá em <strong>Públicos</strong> &gt; <strong>Criar público</strong> &gt; <strong>Público personalizado</strong> &gt; <strong>Lista de clientes</strong>. Faça o upload do arquivo CSV do Meta.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-white/[0.05] rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-[10px]">2</span>
                  <span>Criar Lookalike 1%</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Clique com o botão direito no público criado &gt; <strong>Criar público semelhante</strong>. Escolha <strong>Brasil</strong> e selecione <strong>1%</strong> (~1,7 milhão de colecionadores com perfil idêntico).
                </p>
              </div>

              <div className="bg-slate-950/60 border border-white/[0.05] rounded-xl p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px]">3</span>
                  <span>Ativar R$ 30/dia</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Crie a campanha com objetivo de <strong>Cadastros (Leads)</strong> apontando para o Lookalike 1%. Mantivemos R$ 20/dia na antiga e R$ 30/dia para aquecer esta nova!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Pré-visualização de Contatos Deduplicados */}
      {previewContatos.length > 0 && (
        <div className="bg-slate-900/80 border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Prévia dos Contatos Deduplicados ({stats?.totalUnicos.toLocaleString('pt-BR')} registros únicos)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Mostrando os primeiros {previewContatos.length} contatos prontos para exportação
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filtroTabela}
                onChange={e => setFiltroTabela(e.target.value)}
                placeholder="Filtrar por telefone ou grupo..."
                className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.07] text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Telefone (Meta Ads E.164)</th>
                  <th className="py-2.5 px-3">Visual Formatado</th>
                  <th className="py-2.5 px-3">País</th>
                  <th className="py-2.5 px-3">Grupos Presente</th>
                  <th className="py-2.5 px-3">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-slate-300">
                {previewFiltrado.slice(0, 50).map((contato, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300">
                      {contato.phone}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-200">
                      {contato.formattedPhone}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold border border-white/[0.05]">
                        {contato.country}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate" title={contato.groups.join(', ')}>
                      <span className="text-slate-300">{contato.groups.join(', ')}</span>
                      {contato.groups.length > 1 && (
                        <span className="ml-2 bg-purple-500/20 text-purple-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-purple-500/30">
                          {contato.groups.length} grupos
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {contato.isAdmin ? (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                          Admin
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Membro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
