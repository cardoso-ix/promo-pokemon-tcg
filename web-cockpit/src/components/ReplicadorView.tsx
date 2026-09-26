import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Search,
  Filter,
  Copy,
  QrCode,
  Settings,
  Sparkles,
  Send,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Layers,
  KeyRound
} from 'lucide-react';
import type { OfertaLog, RotaGrupo, SubTabReplica } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';

interface ReplicadorViewProps {
  onOpenCookieModal: () => void;
}

export const ReplicadorView: React.FC<ReplicadorViewProps> = ({ onOpenCookieModal }) => {
  const [subTab, setSubTab] = useState<SubTabReplica>('feed');
  const [logs, setLogs] = useState<OfertaLog[]>([]);
  const [rotas, setRotas] = useState<RotaGrupo[]>([]);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'enviado' | 'ignorado'>('todos');
  const [loading, setLoading] = useState(false);
  const { status, isMeliValid } = useUnifiedStatus();

  // Estados do Gerador de Anúncio
  const [geradorLink, setGeradorLink] = useState('');
  const [geradorDe, setGeradorDe] = useState('');
  const [geradorPor, setGeradorPor] = useState('');
  const [geradorCupom, setGeradorCupom] = useState('');
  const [geradorPreview, setGeradorPreview] = useState('');
  const [geradorFoto, setGeradorFoto] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  // Carregar dados
  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 4000);
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    try {
      const results = await Promise.allSettled([
        api.getReplicaLogs(80),
        api.getRotas(),
        api.getReplicaConfig()
      ]);
      if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) {
        setLogs(results[0].value);
      }
      if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
        setRotas(results[1].value);
      }
      if (results[2].status === 'fulfilled' && typeof results[2].value === 'object' && results[2].value !== null) {
        setConfigs(results[2].value);
      }
    } catch {
      // Ignorar falhas transitórias
    }
  };

  const handleToggleRota = async (id: number, ativoAtual: boolean) => {
    try {
      await api.toggleRota(id, !ativoAtual);
      setRotas(prev => prev.map(r => (r.id === id ? { ...r, ativo: !ativoAtual, ativa: !ativoAtual } : r)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao alterar rota');
    }
  };

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveReplicaConfig(configs);
      alert('Configurações salvas com sucesso!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleGerarPreview = async () => {
    if (!geradorLink) return alert('Por favor, informe um link do produto!');
    setGerando(true);
    try {
      const res = await api.gerarAnuncio({
        link: geradorLink,
        precoDe: geradorDe ? parseFloat(geradorDe.replace(',', '.')) : undefined,
        precoPor: geradorPor ? parseFloat(geradorPor.replace(',', '.')) : undefined,
        cupom: geradorCupom || undefined
      });
      setGeradorPreview(res.mensagem);
      setGeradorFoto(res.fotoUrl || null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao gerar anúncio');
    } finally {
      setLoading(false);
    }
  };

  const handleDispararAnuncio = async () => {
    if (!geradorPreview) return alert('Gere o anúncio primeiro!');
    if (!confirm('Deseja realmente disparar este anúncio para todas as rotas ativas?')) return;
    try {
      const res = await api.dispararAnuncio(geradorPreview, geradorFoto || undefined);
      alert(`Anúncio disparado com sucesso para ${res.enviados} grupos!`);
      setGeradorLink('');
      setGeradorDe('');
      setGeradorPor('');
      setGeradorCupom('');
      setGeradorPreview('');
      setGeradorFoto(null);
      carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha no disparo');
    }
  };

  const filteredLogs = logs.filter(log => {
    const texto = (log.texto || '').toLowerCase();
    const origem = (log.origem || '').toLowerCase();
    const termo = (busca || '').toLowerCase().trim();
    const matchBusca = !termo || texto.includes(termo) || origem.includes(termo);
    const matchStatus = filtroStatus === 'todos' || log.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const replicaWa = status?.replica?.whatsapp;
  const isConectado = replicaWa?.status === 'connected';

  return (
    <div className="space-y-6">
      {/* Top Banner Replicador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-cyan-950/60 to-slate-900/80 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
              Replicador Autônomo TCG
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  isConectado
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {isConectado ? '● WhatsApp Online' : '○ Aguardando Conexão'}
              </span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">
                Monitoramento 24/7 de grupos, conversão automática para link de afiliado meli.la e filtro inteligente.
              </p>
              {!isMeliValid && (
                <button
                  onClick={onOpenCookieModal}
                  className="px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Renovar Cookie ML</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Navegação */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] overflow-x-auto">
          <button
            onClick={() => setSubTab('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'feed'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Feed ao Vivo
          </button>
          <button
            onClick={() => setSubTab('rotas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'rotas'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Rotas ({rotas.length})
          </button>
          <button
            onClick={() => setSubTab('gerador')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'gerador'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Gerador de Anúncios
          </button>
          <button
            onClick={() => setSubTab('conectar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'conectar'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Conectar WhatsApp
          </button>
          <button
            onClick={() => setSubTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subTab === 'config'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            Ajustes
          </button>
        </div>
      </div>

      {/* Conteúdo da Sub-Aba Selecionada */}
      {subTab === 'feed' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por produto, código ou grupo..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Status:
              </span>
              <button
                onClick={() => setFiltroStatus('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filtroStatus === 'todos' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFiltroStatus('enviado')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filtroStatus === 'enviado' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400'
                }`}
              >
                Enviados
              </button>
              <button
                onClick={() => setFiltroStatus('ignorado')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filtroStatus === 'ignorado' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
                }`}
              >
                Ignorados / Filtro
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                Nenhuma mensagem encontrada para o filtro selecionado.
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col md:flex-row items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {log.origem}
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        → Destino: {log.destino}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(log.criado_em).toLocaleString('pt-BR')}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'enviado'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.status === 'enviado' ? '✓ Enviado' : log.motivo || 'Ignorado'}
                      </span>
                    </div>

                    <p className="text-slate-200 text-xs font-mono whitespace-pre-line bg-black/30 p-3 rounded-lg border border-white/[0.03]">
                      {log.texto}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(log.texto);
                      alert('Texto da oferta copiado com sucesso!');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-slate-300 hover:text-white transition-all whitespace-nowrap self-end md:self-start"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Post</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub-Aba: Rotas de Grupos */}
      {subTab === 'rotas' && (
        <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Rotas de Grupos Configuradas
              </h3>
              <p className="text-xs text-slate-400">
                O replicador escuta mensagens nos grupos de Origem e encaminha convertidas para o Destino.
              </p>
            </div>
            <button
              onClick={carregarDados}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>

          {rotas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm glass-panel rounded-xl border border-white/[0.04]">
              Nenhuma rota configurada no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rotas.map(rota => {
                const totalOrigens = rota.origens?.length || (rota.origem_id ? 1 : 0);
                const totalDestinos = rota.destinos?.length || (rota.destino_id ? 1 : 0);
                const isRotaAtiva = Boolean(rota.ativo ?? rota.ativa);

                return (
                  <div
                    key={rota.id}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 text-xs flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{rota.nome || rota.origem_nome}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isRotaAtiva
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-white/10'
                          }`}
                        >
                          {isRotaAtiva ? '✓ Ativa' : '○ Pausada'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-medium">
                          {totalOrigens} grupo(s) origem
                        </span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-medium">
                          {totalDestinos} grupo(s) destino
                        </span>
                      </div>

                      {rota.origem_id && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          ID: {(rota.origem_id || '').slice(0, 22)}...
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleRota(rota.id, isRotaAtiva)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isRotaAtiva
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-white/10 hover:bg-slate-700'
                      }`}
                    >
                      {isRotaAtiva ? (
                        <>
                          <ToggleRight className="w-4 h-4 text-emerald-400" />
                          <span>Ativa</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 text-slate-500" />
                          <span>Pausada</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Aba: Gerador de Anúncios */}
      {subTab === 'gerador' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4">
            <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Criar Anúncio Promocional TCG
            </h3>
            <p className="text-xs text-slate-400">
              Cole o link do produto (Mercado Livre ou Shopee). O sistema extrai as fotos e formata a copy oficial.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Link do Anúncio ou Produto:</label>
                <input
                  type="url"
                  placeholder="https://mercadolivre.com/..."
                  value={geradorLink}
                  onChange={e => setGeradorLink(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preço DE (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: 180,00"
                    value={geradorDe}
                    onChange={e => setGeradorDe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Preço POR (Opcional):</label>
                  <input
                    type="text"
                    placeholder="Ex: 124,90"
                    value={geradorPor}
                    onChange={e => setGeradorPor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Cupom de Desconto (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: MELI15"
                  value={geradorCupom}
                  onChange={e => setGeradorCupom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <button
                onClick={handleGerarPreview}
                disabled={gerando}
                className="w-full py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50"
              >
                {gerando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{gerando ? 'Processando dados...' : 'Gerar Prévia da Mensagem'}</span>
              </button>
            </div>
          </div>

          {/* Prévia Estilo WhatsApp */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Prévia do Balão do WhatsApp
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                É assim que a mensagem chegará aos membros dos seus grupos.
              </p>

              {geradorPreview ? (
                <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs font-mono text-slate-100 whitespace-pre-line space-y-3 shadow-xl">
                  {geradorFoto && (
                    <img
                      src={geradorFoto}
                      alt="Produto"
                      className="w-full h-44 object-cover rounded-lg border border-white/10"
                    />
                  )}
                  <p>{geradorPreview}</p>
                </div>
              ) : (
                <div className="h-60 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                  <span>Nenhuma prévia gerada ainda.</span>
                </div>
              )}
            </div>

            {geradorPreview && (
              <button
                onClick={handleDispararAnuncio}
                className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Send className="w-4 h-4" />
                <span>Disparar Imediatamente para Grupos de Destino</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sub-Aba: Conectar WhatsApp */}
      {subTab === 'conectar' && (
        <div className="glass-panel rounded-2xl p-8 border border-white/[0.08] max-w-xl mx-auto text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <QrCode className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-heading font-bold text-white">Pareamento do WhatsApp · Replicador</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Abra o WhatsApp no seu smartphone em <strong>Aparelhos Conectados &gt; Conectar Aparelho</strong> e aponte a câmera.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl w-64 h-64 mx-auto flex items-center justify-center shadow-2xl border-4 border-cyan-500/30 relative">
            {replicaWa?.qrDataUrl ? (
              <img
                src={replicaWa.qrDataUrl}
                alt="QR Code WhatsApp"
                className="w-full h-full object-contain"
              />
            ) : isConectado ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600">
                <CheckCircle className="w-12 h-12" />
                <span className="text-xs font-bold font-sans">Chip Conectado!</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
                <span>Gerando QR Code...</span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConectado ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-amber-400'
              }`}
            />
            <span>Status: {isConectado ? 'Conectado e operacional' : 'Aguardando leitura do QR Code'}</span>
          </div>
        </div>
      )}

      {/* Sub-Aba: Ajustes & Afiliado */}
      {subTab === 'config' && (
        <form onSubmit={handleSalvarConfig} className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4 max-w-2xl mx-auto">
          <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-400" />
            Configurações Globais & Afiliado
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Tag Matt Word (Mercado Livre):</label>
              <input
                type="text"
                value={configs['matt_word'] || ''}
                onChange={e => setConfigs({ ...configs, matt_word: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Tag Matt Tool (Mercado Livre):</label>
              <input
                type="text"
                value={configs['matt_tool'] || ''}
                onChange={e => setConfigs({ ...configs, matt_tool: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Delay Entre Postagens (segundos):</label>
                <input
                  type="number"
                  value={configs['delay_postagem_segundos'] || '5'}
                  onChange={e => setConfigs({ ...configs, delay_postagem_segundos: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Horário de Abertura Diária:</label>
                <input
                  type="time"
                  value={configs['msg_abertura_horario'] || '11:11'}
                  onChange={e => setConfigs({ ...configs, msg_abertura_horario: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
