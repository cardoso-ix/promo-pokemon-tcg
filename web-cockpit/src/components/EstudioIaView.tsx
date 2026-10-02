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
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api.ts';

interface EstudioIaViewProps {
  onDispararSucesso?: (enviados: number) => void;
}

export const EstudioIaView: React.FC<EstudioIaViewProps> = ({ onDispararSucesso }) => {
  // Modo ativo: 'chamada' (padrão ultra-rápido) ou 'anuncio' (com link de produto)
  const [modo, setModo] = useState<'chamada' | 'anuncio'>('chamada');

  const [rascunho, setRascunho] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Modelos e opções geradas
  const [opcoesChamada, setOpcoesChamada] = useState<string[]>([]);
  const [modeloUrgencia, setModeloUrgencia] = useState('');
  const [modeloComunidade, setModeloComunidade] = useState('');
  const [linkAfiliado, setLinkAfiliado] = useState('');
  const [fonte, setFonte] = useState<'deepseek' | 'fallback_local' | null>(null);

  // Feedback de cópia e disparo
  const [copiadoIdx, setCopiadoIdx] = useState<number | null>(null);
  const [disparandoIdx, setDisparandoIdx] = useState<number | null>(null);
  const [sucessoDisparo, setSucessoDisparo] = useState<string | null>(null);

  // Exemplos rápidos para chamadas curtas
  const exemplosChamadas = [
    'PROMO BOA PESSOAL 5 UNIDADES',
    'Aproveitem que tá acabando rápido',
    'Galera baixou muito corre',
    'Chegou reposição poucas unidades no estoque'
  ];

  // Exemplos rápidos para anúncio completo
  const exemplosAnuncios = [
    {
      label: '⚡ Box 36 Boosters',
      texto: 'Promoção muito boa da Box 36 pacotes por 180 reais usando cupom POKEMON10 com frete gratis',
      link: 'https://mercadolivre.com.br/sec/exemplo'
    },
    {
      label: '📦 25 Toploader Cristal',
      texto: '25 Toploader Cristal protetor rígido por R$ 37 com envio full',
      link: 'https://mercadolivre.com.br/sec/exemplo'
    }
  ];

  const handleGerar = async () => {
    if (!rascunho.trim()) {
      setErro('Por favor, digite o que você quer falar para a IA embelezar.');
      return;
    }

    setLoading(true);
    setErro(null);
    setSucessoDisparo(null);

    try {
      const resp = await api.redigirOfertaIA(
        rascunho.trim(),
        modo === 'anuncio' ? (link.trim() || undefined) : undefined,
        modo
      );

      if (resp && resp.ok) {
        if (resp.modo === 'chamada' || (resp.opcoes && resp.opcoes.length > 0)) {
          setOpcoesChamada(resp.opcoes || [resp.modeloUrgencia, resp.modeloComunidade].filter(Boolean));
        } else {
          setModeloUrgencia(resp.modeloUrgencia || '');
          setModeloComunidade(resp.modeloComunidade || '');
          setLinkAfiliado(resp.linkAfiliado || '');
        }
        setFonte(resp.fonte || 'deepseek');
      } else {
        setErro(resp?.erro || 'Não foi possível gerar as mensagens. Tente novamente.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro de conexão ao contatar o motor de IA.');
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
      // Ignora falha silenciosa
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
        setErro(resp?.mensagem || 'Falha ao disparar para os grupos. Verifique a conexão com o WhatsApp.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Erro ao disparar para o WhatsApp.');
    } finally {
      setDisparandoIdx(null);
    }
  };

  const handleAtualizarOpcao = (novoTexto: string, idx: number) => {
    setOpcoesChamada(prev => {
      const copia = [...prev];
      copia[idx] = novoTexto;
      return copia;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Seletor de Modo */}
      <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-cyan-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Estúdio IA de Chamadas Rápidas
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DeepSeek v4.1 • Ultra-Rápido
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Digite uma frase solta (ex: <span className="text-amber-300 font-semibold">"PROMO BOA PESSOAL 5 UNIDADES"</span>) e a IA gera chamadas curtas, bonitas e com emojis, prontas para disparar direto aos grupos pelo site.
            </p>
          </div>

          {/* Alternador de Modo (Abas Internas) */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/70 border border-white/10 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                setModo('chamada');
                setOpcoesChamada([]);
                setErro(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                modo === 'chamada'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              ⚡ Chamada Rápida (Sem Links)
            </button>
            <button
              type="button"
              onClick={() => {
                setModo('anuncio');
                setOpcoesChamada([]);
                setErro(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                modo === 'anuncio'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              📦 Anúncio Completo com Link
            </button>
          </div>
        </div>
      </div>

      {/* Caixa de Entrada e Rascunho */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Wand2 className="w-4 h-4 text-amber-400" />
              {modo === 'chamada' ? 'O que você quer falar no grupo?' : 'Rascunho da Promoção:'}
            </label>
            <span className="text-[11px] text-slate-400">
              {rascunho.length} caracteres
            </span>
          </div>
          <textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            placeholder={
              modo === 'chamada'
                ? 'Exemplo: PROMO BOA PESSOAL 5 UNIDADES ou corram que baixou muito o preço agora...'
                : 'Exemplo: Box 36 pacotes por 180 reais usando cupom POKEMON10 na shopee...'
            }
            rows={modo === 'chamada' ? 3 : 4}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 transition-all resize-y"
          />
        </div>

        {/* Campo de Link (Exibido apenas no modo anúncio) */}
        {modo === 'anuncio' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              Link do Produto (Opcional):
            </label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://mercadolivre.com.br/sec/..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition-all font-mono text-xs"
            />
          </div>
        )}

        {/* Pílulas de Exemplos Rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-400 font-semibold">Exemplos de 1 clique:</span>
          {modo === 'chamada' ? (
            exemplosChamadas.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRascunho(ex);
                  setErro(null);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all flex items-center gap-1"
              >
                "{ex}"
              </button>
            ))
          ) : (
            exemplosAnuncios.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setRascunho(ex.texto);
                  setLink(ex.link);
                  setErro(null);
                }}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] transition-all flex items-center gap-1"
              >
                {ex.label}
              </button>
            ))
          )}

          {rascunho && (
            <button
              type="button"
              onClick={() => {
                setRascunho('');
                setLink('');
              }}
              className="text-xs px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-400 transition-all ml-auto"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Alertas e Notificações */}
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

        {/* Botão Principal de Geração */}
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
                Embelezando texto com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {modo === 'chamada' ? '✨ Embelezar Chamada com Emojis' : '✨ Redigir Anúncio Completo'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* RESULTADOS: MODO CHAMADA RÁPIDA (3 Opções Diretas) */}
      {modo === 'chamada' && opcoesChamada.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Chamadas Geradas (Escolha e Dispare em 1 Clique)
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
            <span className="text-xs text-slate-400">
              {opcoesChamada.length} opções prontas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opcoesChamada.map((textoOpcao, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    {idx === 0 ? <Flame className="w-3.5 h-3.5 text-rose-400" /> : idx === 1 ? <Zap className="w-3.5 h-3.5 text-yellow-400" /> : <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
                    Opção {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopiar(textoOpcao, idx)}
                    className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    {copiadoIdx === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-[11px]">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="text-[11px]">Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Área de texto editável simulando balão WhatsApp */}
                <textarea
                  value={textoOpcao}
                  onChange={(e) => handleAtualizarOpcao(e.target.value, idx)}
                  rows={4}
                  className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3 text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-amber-400/50 resize-y selection:bg-[#00a884]/30"
                />

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

      {/* RESULTADOS: MODO ANÚNCIO COMPLETO COM PRODUTO E LINK */}
      {modo === 'anuncio' && (modeloUrgencia || modeloComunidade) && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Modelos de Anúncio com Link
              </h3>
              {fonte && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
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
            {/* CARD 1: URGÊNCIA */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-rose-500/20 text-rose-400">
                      <Flame className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-white">Opção 1: Alerta & Urgência</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopiar(modeloUrgencia, 101)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1"
                  >
                    {copiadoIdx === 101 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoIdx === 101 ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <textarea
                  value={modeloUrgencia}
                  onChange={(e) => setModeloUrgencia(e.target.value)}
                  rows={8}
                  className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3.5 text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-amber-400/50 resize-y"
                />
              </div>

              <button
                type="button"
                disabled={disparandoIdx === 101 || !modeloUrgencia.trim()}
                onClick={() => handleDisparar(modeloUrgencia, 101)}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg"
              >
                {disparandoIdx === 101 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                🚀 Disparar Opção 1 para os Grupos
              </button>
            </div>

            {/* CARD 2: COMUNIDADE */}
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                      <Zap className="w-4 h-4" />
                    </span>
                    <h4 className="text-sm font-bold text-white">Opção 2: Comunidade & Curadoria</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopiar(modeloComunidade, 102)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-semibold flex items-center gap-1"
                  >
                    {copiadoIdx === 102 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoIdx === 102 ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                <textarea
                  value={modeloComunidade}
                  onChange={(e) => setModeloComunidade(e.target.value)}
                  rows={8}
                  className="w-full bg-[#0d1418] border border-[#1f2c34] rounded-xl p-3.5 text-xs text-[#e9edef] leading-relaxed focus:outline-none focus:border-cyan-400/50 resize-y"
                />
              </div>

              <button
                type="button"
                disabled={disparandoIdx === 102 || !modeloComunidade.trim()}
                onClick={() => handleDisparar(modeloComunidade, 102)}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg"
              >
                {disparandoIdx === 102 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                🚀 Disparar Opção 2 para os Grupos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
