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
  Share2,
  Wand2
} from 'lucide-react';
import { api } from '../services/api.ts';

interface EstudioIaViewProps {
  onDispararSucesso?: (enviados: number) => void;
}

export const EstudioIaView: React.FC<EstudioIaViewProps> = ({ onDispararSucesso }) => {
  const [rascunho, setRascunho] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modelos gerados
  const [modeloUrgencia, setModeloUrgencia] = useState('');
  const [modeloComunidade, setModeloComunidade] = useState('');
  const [linkAfiliado, setLinkAfiliado] = useState('');
  const [fonte, setFonte] = useState<'deepseek' | 'fallback_local' | null>(null);

  // Estados de cópia e disparo
  const [copiadoUrgencia, setCopiadoUrgencia] = useState(false);
  const [copiadoComunidade, setCopiadoComunidade] = useState(false);
  const [disparandoUrgencia, setDisparandoUrgencia] = useState(false);
  const [disparandoComunidade, setDisparandoComunidade] = useState(false);
  const [sucessoDisparo, setSucessoDisparo] = useState<string | null>(null);

  // Exemplos rápidos para 1 clique
  const exemplosRapidos = [
    {
      label: '⚡ Box 36 Boosters',
      texto: 'Promoção muito boa da Box 36 pacotes por 180 reais usando cupom POKEMON10 na Shopee com frete gratis',
      link: 'https://shopee.com.br/product/123/456'
    },
    {
      label: '📦 25 Toploader Cristal',
      texto: '25 Toploader Cristal protetor rígido para cartas raras por R$ 37 com envio full no Mercado Livre',
      link: 'https://mercadolivre.com.br/sec/exemplo'
    },
    {
      label: '🔥 ETB Coleção Especial',
      texto: 'Elite Trainer Box ETB com 10 boosters e sleeves especiais saindo por 249 no pix cupom limitado',
      link: 'https://amazon.com.br/dp/B0EXEMPLO'
    }
  ];

  const handleAplicarExemplo = (ex: { texto: string; link: string }) => {
    setRascunho(ex.texto);
    setLink(ex.link);
    setErro(null);
  };

  const handleGerar = async () => {
    if (!rascunho.trim()) {
      setErro('Por favor, digite ou cole uma frase ou ideia de promoção.');
      return;
    }

    setLoading(true);
    setErro(null);
    setSucessoDisparo(null);

    try {
      const resp = await api.redigirOfertaIA(rascunho.trim(), link.trim() || undefined);
      if (resp && resp.ok) {
        setModeloUrgencia(resp.modeloUrgencia || '');
        setModeloComunidade(resp.modeloComunidade || '');
        setLinkAfiliado(resp.linkAfiliado || '');
        setFonte(resp.fonte || 'deepseek');
      } else {
        setErro(resp?.erro || 'Não foi possível gerar a copy. Tente novamente.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro de conexão ao contatar o motor de IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = async (texto: string, tipo: 'urgencia' | 'comunidade') => {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === 'urgencia') {
        setCopiadoUrgencia(true);
        setTimeout(() => setCopiadoUrgencia(false), 2000);
      } else {
        setCopiadoComunidade(true);
        setTimeout(() => setCopiadoComunidade(false), 2000);
      }
    } catch {
      // Falha silenciosa de clipboard
    }
  };

  const handleDisparar = async (texto: string, tipo: 'urgencia' | 'comunidade') => {
    if (!texto.trim()) return;

    if (tipo === 'urgencia') setDisparandoUrgencia(true);
    else setDisparandoComunidade(true);

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
        setErro(resp?.mensagem || 'Falha ao disparar para os grupos. Verifique a conexão com o WhatsApp.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro de comunicação ao disparar para o WhatsApp.');
    } finally {
      if (tipo === 'urgencia') setDisparandoUrgencia(false);
      else setDisparandoComunidade(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Informativo */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Estúdio IA de Redação Rápida
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DeepSeek v4.1 • OpenCode
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Escreva apenas a ideia solta ou detalhes básicos da promoção. O DeepSeek v4.1 aplica automaticamente a identidade visual oficial (<span className="text-amber-300 font-mono">@pokemon_tcg_promo</span>), emojis de alto impacto e formatação de preço, gerando 2 opções prontas para disparar direto aos grupos em 1 clique.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Fallback Local 0ms Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Caixa de Entrada e Rascunho */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              O que você quer postar? (Rascunho Livre)
            </label>
            <span className="text-[11px] text-slate-400">
              {rascunho.length} caracteres
            </span>
          </div>
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder="Exemplo: promoção muito boa da box 36 pacotes de escarlate e violeta por 180 reais cupom POKEMON10 na shopee com frete gratis..."
            rows={4}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all resize-y"
          />
        </div>

        {/* Link Opcional */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            Link do Produto / Loja (Opcional — detectado automaticamente se já estiver no rascunho)
          </label>
          <input
            type="text"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://mercadolivre.com.br/sec/... ou https://shopee.com.br/..."
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono text-xs"
          />
        </div>

        {/* Pílulas de Exemplos Rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold">Exemplos rápidos:</span>
          {exemplosRapidos.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAplicarExemplo(ex)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all flex items-center gap-1"
            >
              {ex.label}
            </button>
          ))}
          {rascunho && (
            <button
              type="button"
              onClick={() => {
                setRascunho('');
                setLink('');
              }}
              className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-400 transition-all ml-auto"
            >
              Limpar campos
            </button>
          )}
        </div>

        {/* Mensagens de Alerta ou Erro */}
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

        {/* Botão de Ação Principal */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={loading || !rascunho.trim()}
            onClick={handleGerar}
            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
              loading || !rascunho.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 hover:shadow-amber-500/20 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Redigindo com DeepSeek v4.1...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                ✨ Redigir com DeepSeek v4.1
              </>
            )}
          </button>
        </div>
      </div>

      {/* Resultados Gerados (2 Modelos) */}
      {(modeloUrgencia || modeloComunidade) && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-400" />
                Modelos Prontos para Publicação
              </h3>
              {fonte && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    fonte === 'deepseek'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                  }`}
                >
                  {fonte === 'deepseek' ? '✨ DeepSeek v4.1' : '⚡ Motor Fallback Local'}
                </span>
              )}
            </div>

            {linkAfiliado && (
              <div className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-md">
                <span className="text-slate-500">Link Oficial:</span>
                <a
                  href={linkAfiliado}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline truncate"
                >
                  {linkAfiliado}
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CARD 1: MODELO URGÊNCIA */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-yellow-500" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                      <Flame className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Opção 1: Alerta & Urgência</h4>
                      <p className="text-[11px] text-slate-400">Gatilho de rapidez, cupom e estoque</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopiar(modeloUrgencia, 'urgencia')}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiadoUrgencia ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Balão WhatsApp Prévia & Edição */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Prévia Editável (Você pode ajustar qualquer detalhe antes de enviar):
                  </span>
                  <textarea
                    value={modeloUrgencia}
                    onChange={(e) => setModeloUrgencia(e.target.value)}
                    rows={10}
                    className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3.5 font-sans text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-amber-400/50 resize-y selection:bg-[#00a884]/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={disparandoUrgencia || !modeloUrgencia.trim()}
                  onClick={() => handleDisparar(modeloUrgencia, 'urgencia')}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    disparandoUrgencia
                      ? 'bg-slate-800 text-slate-400 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-600/30 active:scale-[0.99]'
                  }`}
                >
                  {disparandoUrgencia ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Disparando para os grupos...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      🚀 Disparar Opção 1 para os Grupos
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* CARD 2: MODELO COMUNIDADE */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Zap className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">Opção 2: Comunidade & Curadoria</h4>
                      <p className="text-[11px] text-slate-400">Tom de garimpo manual e preço justo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopiar(modeloComunidade, 'comunidade')}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiadoComunidade ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Balão WhatsApp Prévia & Edição */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    Prévia Editável (Você pode ajustar qualquer detalhe antes de enviar):
                  </span>
                  <textarea
                    value={modeloComunidade}
                    onChange={(e) => setModeloComunidade(e.target.value)}
                    rows={10}
                    className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3.5 font-sans text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-cyan-400/50 resize-y selection:bg-[#00a884]/30"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={disparandoComunidade || !modeloComunidade.trim()}
                  onClick={() => handleDisparar(modeloComunidade, 'comunidade')}
                  className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                    disparandoComunidade
                      ? 'bg-slate-800 text-slate-400 cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-emerald-600/30 active:scale-[0.99]'
                  }`}
                >
                  {disparandoComunidade ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Disparando para os grupos...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      🚀 Disparar Opção 2 para os Grupos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
