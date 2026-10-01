import React, { useState } from 'react';
import {
  Search,
  Zap,
  ShieldCheck,
  Truck,
  CreditCard,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Loader2,
  MessageSquare,
  Share2
} from 'lucide-react';
import type { RadarItem, RadarBuscaFiltros } from '../types/index.ts';
import { api } from '../services/api.ts';

export const RadarPrecosView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<RadarItem[]>([]);
  const [totalEncontrados, setTotalEncontrados] = useState<number | null>(null);

  // Filtros
  const [filtros, setFiltros] = useState<RadarBuscaFiltros>({
    apenasOficiaisOuPlatinum: true,
    apenasNovos: true,
    apenasFreteGratis: false,
    apenasFull: false,
    apenasSemJuros: false,
    ordenarPor: 'price_asc'
  });

  // Estado de feedback de cópia por item
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [modalCopy, setModalCopy] = useState<{ titulo: string; texto: string } | null>(null);

  const sugestoesRapidas = [
    'Coleção 30 Anos Poster Box',
    'Booster Box 360',
    'Elite Trainer Box Destinos de Paldea',
    'Fichario 30 anos',
    'Box Charizard ex'
  ];

  const executarBusca = async (termoParaBuscar?: string, filtrosOverride?: RadarBuscaFiltros) => {
    const q = (termoParaBuscar !== undefined ? termoParaBuscar : query).trim();
    if (!q) {
      setErro('Por favor, digite o nome do produto ou cole um link do Mercado Livre.');
      return;
    }

    setLoading(true);
    setErro(null);

    const f = filtrosOverride || filtros;

    try {
      const res = await api.buscarRadar(q, f);
      if (res.ok) {
        setItens(res.itens);
        setTotalEncontrados(res.total);
        if (res.itens.length === 0) {
          setErro('Nenhuma oferta encontrada com os filtros selecionados. Tente desmarcar "Apenas Oficiais & Platinum" ou alterar o termo.');
        }
      } else {
        setErro(res.erro || 'Falha ao buscar ofertas no Mercado Livre.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg || 'Erro de comunicação ao realizar a busca.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executarBusca();
    }
  };

  const toggleFiltro = (campo: keyof RadarBuscaFiltros) => {
    const novosFiltros = {
      ...filtros,
      [campo]: !filtros[campo]
    };
    setFiltros(novosFiltros);
    if (query.trim()) {
      executarBusca(query, novosFiltros);
    }
  };

  const copiarTexto = async (id: string, texto: string, tipo: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(`${id}_${tipo}`);
      setTimeout(() => setCopiadoId(null), 2500);
    } catch {
      setModalCopy({ titulo: 'Copiar Mensagem', texto });
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner / Header do Radar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-cyan-950/40 to-slate-900 border border-cyan-500/20 p-6 shadow-xl shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                Personal Shopper & Monitor de Ofertas
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-3 h-3" />
                Mercado Livre API
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-white tracking-tight">
              Radar de Preços TCG
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Encontre instantaneamente as melhores condições de qualquer produto Pokémon TCG em vendedores confiáveis para passar o menor valor aos clientes no WhatsApp ou disparar no grupo!
            </p>
          </div>
        </div>
      </div>

      {/* Caixa de Pesquisa Principal */}
      <div className="bg-[#0b1325]/80 backdrop-blur-md rounded-2xl border border-white/[0.08] p-5 shadow-lg space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o nome do produto (ex: Booster Box 360, ETB Destinos de Paldea) ou cole um link do Mercado Livre..."
            className="w-full bg-[#070d18] border border-white/10 rounded-xl pl-12 pr-32 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
          <button
            onClick={() => executarBusca()}
            disabled={loading}
            className="absolute right-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-xs sm:text-sm hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Buscar Preços</span>
              </>
            )}
          </button>
        </div>

        {/* Sugestões Rápidas */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium">Sugestões:</span>
          {sugestoesRapidas.map((sug) => (
            <button
              key={sug}
              onClick={() => {
                setQuery(sug);
                executarBusca(sug);
              }}
              className="text-xs px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-300 border border-white/[0.06] hover:border-cyan-500/30 transition-all"
            >
              {sug}
            </button>
          ))}
        </div>

        {/* Barra de Filtros de Confiabilidade */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Filtros de Qualidade:</span>

            {/* Filtro: Oficiais e Platinum */}
            <button
              type="button"
              onClick={() => toggleFiltro('apenasOficiaisOuPlatinum')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filtros.apenasOficiaisOuPlatinum
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Somente Oficiais & Platinum</span>
            </button>

            {/* Filtro: Envio Full */}
            <button
              type="button"
              onClick={() => toggleFiltro('apenasFull')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filtros.apenasFull
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Envio Full ⚡</span>
            </button>

            {/* Filtro: Frete Grátis */}
            <button
              type="button"
              onClick={() => toggleFiltro('apenasFreteGratis')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filtros.apenasFreteGratis
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Frete Grátis</span>
            </button>

            {/* Filtro: Sem Juros */}
            <button
              type="button"
              onClick={() => toggleFiltro('apenasSemJuros')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filtros.apenasSemJuros
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-purple-400" />
              <span>Sem Juros</span>
            </button>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ordenar:</span>
            <select
              value={filtros.ordenarPor || 'price_asc'}
              onChange={(e) => {
                const novoOrd = e.target.value as 'price_asc' | 'relevance';
                const novosFiltros = { ...filtros, ordenarPor: novoOrd };
                setFiltros(novosFiltros);
                if (query.trim()) executarBusca(query, novosFiltros);
              }}
              className="bg-[#070d18] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="price_asc">Menor Preço Primeiro</option>
              <option value="relevance">Mais Relevantes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerta de Erro ou Vazio */}
      {erro && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Resultados da Busca */}
      {totalEncontrados !== null && !loading && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Exibindo <strong className="text-cyan-400">{itens.length}</strong> melhores ofertas encontradas
            {filtros.apenasOficiaisOuPlatinum ? ' de vendedores com reputação máxima' : ''}.
          </span>
        </div>
      )}

      {/* Grid de Ofertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {itens.map((item) => {
          const copiadoCliente = copiadoId === `${item.id}_cliente`;
          const copiadoGrupo = copiadoId === `${item.id}_grupo`;

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between bg-[#0b1325]/90 rounded-2xl border border-white/[0.08] hover:border-cyan-500/30 transition-all p-4 shadow-lg hover:shadow-cyan-950/20 group"
            >
              <div className="space-y-3">
                {/* Imagem + Badges */}
                <div className="relative aspect-video sm:aspect-square w-full rounded-xl bg-[#060a14] overflow-hidden flex items-center justify-center border border-white/[0.05]">
                  {item.fotoHd || item.thumbnail ? (
                    <img
                      src={item.fotoHd || item.thumbnail}
                      alt={item.title}
                      className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-slate-600 text-xs">Sem Imagem</div>
                  )}

                  {/* Badges Flutuantes */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                    {item.ehOficial && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <ShieldCheck className="w-3 h-3" />
                        {item.official_store_name || 'Loja Oficial'}
                      </span>
                    )}
                    {item.ehPlatinum && !item.ehOficial && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/90 text-slate-950 shadow-md flex items-center gap-1 backdrop-blur-sm">
                        <ShieldCheck className="w-3 h-3" />
                        MercadoLíder Platinum
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
                    {item.ehFull && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/90 text-slate-950 shadow-md flex items-center gap-0.5 backdrop-blur-sm">
                        <Zap className="w-3 h-3" />
                        FULL
                      </span>
                    )}
                    {item.shipping?.free_shipping && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/90 text-white shadow-md flex items-center gap-0.5 backdrop-blur-sm">
                        <Truck className="w-3 h-3" />
                        Grátis
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendedor */}
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate">{item.seloVendedor}</span>
                </div>

                {/* Título do Produto */}
                <h3
                  className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors"
                  title={item.title}
                >
                  {item.title}
                </h3>

                {/* Preços e Parcelamento */}
                <div className="space-y-0.5 pt-1">
                  {item.original_price && item.original_price > item.price && (
                    <div className="text-xs text-slate-400 line-through">
                      {item.original_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                  <div className="text-xl font-bold font-heading text-emerald-400">
                    {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  {item.parcelamentoFormatado && (
                    <div className="text-xs text-slate-300 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-cyan-400" />
                      <span>{item.parcelamentoFormatado}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] space-y-2">
                {/* Botão Copiar para Cliente (1-a-1) */}
                <button
                  onClick={() => copiarTexto(item.id, item.copyCliente, 'cliente')}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                    copiadoCliente
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/20'
                  }`}
                >
                  {copiadoCliente ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Mensagem Copiada p/ Cliente!</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Copiar Resposta p/ WhatsApp (1-a-1)</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {/* Botão Copiar para Grupo */}
                  <button
                    onClick={() => copiarTexto(item.id, item.copyGrupo, 'grupo')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1 transition-all ${
                      copiadoGrupo
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border-white/[0.08]'
                    }`}
                  >
                    {copiadoGrupo ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3 h-3 text-slate-400" />
                        <span>Copy p/ Grupo</span>
                      </>
                    )}
                  </button>

                  {/* Botão Abrir no Mercado Livre */}
                  <a
                    href={item.linkAfiliado || item.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-2 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1 transition-all hover:text-cyan-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Ver no ML</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Fallback de Cópia Manual caso o clipboard API seja bloqueado */}
      {modalCopy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1325] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-cyan-400" />
              {modalCopy.titulo}
            </h3>
            <textarea
              readOnly
              rows={8}
              value={modalCopy.texto}
              className="w-full bg-[#060a14] border border-white/10 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalCopy(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
