import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Zap,
  Flame,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wand2,
  MessageSquare,
  Link2,
  Trash2,
  Smartphone
} from 'lucide-react';
import { api } from '../services/api.ts';

interface EstudioIaViewProps {
  onDispararSucesso?: (enviados: number) => void;
}

export const EstudioIaView: React.FC<EstudioIaViewProps> = ({ onDispararSucesso }) => {
  const [rascunho, setRascunho] = useState('');
  const [link, setLink] = useState('');
  const [mostrarLink, setMostrarLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Opções polidas pela IA
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [fonte, setFonte] = useState<'deepseek' | 'fallback_local' | null>(null);

  // Estados de ação do usuário
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);
  const [disparandoIdx, setDisparandoIdx] = useState<number | null>(null);
  const [sucessoDisparo, setSucessoDisparo] = useState<string | null>(null);

  // Exemplos rápidos e práticos para testar em 1 toque (mobile-friendly)
  const exemplosRapidos = [
    'PROMO BOA PESSOAL 5 UNIDADES',
    'Aproveitem que ta acabando rapido',
    'Galera baixou muito o preco corre',
    'Chegou reposicao poucas unidades no estoque'
  ];

  const handleGerar = async () => {
    if (!rascunho.trim()) {
      setErro('Por favor, digite uma mensagem para a IA melhorar.');
      return;
    }

    setLoading(true);
    setErro(null);
    setSucessoDisparo(null);

    try {
      const resp = await api.redigirOfertaIA(
        rascunho.trim(),
        link.trim() || undefined,
        link.trim() ? 'anuncio' : 'chamada'
      );

      if (resp && resp.ok) {
        const lista = resp.opcoes && resp.opcoes.length > 0
          ? resp.opcoes
          : [resp.modeloUrgencia, resp.modeloComunidade].filter(Boolean);

        setOpcoes(lista);
        setFonte(resp.fonte || 'deepseek');
      } else {
        setErro(resp?.erro || 'Não foi possível melhorar a mensagem. Tente novamente.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro de conexão ao processar o texto com a IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = async (texto: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoIdx(idx);
      setTimeout(() => setCopiadoIdx(null), 2000);
    } catch {
      // Fallback para clipboard seguro
    }
  };

  const handleDisparar = async (texto: string, idx: number) => {
    if (!texto.trim()) return;

    setDisparandoIdx(idx);
    setSucessoDisparo(null);
    setErro(null);

    try {
      const resp = await api.dispararOfertaIA(texto.trim());
      if (resp && resp.ok) {
        setSucessoDisparo(`🚀 Mensagem enviada com sucesso para ${resp.enviados} grupo(s) ativos!`);
        if (onDispararSucesso) {
          onDispararSucesso(resp.enviados);
        }
      } else {
        setErro(resp?.mensagem || 'Falha ao disparar para os grupos. Verifique se o WhatsApp está conectado.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao disparar para o WhatsApp.');
    } finally {
      setDisparandoIdx(null);
    }
  };

  const handleAtualizarOpcao = (novoTexto: string, idx: number) => {
    setOpcoes(prev => {
      const copia = [...prev];
      copia[idx] = novoTexto;
      return copia;
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Apresentação */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Estúdio de IA • Polimento & Redação
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DeepSeek v4.1
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Digite seu recado ou aviso normalmente. A IA corrige a digitação, pontua, insere emojis profissionais e prepara versões prontas para disparar aos grupos em 1 toque.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-400">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>Otimizado para Mobile & Desktop</span>
          </div>
        </div>
      </div>

      {/* Caixa de Entrada Principal */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              O que você quer falar no grupo?
            </label>
            <span className="text-[11px] text-slate-400">
              {rascunho.length} caracteres
            </span>
          </div>

          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder="Exemplo: fala pessoal chegou reposicao de booster box corram pq ta acabando rapido..."
            rows={3}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all resize-y min-h-[90px]"
          />
        </div>

        {/* Campo Opcional de Link (Discreto e Colapsável) */}
        <div>
          {!mostrarLink && !link ? (
            <button
              type="button"
              onClick={() => setMostrarLink(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors py-1"
            >
              <Link2 className="w-3.5 h-3.5" />
              + Anexar link de afiliado ou produto (opcional)
            </button>
          ) : (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  Link do Produto / Vitrine (Opcional):
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setLink('');
                    setMostrarLink(false);
                  }}
                  className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Remover link
                </button>
              </div>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://mercadolivre.com.br/sec/..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono"
              />
            </div>
          )}
        </div>

        {/* Pílulas de Exemplos de 1 Toque (Horizontal Scroll no Mobile) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Exemplos rápidos:</span>
            {rascunho && (
              <button
                type="button"
                onClick={() => {
                  setRascunho('');
                  setLink('');
                  setErro(null);
                }}
                className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
            {exemplosRapidos.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRascunho(ex);
                  setErro(null);
                }}
                className="text-xs shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all"
              >
                "{ex}"
              </button>
            ))}
          </div>
        </div>

        {/* Feedback de Erro ou Sucesso */}
        {erro && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{erro}</span>
          </div>
        )}

        {sucessoDisparo && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{sucessoDisparo}</span>
          </div>
        )}

        {/* Botão de Geração / Polimento */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={loading || !rascunho.trim()}
            onClick={handleGerar}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              loading || !rascunho.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 hover:shadow-amber-500/20 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Melhorando digitação e emojis...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Melhorar Mensagem com IA
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTADOS: CARDS POLIDOS COM BALÃO WHATSAPP E DISPARO EM 1 TOQUE */}
      {opcoes.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Opções Prontas ({opcoes.length})
              </h3>
              {fonte && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    fonte === 'deepseek'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                  }`}
                >
                  {fonte === 'deepseek' ? '✨ DeepSeek IA' : '⚡ Motor Fallback'}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              Escolha a versão que mais gostar, edite se quiser e dispare
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opcoes.map((textoOpcao, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    {idx === 0 ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : idx === 1 ? (
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    {idx === 0
                      ? 'Opção 1 • Fluida & Equilibrada'
                      : idx === 1
                      ? 'Opção 2 • Destaque & Energia'
                      : `Opção ${idx + 1} • Direta`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopiar(textoOpcao, idx)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiadoIdx === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Balão WhatsApp Fiel e Editável */}
                <div className="space-y-1.5">
                  <textarea
                    value={textoOpcao}
                    onChange={(e) => handleAtualizarOpcao(e.target.value, idx)}
                    rows={5}
                    className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3 text-xs sm:text-sm text-[#e9edef] leading-relaxed focus:outline-none focus:border-amber-400/50 resize-y selection:bg-[#00a884]/30"
                  />
                  <p className="text-[10px] text-slate-500">
                    💡 Você pode ajustar qualquer palavra no texto acima antes de enviar.
                  </p>
                </div>

                {/* Botão de Disparo em 1 Clique */}
                <button
                  type="button"
                  disabled={disparandoIdx === idx || !textoOpcao.trim()}
                  onClick={() => handleDisparar(textoOpcao, idx)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                    disparandoIdx === idx
                      ? 'bg-slate-800 text-slate-400 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-600/30 active:scale-[0.99]'
                  }`}
                >
                  {disparandoIdx === idx ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Disparando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      🚀 Disparar para os Grupos
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
