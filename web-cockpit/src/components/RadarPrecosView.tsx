import React, { useState, useEffect, useMemo } from 'react';
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
  Share2,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Filter,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';
import type { RadarItem, RadarBuscaFiltros } from '../types/index.ts';
import { api } from '../services/api.ts';
import { copiarParaClipboard } from '../utils/clipboard.ts';

export const RadarPrecosView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<RadarItem[]>([]);
  const [totalEncontrados, setTotalEncontrados] = useState<number | null>(null);

  // Modo de visualização: 'cards' (compacto) ou 'tabela' (cotação rápida)
  const [modoVisualizacao, setModoVisualizacao] = useState<'cards' | 'tabela'>('cards');

  // Filtros
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todos');
  const [faixaPrecoAtiva, setFaixaPrecoAtiva] = useState<string>('todos');
  const [precoMinCustom, setPrecoMinCustom] = useState<string>('');
  const [precoMaxCustom, setPrecoMaxCustom] = useState<string>('');

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
    'Pokemon TCG',
    'Booster Box 360',
    'Elite Trainer Box',
    'Coleção 30 Anos Poster Box',
    'Fichario 30 anos',
    'Box Charizard ex',
    'Blister Triplo'
  ];

  const categoriasDisponiveis = [
    { id: 'todos', label: 'Todas as Categorias' },
    { id: 'Booster Box', label: '📦 Booster Box' },
    { id: 'Elite Trainer Box (ETB)', label: '🛡️ ETB' },
    { id: 'Box Especial', label: '⭐ Box Especial' },
    { id: 'Blister', label: '🃏 Blister' },
    { id: 'Fichário & Álbum', label: '📁 Fichários & Álbuns' },
    { id: 'Poster Box', label: '🖼️ Poster Box' }
  ];

  const faixasPrecoRapidas = [
    { id: 'todos', label: 'Todos os Preços', min: '', max: '' },
    { id: 'ate_30', label: 'Até R$ 30', min: '', max: '30' },
    { id: '30_80', label: 'R$ 30 a R$ 80', min: '30', max: '80' },
    { id: '80_150', label: 'R$ 80 a R$ 150', min: '80', max: '150' },
    { id: '150_250', label: 'R$ 150 a R$ 250', min: '150', max: '250' },
    { id: '250_400', label: 'R$ 250 a R$ 400', min: '250', max: '400' },
    { id: 'acima_400', label: 'Acima de R$ 400', min: '400', max: '' }
  ];

  const selecionarFaixaRapida = (faixa: typeof faixasPrecoRapidas[0]) => {
    setFaixaPrecoAtiva(faixa.id);
    setPrecoMinCustom(faixa.min);
    setPrecoMaxCustom(faixa.max);
  };

  const handleCustomMinChange = (valor: string) => {
    setPrecoMinCustom(valor);
    setFaixaPrecoAtiva('custom');
  };

  const handleCustomMaxChange = (valor: string) => {
    setPrecoMaxCustom(valor);
    setFaixaPrecoAtiva('custom');
  };

  const limparFiltrosPreco = () => {
    setFaixaPrecoAtiva('todos');
    setPrecoMinCustom('');
    setPrecoMaxCustom('');
  };

  useEffect(() => {
    // Carregamento inicial automático para apresentar ofertas imediatamente
    executarBusca('Pokemon TCG');
  }, []);

  const executarBusca = async (termoParaBuscar?: string, filtrosOverride?: RadarBuscaFiltros) => {
    const q = (termoParaBuscar !== undefined ? termoParaBuscar : query).trim();
    if (!q) {
      setErro('Por favor, digite o nome do produto ou cole um link do Mercado Livre.');
      return;
    }

    setLoading(true);
    setErro(null);

    const minNum = precoMinCustom ? parseFloat(precoMinCustom.replace(',', '.')) : undefined;
    const maxNum = precoMaxCustom ? parseFloat(precoMaxCustom.replace(',', '.')) : undefined;

    const f: RadarBuscaFiltros = {
      ...(filtrosOverride || filtros),
      precoMin: !isNaN(Number(minNum)) ? minNum : undefined,
      precoMax: !isNaN(Number(maxNum)) ? maxNum : undefined
    };

    try {
      const res = await api.buscarRadar(q, f);
      if (res.ok) {
        setItens(res.itens);
        setTotalEncontrados(res.total);
        if (res.itens.length === 0) {
          setErro('Nenhuma oferta encontrada com os filtros selecionados. Tente desmarcar "Somente Oficiais & Platinum" ou alterar o termo.');
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
    const copiou = await copiarParaClipboard(texto);
    if (copiou) {
      setCopiadoId(`${id}_${tipo}`);
      setTimeout(() => setCopiadoId(null), 2500);
    } else {
      setModalCopy({ titulo: 'Copiar Mensagem Manualmente', texto });
    }
  };

  // Itens filtrados no frontend por categoria e faixa de preço dinâmica (Min / Max)
  const itensExibidos = useMemo(() => {
    const minVal = precoMinCustom ? parseFloat(precoMinCustom.replace(',', '.')) : null;
    const maxVal = precoMaxCustom ? parseFloat(precoMaxCustom.replace(',', '.')) : null;

    return itens.filter((item) => {
      // Filtro de categoria
      if (categoriaAtiva !== 'todos') {
        const catItem = item.categoria || '';
        if (!catItem.toLowerCase().includes(categoriaAtiva.toLowerCase())) {
          return false;
        }
      }

      // Filtro de faixa de preço dinâmico (Min / Max)
      if (minVal !== null && !isNaN(minVal) && item.price < minVal) {
        return false;
      }
      if (maxVal !== null && !isNaN(maxVal) && item.price > maxVal) {
        return false;
      }

      return true;
    });
  }, [itens, categoriaAtiva, precoMinCustom, precoMaxCustom]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Banner / Header do Radar TCG Modernizado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-amber-950/40 border border-cyan-500/30 p-6 shadow-xl shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Personal Shopper & Radar TCG
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Zap className="w-3 h-3" />
                Fotos Oficiais HD Mercado Livre
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2">
              <span>Radar de Preços Pokémon TCG</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black uppercase tracking-wider">
                PRO
              </span>
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Consulte e compare as cotações em tempo real de produtos oficiais Pokémon TCG. Descrições padronizadas, fotos reais em alta definição e links de afiliado prontos para envio no WhatsApp (1-a-1) ou nos grupos de ofertas.
            </p>
          </div>

          {/* Alternador de Modo de Exibição */}
          <div className="flex items-center gap-1.5 bg-[#070d18] p-1.5 rounded-xl border border-white/10 self-start md:self-auto shadow-inner">
            <button
              onClick={() => setModoVisualizacao('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modoVisualizacao === 'cards'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Compactos</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modoVisualizacao === 'tabela'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela de Cotação</span>
            </button>
          </div>
        </div>
      </div>

      {/* Caixa de Pesquisa e Filtros */}
      <div className="bg-[#0b1325]/90 backdrop-blur-md rounded-2xl border border-white/[0.08] p-5 shadow-xl space-y-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite o produto (ex: Booster Box 360, ETB Destinos de Paldea, Fichario) ou cole o link do anúncio do Mercado Livre..."
            className="w-full bg-[#070d18] border border-white/10 rounded-xl pl-12 pr-32 py-3.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-inner"
          />
          <button
            onClick={() => executarBusca()}
            disabled={loading}
            className="absolute right-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs sm:text-sm hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
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
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Mais Buscados:
            </span>
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

          {query.trim() && (
            <a
              href={`https://lista.mercadolivre.com.br/${encodeURIComponent(query.trim())}_OrderId_PRICE_ASC_NoIndex_True`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all"
              title="Abrir pesquisa direta no Mercado Livre com filtro de menor preço"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver no ML Ao Vivo (Menor Preço) ↗</span>
            </a>
          )}
        </div>

        {/* Filtros em Linha: Categorias e Faixas de Preço */}
        <div className="pt-3 border-t border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Categorias */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Tag className="w-3 h-3 text-cyan-400" /> Filtrar por Categoria:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categoriasDisponiveis.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium border transition-all ${
                    categoriaAtiva === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Faixas de Preço & Inputs Min/Max */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3 text-amber-400" /> Faixa de Preço (Min & Max):
              </label>
              {(precoMinCustom || precoMaxCustom || faixaPrecoAtiva !== 'todos') && (
                <button
                  type="button"
                  onClick={limparFiltrosPreco}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold transition-colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Limpar Preço</span>
                </button>
              )}
            </div>

            {/* Inputs Customizados: Mínimo e Máximo */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">De R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={precoMinCustom}
                  onChange={(e) => handleCustomMinChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#070d18] border border-white/10 rounded-lg pl-14 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all font-mono"
                />
              </div>

              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-bold">Até R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={precoMaxCustom}
                  onChange={(e) => handleCustomMaxChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#070d18] border border-white/10 rounded-lg pl-14 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => executarBusca()}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all shrink-0 flex items-center gap-1"
                title="Aplicar filtro de preço na busca remota do Mercado Livre"
              >
                <span>Filtrar</span>
              </button>
            </div>

            {/* Badges Rápidos de Faixas Populares Pokémon TCG */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {faixasPrecoRapidas.map((faixa) => {
                const ativa = faixaPrecoAtiva === faixa.id;
                return (
                  <button
                    key={faixa.id}
                    onClick={() => selecionarFaixaRapida(faixa)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-medium border transition-all ${
                      ativa
                        ? 'bg-amber-500/25 text-amber-200 border-amber-500/50 shadow-sm shadow-amber-500/20 font-semibold'
                        : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    {faixa.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Barra de Filtros de Confiabilidade & Ordenação */}
        <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Confiabilidade:</span>

            {/* Somente Oficiais e Platinum */}
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

            {/* Envio Full */}
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

            {/* Frete Grátis */}
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

            {/* Sem Juros */}
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
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" /> Ordenar:
            </span>
            <select
              value={filtros.ordenarPor || 'price_asc'}
              onChange={(e) => {
                const novoOrd = e.target.value as 'price_asc' | 'relevance' | 'discount_desc';
                const novosFiltros = { ...filtros, ordenarPor: novoOrd };
                setFiltros(novosFiltros);
                if (query.trim()) executarBusca(query, novosFiltros);
              }}
              className="bg-[#070d18] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="price_asc">Menor Preço Primeiro</option>
              <option value="discount_desc">Maior Desconto (%)</option>
              <option value="relevance">Mais Relevantes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerta de Erro */}
      {erro && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span>{erro}</span>
        </div>
      )}

      {/* Contador de Resultados */}
      {totalEncontrados !== null && !loading && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Exibindo <strong className="text-cyan-400">{itensExibidos.length}</strong> de <strong className="text-white">{itens.length}</strong> ofertas filtradas
            {categoriaAtiva !== 'todos' ? ` na categoria "${categoriaAtiva}"` : ''}
            {filtros.apenasOficiaisOuPlatinum ? ' de lojas oficiais e vendedores Platinum' : ''}.
          </span>
        </div>
      )}

      {/* MODO CARDS COMPACTOS & DENSOS */}
      {modoVisualizacao === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {itensExibidos.map((item) => {
            const copiadoCliente = copiadoId === `${item.id}_cliente`;
            const copiadoGrupo = copiadoId === `${item.id}_grupo`;
            const desconto = item.original_price && item.original_price > item.price
              ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
              : 0;

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between bg-[#0b1325]/95 rounded-xl border border-white/[0.08] hover:border-cyan-500/40 transition-all p-3.5 shadow-md hover:shadow-cyan-950/30 group"
              >
                {/* Linha Superior: Foto em Miniatura + Detalhes Compactos */}
                <div className="flex gap-3">
                  {/* Miniatura do Produto Compacta (84x84) com Fallback Inteligente */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg bg-[#060a14] overflow-hidden flex items-center justify-center border border-white/[0.08] p-1">
                    <img
                      src={item.fotoHd || item.thumbnail || 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp'}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.includes('789422-MLB78317765977')) {
                          img.src = 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp';
                        }
                      }}
                    />

                    {/* Badge de Desconto */}
                    {desconto > 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white shadow">
                        -{desconto}%
                      </span>
                    )}
                  </div>

                  {/* Informações Centrais */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      {/* Categoria + Selos em linha */}
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {item.categoria || 'TCG'}
                        </span>
                        {item.ehOficial && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-slate-950">
                            Loja Oficial
                          </span>
                        )}
                        {item.ehFull && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/90 text-slate-950">
                            FULL ⚡
                          </span>
                        )}
                      </div>

                      {/* Título do Produto Compacto */}
                      <h3
                        className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-cyan-300 transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>

                    {/* Vendedor */}
                    <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{item.seloVendedor}</span>
                    </div>

                    {/* Preços */}
                    <div className="mt-1">
                      {item.original_price && item.original_price > item.price && (
                        <span className="text-[10px] text-slate-400 line-through mr-1.5">
                          {item.original_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                      <span className="text-base sm:text-lg font-bold font-heading text-emerald-400">
                        {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      {item.parcelamentoFormatado && (
                        <div className="text-[10px] text-slate-300 flex items-center gap-1">
                          <CreditCard className="w-2.5 h-2.5 text-cyan-400" />
                          <span className="truncate">{item.parcelamentoFormatado}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Descrição Comercial Padronizada */}
                <div className="mt-2.5 p-1.5 rounded-lg bg-black/40 border border-white/[0.04] text-[10px] text-slate-300 font-mono line-clamp-2 leading-relaxed" title={item.descricaoPadronizada || item.title}>
                  <span className="text-cyan-400 font-semibold mr-1">Padrão TCG:</span>
                  {item.descricaoPadronizada || `[${item.categoria || 'TCG'}] • ${item.title} • R$ ${item.price.toFixed(2).replace('.', ',')}`}
                </div>

                {/* Link Curto Mercado Livre Apresentável */}
                <div className="mt-2 flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px]">
                  <div className="flex items-center gap-1 text-amber-300 font-mono truncate" title={item.linkCurto || 'https://mercadolivre.com/sec/2rM6RPm'}>
                    <Tag className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span className="font-semibold text-amber-200">Link Curto:</span>
                    <span className="truncate">{(item.linkCurto || 'https://mercadolivre.com/sec/2rM6RPm').replace(/^https?:\/\//, '')}</span>
                  </div>
                  <button
                    onClick={() => copiarTexto(item.id, item.linkCurto || 'https://mercadolivre.com/sec/2rM6RPm', 'link')}
                    className="shrink-0 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[9px] font-bold transition flex items-center gap-0.5"
                    title="Copiar apenas o link curto do Mercado Livre"
                  >
                    {copiadoId === `${item.id}_link` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copiadoId === `${item.id}_link` ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {/* Ações Compactas */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.06] space-y-1.5">
                  <button
                    onClick={() => copiarTexto(item.id, item.copyCliente, 'cliente')}
                    className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow ${
                      copiadoCliente
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                    }`}
                  >
                    {copiadoCliente ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado p/ WhatsApp!</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Copiar p/ WhatsApp (1-a-1)</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => copiarTexto(item.id, item.copyGrupo, 'grupo')}
                      className={`py-1 px-2 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1 transition-all ${
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
                          <span>Copy Grupo</span>
                        </>
                      )}
                    </button>

                    <a
                      href={item.linkAfiliado || item.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1 px-2 rounded-lg text-[11px] font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] flex items-center justify-center gap-1 transition-all hover:text-cyan-300"
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
      )}

      {/* MODO TABELA DE COTAÇÃO DINÂMICA */}
      {modoVisualizacao === 'tabela' && (
        <div className="bg-[#0b1325]/90 rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070d18] border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3">Item</th>
                  <th className="py-3 px-3">Produto & Categoria</th>
                  <th className="py-3 px-3">Vendedor</th>
                  <th className="py-3 px-3">Preço / Parcelas</th>
                  <th className="py-3 px-3 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {itensExibidos.map((item) => {
                  const copiadoCliente = copiadoId === `${item.id}_cliente`;
                  const copiadoGrupo = copiadoId === `${item.id}_grupo`;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Miniatura */}
                      <td className="py-2.5 px-3 w-16">
                        <div className="w-12 h-12 rounded-lg bg-[#060a14] border border-white/10 flex items-center justify-center overflow-hidden p-0.5">
                          <img
                            src={item.fotoHd || item.thumbnail || 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp'}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                            className="object-contain w-full h-full"
                            loading="lazy"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.src.includes('789422-MLB78317765977')) {
                                img.src = 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp';
                              }
                            }}
                          />
                        </div>
                      </td>

                      {/* Nome, Categoria e Descrição */}
                      <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-300">
                            {item.categoria || 'TCG'}
                          </span>
                          {item.ehFull && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/90 text-slate-950">
                              FULL
                            </span>
                          )}
                          {item.shipping?.free_shipping && (
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500/90 text-white">
                              Frete Grátis
                            </span>
                          )}
                        </div>
                        <div className="text-white font-semibold truncate hover:text-cyan-300" title={item.title}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate" title={item.descricaoPadronizada}>
                          {item.descricaoPadronizada || item.title}
                        </div>
                      </td>

                      {/* Vendedor */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate max-w-[130px]">{item.seloVendedor}</span>
                        </div>
                        {item.ehOficial && (
                          <span className="text-[10px] text-amber-400 font-semibold">Oficial Copag/Meli</span>
                        )}
                      </td>

                      {/* Preço */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-emerald-400 font-heading">
                          {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                        {item.parcelamentoFormatado && (
                          <div className="text-[10px] text-slate-400">
                            {item.parcelamentoFormatado}
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copiarTexto(item.id, item.copyCliente, 'cliente')}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                              copiadoCliente
                                ? 'bg-emerald-600 text-white'
                                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                            }`}
                            title="Copiar mensagem personalizada para WhatsApp 1-a-1"
                          >
                            {copiadoCliente ? <Check className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                            <span>{copiadoCliente ? 'Copiado!' : 'Zap 1-a-1'}</span>
                          </button>

                          <button
                            onClick={() => copiarTexto(item.id, item.copyGrupo, 'grupo')}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                              copiadoGrupo
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                            }`}
                            title="Copiar mensagem formatada para grupo de promoções"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => copiarTexto(item.id, item.linkCurto || 'https://mercadolivre.com/sec/2rM6RPm', 'link')}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1 ${
                              copiadoId === `${item.id}_link`
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-white/[0.04] text-amber-300/80 border-white/[0.08] hover:bg-amber-500/10 hover:text-amber-300'
                            }`}
                            title="Copiar apenas o link curto do Mercado Livre"
                          >
                            {copiadoId === `${item.id}_link` ? <Check className="w-3 h-3 text-emerald-400" /> : <Tag className="w-3 h-3 text-amber-400" />}
                            <span className="hidden xl:inline">{copiadoId === `${item.id}_link` ? 'Copiado!' : 'Link'}</span>
                          </button>

                          <a
                            href={item.linkAfiliado || item.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:text-cyan-300"
                            title="Abrir no Mercado Livre"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Fallback de Cópia Manual caso o clipboard seja bloqueado */}
      {modalCopy && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1325] border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-cyan-400" />
              {modalCopy.titulo}
            </h3>
            <p className="text-xs text-slate-400">
              Copie o texto abaixo para enviar aos seus clientes ou disparar nos canais:
            </p>
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
