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
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Shield,
  Clock,
  Sliders,
  TrendingDown,
  FileSpreadsheet
} from 'lucide-react';
import type {
  OfertaLog,
  RotaGrupo,
  SubTabReplica,
  BenchmarkPrecoProduto
} from '../types/index.ts';
import { api } from '../services/api.ts';
import { useUnifiedStatus } from '../hooks/useUnifiedStatus.ts';

export interface ModeloBomDia {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  texto: string;
}

export const MODELOS_BOM_DIA: ModeloBomDia[] = [
  {
    id: 'rotacao',
    nome: '🔄 Rotação Automática Diária',
    icone: '🔄',
    descricao: 'Alterna a cada dia da semana entre os 4 modelos para manter o grupo sempre dinâmico e com novidade.',
    texto: '[ROTACAO_DIARIA]'
  },
  {
    id: 'comunidade_gratidao',
    nome: '🌟 Modelo 1: Comunidade & Curadoria a Dedo',
    icone: '🌟',
    descricao: 'Tom pessoal e acolhedor, agradecendo a comunidade e destacando a dedicação diária de garimpar preços justos.',
    texto: `@pokemon_tcg_promo

🌅 *BOM DIA, TREINADORES E COLECIONADORES!* ⚡
O nosso grupo oficial de ofertas de Pokémon TCG está oficialmente *ABERTO* para o dia de hoje!

Quero agradecer de coração a cada um de vocês por fazer parte da nossa comunidade. É muito gratificante ver a nossa família de colecionadores crescendo todos os dias! 🙏✨

🔎 Passo boa parte do meu dia garimpando pessoalmente lojas oficiais, distribuidores e estoques confiáveis para encontrar ofertas reais, cupons que funcionam de verdade e oportunidades selecionadas a dedo em boosters, boxes, latas, ETBs e produtos lacrados. Aqui dedico meu tempo para que você não pague preços abusivos e consiga colecionar gastando o justo.

👥 *Dica especial:* Se você tem amigos ou conhecidos que também amam Pokémon TCG e querem economizar com segurança, fique 100% à vontade para adicioná-los ou mandar o link do nosso grupo. Quanto mais gente junta, mais forte fica a nossa comunidade! 🚀

Tenham todos uma excelente {dia_semana} e um dia cheio de bons pulls! 🔥`
  },
  {
    id: 'radar_drops',
    nome: '🎯 Modelo 2: Garimpo Diário & Ofertas Reais',
    icone: '🎯',
    descricao: 'Foco na busca manual diária, tempo dedicado para filtrar os melhores preços e reposições de estoque.',
    texto: `@pokemon_tcg_promo

⚡ *BOM DIA, MESTRES POKÉMON!* 🎯
Grupo liberado e dia começando a todo vapor nesta {dia_semana}!

Hoje já comecei a varredura manual pelos estoques oficiais. Todo dia sento e dedico tempo para vasculhar os anúncios um por um, separando somente o que é produto original, de vendedor seguro e com preço justo de verdade.

🛒 *O que garimpo a dedo todos os dias para vocês:*
• Combos de boosters avulsos com o menor valor real por pacote
• Boxes temáticas, Bundles, Fichários e Latas com desconto verdadeiro
• Cupons de desconto relâmpago testados e funcionando no carrinho
• Reposições de estoques disputados sem ágio de revenda

🔔 *Dica de amigo:* Mantenha as notificações ativadas! As melhores oportunidades que encontro costumam esgotar bem rápido.

Bora caçar aquelas cartas secretas e completar as coleções! Ótimo dia a todos! 🌟`
  },
  {
    id: 'colecionador_raiz',
    nome: '🃏 Modelo 3: Colecionador Raiz & Preço Justo',
    icone: '🃏',
    descricao: 'Compromisso pessoal contra ágio abusivo, cálculo manual de preço por booster e amor pelo hobby.',
    texto: `@pokemon_tcg_promo

☀️ *BOM DIA, FAMÍLIA POKÉMON TCG!* 🃏
Mais um dia começando e o nosso grupo está oficialmente *ABERTO* nesta {dia_semana}!

Colecionar é uma paixão compartilhada, e o meu maior compromisso aqui é cuidar do bolso de vocês. Eu mesmo confiro o histórico de preços e calculo o valor unitário por booster antes de postar qualquer link, para garantir que você esteja fazendo um bom negócio e não caindo em armadilhas de falsas promoções.

📦 Aqui não tem pegadinha nem preço inflacionado: só entra no grupo o que eu mesmo compraria para a minha própria coleção!

🚀 Se você valoriza esse trabalho diário de busca e curadoria feita de fã para fãs, convide aquele amigo que também rasga booster para se juntar a nós. Vamos juntos fortalecer o hobby no Brasil! 🇧🇷

Que o dia venha recheado de hits e raridades! Pra cima! 🔥✨`
  },
  {
    id: 'cupons_estrategia',
    nome: '🎟️ Modelo 4: Cupons & Achados Selecionados',
    icone: '🎟️',
    descricao: 'Dicas práticas de compra, acompanhamento manual de cupons e economia real.',
    texto: `@pokemon_tcg_promo

🎟️ *BOM DIA, COLECIONADORES E CAÇADORES DE OFERTAS!* ⚡
Grupo 100% aberto e pronto para as melhores oportunidades desta {dia_semana}!

Hoje o foco do meu garimpo está nos novos cupons liberados no app, compras com frete grátis e combos que realmente compensam o parcelamento sem juros. Testo os cupons manualmente antes de mandar aqui para você não perder tempo.

💡 *Dicas para aproveitar melhor o dia:*
1. Quando eu postar um cupom, resgate imediatamente no seu aplicativo
2. Confira sempre o valor final com as vantagens aplicadas no carrinho
3. Fique atento aos avisos de "Últimas Unidades" para não ficar sem

Obrigado a cada um de vocês pela confiança no meu trabalho e pela parceria diária. Vamos juntos em busca dos melhores achados! 🏆🎯`
  },
  {
    id: 'custom',
    nome: '✍️ Modelo Personalizado (Escrever Manualmente)',
    icone: '✍️',
    descricao: 'Permite criar ou editar um texto livremente com a tag dinâmica {dia_semana}.',
    texto: ''
  }
];

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

  // Estados do Agendador de Mensagem de Bom Dia
  const [testandoBomDia, setTestandoBomDia] = useState(false);
  const [salvandoBomDia, setSalvandoBomDia] = useState(false);
  const [feedbackBomDia, setFeedbackBomDia] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [configDirty, setConfigDirty] = useState(false);

  // Estados do Gerador de Anúncio
  const [geradorLink, setGeradorLink] = useState('');
  const [geradorDe, setGeradorDe] = useState('');
  const [geradorPor, setGeradorPor] = useState('');
  const [geradorCupom, setGeradorCupom] = useState('');
  const [geradorPreview, setGeradorPreview] = useState('');
  const [geradorFoto, setGeradorFoto] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Estados do Radar de Precificação no Gerador de Anúncios
  const [radarBenchmark, setRadarBenchmark] = useState<BenchmarkPrecoProduto | null>(null);
  const [buscandoBenchmark, setBuscandoBenchmark] = useState(false);

  // Carregar dados
  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 4000);
    return () => clearInterval(interval);
  }, [subTab, configDirty]);

  const buscarRadarBenchmark = async (termo: string) => {
    if (!termo || termo.trim().length < 3) return;
    setBuscandoBenchmark(true);
    try {
      const res = await api.getBenchmarkPreco(termo);
      if (res.ok && res.benchmark && res.benchmark.encontrado) {
        setRadarBenchmark(res.benchmark);
      } else {
        setRadarBenchmark(null);
      }
    } catch {
      setRadarBenchmark(null);
    } finally {
      setBuscandoBenchmark(false);
    }
  };

  const updateConfigField = (novasConfigs: Record<string, string>) => {
    setConfigDirty(true);
    setConfigs(prev => ({ ...prev, ...novasConfigs }));
  };

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
        // Preserva alterações em andamento na aba de Ajustes
        if (subTab !== 'config' || !configDirty) {
          setConfigs(results[2].value);
        }
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

  // Estados para Criação/Edição de Rotas (Opção 1)
  const [modalRotaAberto, setModalRotaAberto] = useState(false);
  const [rotaIdEditando, setRotaIdEditando] = useState<number | null>(null);
  const [rotaNome, setRotaNome] = useState('');
  const [rotaAtiva, setRotaAtiva] = useState(true);
  const [rotaOrigens, setRotaOrigens] = useState<string[]>([]);
  const [rotaDestinos, setRotaDestinos] = useState<string[]>([]);
  const [inputOrigemManual, setInputOrigemManual] = useState('');
  const [inputDestinoManual, setInputDestinoManual] = useState('');
  const [chatsWhatsapp, setChatsWhatsapp] = useState<Array<{ id: string; nome: string; total_membros?: number }>>([]);
  const [carregandoChats, setCarregandoChats] = useState(false);
  const [salvandoRota, setSalvandoRota] = useState(false);
  const [filtroChatOrigem, setFiltroChatOrigem] = useState('');
  const [filtroChatDestino, setFiltroChatDestino] = useState('');

  const carregarChats = async () => {
    setCarregandoChats(true);
    try {
      const chats = await api.getChats();
      if (Array.isArray(chats)) {
        setChatsWhatsapp(chats);
      }
    } catch {
      // Silencioso
    } finally {
      setCarregandoChats(false);
    }
  };

  const handleNovaRota = () => {
    setRotaIdEditando(null);
    setRotaNome('');
    setRotaAtiva(true);
    setRotaOrigens([]);
    setRotaDestinos([]);
    setInputOrigemManual('');
    setInputDestinoManual('');
    setFiltroChatOrigem('');
    setFiltroChatDestino('');
    setModalRotaAberto(true);
    carregarChats();
  };

  const getChatNomePorId = (chatId: string) => {
    const c = chatsWhatsapp.find(item => item.id === chatId || (item as any).chat_id === chatId);
    return c?.nome || chatId;
  };

  const handleEditarRota = (r: RotaGrupo) => {
    setRotaIdEditando(r.id);
    setRotaNome(r.nome || r.origem_nome || `Rota #${r.id}`);
    setRotaAtiva(Boolean(r.ativo ?? r.ativa));
    const rawOrigens = Array.isArray(r.origens) && r.origens.length > 0 ? r.origens : (r.origem_id ? [r.origem_id] : []);
    const rawDestinos = Array.isArray(r.destinos) && r.destinos.length > 0 ? r.destinos : (r.destino_id ? [r.destino_id] : []);
    const origens = Array.from(new Set(rawOrigens.map(o => String(o || '').trim()).filter(Boolean)));
    const destinos = Array.from(new Set(rawDestinos.map(d => String(d || '').trim()).filter(Boolean)));
    setRotaOrigens(origens);
    setRotaDestinos(destinos);
    setInputOrigemManual('');
    setInputDestinoManual('');
    setFiltroChatOrigem('');
    setFiltroChatDestino('');
    setModalRotaAberto(true);
    carregarChats();
  };

  const handleSalvarRota = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = rotaNome.trim();
    if (!nomeLimpo) return alert('Informe o nome da rota.');
    const origensLimpas = Array.from(new Set(rotaOrigens.map(o => String(o || '').trim()).filter(Boolean)));
    const destinosLimpos = Array.from(new Set(rotaDestinos.map(d => String(d || '').trim()).filter(Boolean)));
    if (origensLimpas.length === 0) return alert('Selecione ao menos 1 grupo de Origem (onde o robô monitora ofertas).');
    if (destinosLimpos.length === 0) return alert('Selecione ao menos 1 grupo de Destino (onde o robô envia as ofertas).');

    setSalvandoRota(true);
    try {
      await api.saveRota({
        id: rotaIdEditando ?? undefined,
        nome: nomeLimpo,
        ativa: rotaAtiva,
        origens: origensLimpas,
        destinos: destinosLimpos
      });
      alert(rotaIdEditando ? 'Rota atualizada com sucesso!' : 'Nova rota criada com sucesso!');
      setModalRotaAberto(false);
      await carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar rota');
    } finally {
      setSalvandoRota(false);
    }
  };

  const handleExcluirRota = async (id: number, nome: string) => {
    if (!confirm(`Deseja realmente excluir a rota "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.deleteRota(id);
      alert('Rota excluída com sucesso!');
      if (modalRotaAberto && rotaIdEditando === id) {
        setModalRotaAberto(false);
      }
      await carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir rota');
    }
  };

  const handleSalvarConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await api.saveReplicaConfig(configs);
      setConfigDirty(false);
      alert('Configurações salvas com sucesso!');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarApenasBomDia = async () => {
    setSalvandoBomDia(true);
    setFeedbackBomDia(null);
    try {
      await api.saveReplicaConfig(configs);
      setConfigDirty(false);
      setFeedbackBomDia({
        tipo: 'sucesso',
        texto: 'Configuração da Mensagem de Bom Dia salva com sucesso!'
      });
    } catch (err: unknown) {
      setFeedbackBomDia({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao salvar configurações de bom dia.'
      });
    } finally {
      setSalvandoBomDia(false);
      setTimeout(() => setFeedbackBomDia(null), 5000);
    }
  };

  const handleGerarPreview = async () => {
    if (!geradorLink.trim()) return alert('Por favor, informe um link do produto!');
    setGerando(true);
    try {
      const res = await api.gerarAnuncio({
        link: geradorLink.trim(),
        precoDe: geradorDe ? parseFloat(geradorDe.replace(',', '.')) : undefined,
        precoPor: geradorPor ? parseFloat(geradorPor.replace(',', '.')) : undefined,
        cupom: geradorCupom.trim() || undefined
      });
      const textoFinal = res.mensagem || res.textoGerado || '';
      setGeradorPreview(textoFinal);
      setGeradorFoto(res.fotoUrl || res.imageUrl || null);
      if (res.linkAfiliado && res.linkAfiliado.startsWith('http')) {
        setGeradorLink(res.linkAfiliado);
      }
      if (res.precoDe && !geradorDe) {
        setGeradorDe(res.precoDe);
      }
      if (res.precoPor && !geradorPor) {
        setGeradorPor(res.precoPor);
      }
      if (res.cupom && !geradorCupom) {
        setGeradorCupom(res.cupom);
      }
      // Buscar balizador histórico de preços (menor e maior valor já postado)
      buscarRadarBenchmark(textoFinal || geradorLink);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao gerar anúncio');
    } finally {
      setGerando(false);
    }
  };

  const handleDispararAnuncio = async () => {
    if (!geradorPreview.trim()) return alert('Gere o anúncio primeiro!');
    if (!confirm('Deseja realmente disparar este anúncio para todas as rotas ativas do WhatsApp?')) return;
    setDisparando(true);
    try {
      const res = await api.dispararAnuncio(geradorPreview, geradorFoto || undefined);
      alert(res.message || `Anúncio disparado com sucesso para ${res.enviados} grupo(s)!`);
      setGeradorLink('');
      setGeradorDe('');
      setGeradorPor('');
      setGeradorCupom('');
      setGeradorPreview('');
      setGeradorFoto(null);
      await carregarDados();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha no disparo');
    } finally {
      setDisparando(false);
    }
  };

  const handleCopiarTexto = () => {
    if (!geradorPreview) return;
    navigator.clipboard.writeText(geradorPreview);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const obterDiaSemanaAtualPt = () => {
    try {
      const d = new Date();
      const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      return dias[d.getDay()];
    } catch {
      return 'Hoje';
    }
  };

  const handleTestarBomDia = async () => {
    setTestandoBomDia(true);
    setFeedbackBomDia(null);
    try {
      // Auto-save: garante que o WhatsApp receba o modelo selecionado agora mesmo
      await api.saveReplicaConfig(configs);
      setConfigDirty(false);

      const res = await api.testarAgendador();
      if (res.ok) {
        setFeedbackBomDia({
          tipo: 'sucesso',
          texto: res.message || 'Mensagem de bom dia disparada com sucesso para os grupos de destino!'
        });
      } else {
        setFeedbackBomDia({
          tipo: 'erro',
          texto: res.error || 'Falha ao disparar teste de bom dia. Verifique se o WhatsApp está conectado.'
        });
      }
    } catch (err: unknown) {
      setFeedbackBomDia({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao disparar teste de bom dia.'
      });
    } finally {
      setTestandoBomDia(false);
      setTimeout(() => setFeedbackBomDia(null), 6000);
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Rotas de Grupos Configuradas
              </h3>
              <p className="text-xs text-slate-400">
                O replicador escuta mensagens nos grupos de Origem e encaminha convertidas para o Destino.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNovaRota}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Rota</span>
              </button>
              <button
                onClick={carregarDados}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {rotas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm glass-panel rounded-xl border border-white/[0.04] space-y-3">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <p>Nenhuma rota configurada no momento.</p>
              <button
                onClick={handleNovaRota}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Primeira Rota</span>
              </button>
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
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
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

                        {/* Botões de Ação do Card */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleEditarRota(rota)}
                            className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/[0.08] transition-all"
                            title="Editar grupos e nome desta rota"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExcluirRota(rota.id, rota.nome || `Rota #${rota.id}`)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/20 transition-all"
                            title="Excluir rota"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          ID: {rota.origem_id}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Status no Replicador:</span>
                      <button
                        onClick={() => handleToggleRota(rota.id, isRotaAtiva)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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

              {/* Radar de Precificação Histórica (Menor e Maior Preço Já Postado) */}
              {buscandoBenchmark && (
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Consultando histórico e balizadores de preço...</span>
                </div>
              )}

              {radarBenchmark && radarBenchmark.encontrado && (
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 text-xs space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4" />
                      Radar de Precificação Histórica
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                      {radarBenchmark.totalPostagens}x postado no grupo
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 truncate" title={radarBenchmark.produto}>
                    Base: <span className="text-white font-medium">{radarBenchmark.produto}</span>
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Menor Preço 🟢</p>
                      <p className="text-sm font-extrabold text-emerald-300">
                        R$ {radarBenchmark.menorPreco?.toFixed(2).replace('.', ',')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (radarBenchmark.menorPreco) {
                            setGeradorPor(radarBenchmark.menorPreco.toFixed(2).replace('.', ','));
                          }
                        }}
                        className="mt-1 w-full py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-[9px] font-bold text-emerald-300 transition-colors"
                      >
                        Usar no POR
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40">
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Maior Preço 🔴</p>
                      <p className="text-sm font-extrabold text-amber-300">
                        R$ {radarBenchmark.maiorPreco?.toFixed(2).replace('.', ',')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (radarBenchmark.maiorPreco) {
                            setGeradorDe(radarBenchmark.maiorPreco.toFixed(2).replace('.', ','));
                          }
                        }}
                        className="mt-1 w-full py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[9px] font-bold text-amber-300 transition-colors"
                      >
                        Usar no DE
                      </button>
                    </div>

                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Média 📊</p>
                      <p className="text-sm font-bold text-slate-200">
                        R$ {radarBenchmark.precoMedio?.toFixed(2).replace('.', ',')}
                      </p>
                      <span className="text-[9px] text-slate-500 block mt-1">Preço médio</span>
                    </div>

                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Último ⏱️</p>
                      <p className="text-sm font-bold text-cyan-300">
                        R$ {radarBenchmark.ultimoPreco?.toFixed(2).replace('.', ',')}
                      </p>
                      <span className="text-[9px] text-slate-500 block mt-1">Mais recente</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Prévia Estilo WhatsApp */}
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-heading font-bold text-white flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Prévia do Balão do WhatsApp
                  </h3>
                  <p className="text-xs text-slate-400">
                    Você pode revisar e ajustar o texto antes de disparar.
                  </p>
                </div>
                {geradorPreview && (
                  <button
                    onClick={handleCopiarTexto}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 transition-all flex items-center gap-1.5 border border-white/[0.08]"
                    title="Copiar texto para a área de transferência"
                  >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado!' : 'Copiar Copy'}</span>
                  </button>
                )}
              </div>

              {geradorPreview ? (
                <div className="p-4 rounded-xl bg-[#0b141a] border border-[#202c33] text-xs font-mono text-slate-100 space-y-3 shadow-xl">
                  {geradorFoto && (
                    <div className="relative group">
                      <img
                        src={geradorFoto}
                        alt="Produto"
                        className="w-full h-44 object-contain bg-slate-900/50 rounded-lg border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setGeradorFoto(null)}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/70 hover:bg-black text-rose-400 border border-rose-500/30 text-xs transition-all opacity-80 hover:opacity-100"
                        title="Remover foto do disparo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Texto Final do Balão (Editável):</label>
                    <textarea
                      value={geradorPreview}
                      onChange={e => setGeradorPreview(e.target.value)}
                      rows={8}
                      className="w-full p-2 rounded-lg bg-[#111b21] border border-[#222e35] text-slate-100 focus:outline-none focus:border-cyan-500/50 text-xs font-mono resize-y leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-64 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                  <span>Nenhuma prévia gerada ainda.</span>
                  <span className="text-[11px] text-slate-600">Cole o link ao lado e clique em Gerar Prévia.</span>
                </div>
              )}
            </div>

            {geradorPreview && (
              <button
                onClick={handleDispararAnuncio}
                disabled={disparando}
                className="w-full py-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                {disparando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{disparando ? 'Disparando para as rotas ativas...' : 'Disparar Imediatamente para Grupos de Destino'}</span>
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

      {/* Sub-Aba: Central de Ajustes & Coordenação Completa */}
      {subTab === 'config' && (
        <form onSubmit={handleSalvarConfig} className="space-y-6 max-w-4xl mx-auto">
          {/* Topo com Título e Botão de Salvar Superior */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
            <div>
              <h3 className="text-lg font-heading font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                Central de Ajustes & Coordenação Operacional
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle total das tags de comissão, regras anti-spam, limpeza de concorrentes e rotinas automatizadas.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Todos os Ajustes'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD 1: TAGS DE AFILIADO & VITRINE */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-cyan-300 border-b border-white/[0.06] pb-3">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h4 className="font-heading font-bold text-sm text-white">Tags de Afiliação & Vitrine</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Tag Matt Word (Apelido Afiliado):</span>
                    <span className="text-[10px] text-cyan-400 font-mono">matt_word</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: caed1312314"
                    value={configs['affiliate_matt_word'] || configs['matt_word'] || configs['meli_tag'] || ''}
                    onChange={e => setConfigs({ ...configs, affiliate_matt_word: e.target.value, matt_word: e.target.value, meli_tag: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Garante a atribuição das comissões das compras realizadas através dos links.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>Tag Matt Tool (Canal/Ferramenta):</span>
                    <span className="text-[10px] text-slate-400 font-mono">matt_tool</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 96097202"
                    value={configs['affiliate_matt_tool'] || configs['matt_tool'] || ''}
                    onChange={e => setConfigs({ ...configs, affiliate_matt_tool: e.target.value, matt_tool: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Link da Vitrine / Catálogo Oficial:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: https://mercadolivre.com/sec/2rM6RPm"
                    value={configs['link_vitrine_curto'] || ''}
                    onChange={e => setConfigs({ ...configs, link_vitrine_curto: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-cyan-500/50 font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Inserido nas mensagens de abertura e no rodapé das ofertas recomendadas.
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 2: REGRAS DE POSTAGEM & ANTI-SPAM */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 border-b border-white/[0.06] pb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="font-heading font-bold text-sm text-white">Regras de Postagem & Filtros</h4>
              </div>

              <div className="space-y-3 text-xs">
                {/* Switch: Filtro Apenas TCG */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <span className="font-semibold text-slate-200 block">Filtro Exclusivo Pokémon TCG</span>
                    <span className="text-[10px] text-slate-400">Posta apenas produtos com termos de Pokémon TCG Copag</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigs({ ...configs, filtro_apenas_tcg: configs['filtro_apenas_tcg'] === 'false' ? 'true' : 'false' })}
                    className="cursor-pointer"
                  >
                    {configs['filtro_apenas_tcg'] !== 'false' ? (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Switch: Somente Mercado Livre */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <span className="font-semibold text-slate-200 block">Somente Mercado Livre</span>
                    <span className="text-[10px] text-slate-400">Ignora ofertas de outras lojas fora do Meli</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigs({ ...configs, somente_mercadolivre: configs['somente_mercadolivre'] === 'false' ? 'true' : 'false' })}
                    className="cursor-pointer"
                  >
                    {configs['somente_mercadolivre'] !== 'false' ? (
                      <ToggleRight className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Switch: Replicar Comunicados em Texto */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div>
                    <span className="font-semibold text-slate-200 block">Replicar Comunicados em Texto</span>
                    <span className="text-[10px] text-slate-400">Repassa mensagens institucionais sem link/foto</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfigs({ ...configs, replicar_comunicados_texto: configs['replicar_comunicados_texto'] === 'true' ? 'false' : 'true' })}
                    className="cursor-pointer"
                  >
                    {configs['replicar_comunicados_texto'] === 'true' ? (
                      <ToggleRight className="w-7 h-7 text-cyan-400" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-500" />
                    )}
                  </button>
                </div>

                {/* Grade de Delays e Tetos */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Cooldown Duplicidade:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={configs['cooldown_duplicidade_minutos'] || '30'}
                        onChange={e => setConfigs({ ...configs, cooldown_duplicidade_minutos: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                      <span className="text-[10px] text-slate-400">min</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Teto Máx / Hora:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={configs['teto_hora'] || '40'}
                        onChange={e => setConfigs({ ...configs, teto_hora: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                      <span className="text-[10px] text-slate-400">msgs</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Delay Entre Envios:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={configs['delay_postagem_segundos'] || configs['delay_segundos'] || '5'}
                        onChange={e => setConfigs({ ...configs, delay_postagem_segundos: e.target.value, delay_segundos: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                      <span className="text-[10px] text-slate-400">seg</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Atraso Máximo:</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="60"
                        max="3600"
                        value={configs['atraso_maximo_segundos'] || '600'}
                        onChange={e => setConfigs({ ...configs, atraso_maximo_segundos: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                      <span className="text-[10px] text-slate-400">seg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: HIGIENIZAÇÃO DE MENSAGENS (CONCORRENTES) */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-purple-300 border-b border-white/[0.06] pb-3">
                <Trash2 className="w-4 h-4 text-purple-400" />
                <h4 className="font-heading font-bold text-sm text-white">Limpeza de Concorrentes & Assinaturas</h4>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Frases, Links e Arrobas a Remover (1 por linha):
                  </label>
                  <textarea
                    rows={6}
                    placeholder={`@rasgabooster.tcg\n#rasgaboot\n@rasgabooster\nt.me/concorrente\nwa.me/concorrente`}
                    value={configs['frases_remover'] ?? '@rasgabooster.tcg\n#rasgaboot\n@rasgabooster'}
                    onChange={e => setConfigs({ ...configs, frases_remover: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-purple-500/50 font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    O robô detecta e apaga essas expressões antes de enviar nos seus grupos, garantindo mensagens 100% limpas.
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 4: MENSAGEM DE BOM DIA & GOOGLE PLANILHAS */}
            <div className="glass-panel rounded-2xl p-5 border border-white/[0.08] space-y-4">
              <div className="flex items-center gap-2 text-amber-300 border-b border-white/[0.06] pb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <h4 className="font-heading font-bold text-sm text-white">Rotinas Automáticas & Integrações</h4>
              </div>

              <div className="space-y-3 text-xs">
                {/* Mensagem Diária de Bom Dia e Alternância de Modelos */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 via-white/[0.02] to-transparent border border-amber-500/20 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <div>
                      <span className="font-semibold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        Mensagem Diária de Bom Dia & Abertura
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Postagem matinal automática com curadoria e boas-vindas aos membros
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigs({ ...configs, msg_abertura_ativa: configs['msg_abertura_ativa'] === 'false' ? 'true' : 'false' })}
                      className="cursor-pointer"
                      title={configs['msg_abertura_ativa'] !== 'false' ? 'Desativar postagem de bom dia' : 'Ativar postagem de bom dia'}
                    >
                      {configs['msg_abertura_ativa'] !== 'false' ? (
                        <ToggleRight className="w-7 h-7 text-amber-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-500" />
                      )}
                    </button>
                  </div>

                  {feedbackBomDia && (
                    <div
                      className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        feedbackBomDia.tipo === 'sucesso'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-red-500/15 border border-red-500/30 text-red-300'
                      }`}
                    >
                      {feedbackBomDia.tipo === 'sucesso' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>{feedbackBomDia.texto}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium text-[11px] mb-1">
                        Horário Oficial do Disparo:
                      </label>
                      <input
                        type="time"
                        value={configs['msg_abertura_horario'] || '07:00'}
                        onChange={e => updateConfigField({ msg_abertura_horario: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500/50 text-xs font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Fuso de Brasília (América/São Paulo).
                      </span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium text-[11px] mb-1">
                        Alternar Modelo de Mensagem:
                      </label>
                      <select
                        value={
                          configs['msg_abertura_modelo_id'] ||
                          (configs['msg_abertura_texto'] === '[ROTACAO_DIARIA]'
                            ? 'rotacao'
                            : MODELOS_BOM_DIA.find(
                                m =>
                                  m.id !== 'rotacao' &&
                                  m.id !== 'custom' &&
                                  m.texto.trim() === (configs['msg_abertura_texto'] || '').trim()
                              )?.id ||
                              (configs['msg_abertura_texto'] ? 'custom' : 'comunidade_gratidao'))
                        }
                        onChange={e => {
                          const novoId = e.target.value;
                          const selecionado = MODELOS_BOM_DIA.find(m => m.id === novoId);
                          if (selecionado) {
                            if (novoId === 'custom') {
                              updateConfigField({
                                msg_abertura_modelo_id: novoId
                              });
                            } else if (novoId === 'rotacao') {
                              updateConfigField({
                                msg_abertura_modelo_id: novoId,
                                msg_abertura_texto: '[ROTACAO_DIARIA]'
                              });
                            } else {
                              updateConfigField({
                                msg_abertura_modelo_id: novoId,
                                msg_abertura_texto: selecionado.texto
                              });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 focus:outline-none focus:border-amber-400 text-xs font-semibold cursor-pointer truncate"
                      >
                        {MODELOS_BOM_DIA.map(mod => (
                          <option key={mod.id} value={mod.id} className="bg-slate-900 text-white py-1">
                            {mod.nome}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block line-clamp-1">
                        {
                          MODELOS_BOM_DIA.find(
                            m =>
                              m.id ===
                              (configs['msg_abertura_modelo_id'] ||
                                (configs['msg_abertura_texto'] === '[ROTACAO_DIARIA]'
                                  ? 'rotacao'
                                  : 'comunidade_gratidao'))
                          )?.descricao
                        }
                      </span>
                    </div>
                  </div>

                  {/* Edição do Texto do Modelo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-medium text-[11px] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Texto do Template (use <code className="text-amber-300 px-1 py-0.2 rounded bg-amber-500/10 font-mono">{"{dia_semana}"}</code> para dia dinâmico):
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const modId = configs['msg_abertura_modelo_id'] || 'comunidade_gratidao';
                          const original = MODELOS_BOM_DIA.find(m => m.id === modId);
                          if (original && original.id !== 'custom') {
                            updateConfigField({ msg_abertura_texto: original.texto });
                          }
                        }}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        title="Restaurar o texto oficial deste modelo"
                      >
                        Restaurar padrão deste modelo
                      </button>
                    </div>

                    <textarea
                      rows={6}
                      value={
                        configs['msg_abertura_texto'] !== undefined
                          ? configs['msg_abertura_texto']
                          : MODELOS_BOM_DIA[1].texto
                      }
                      onChange={e =>
                        updateConfigField({
                          msg_abertura_texto: e.target.value,
                          msg_abertura_modelo_id: 'custom'
                        })
                      }
                      placeholder="Escreva a mensagem de abertura do grupo..."
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-amber-500/50 font-mono text-[11px] leading-relaxed"
                    />
                  </div>

                  {/* Painel de Prévia da Mensagem Formatada */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-300">
                          Prévia ao Vivo no WhatsApp
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          Hoje: {obterDiaSemanaAtualPt()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSalvarApenasBomDia}
                          disabled={salvandoBomDia}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/40 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Salva as alterações deste modelo e horário imediatamente"
                        >
                          <Check className="w-3 h-3" />
                          <span>{salvandoBomDia ? 'Salvando...' : 'Salvar Este Modelo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleTestarBomDia}
                          disabled={testandoBomDia}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                          title="Salva automaticamente e dispara a mensagem de bom dia agora nos grupos para teste"
                        >
                          {testandoBomDia ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Testar Envio Agora</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0b141a] border border-[#222d34] shadow-inner max-h-56 overflow-y-auto">
                      <div className="text-[11px] text-[#e9edef] whitespace-pre-wrap font-sans leading-relaxed">
                        {(() => {
                          let t =
                            configs['msg_abertura_texto'] !== undefined
                              ? configs['msg_abertura_texto']
                              : MODELOS_BOM_DIA[1].texto;
                          if (t === '[ROTACAO_DIARIA]') {
                            const diaNum = new Date().getDay();
                            const presets = MODELOS_BOM_DIA.filter(m => m.id !== 'rotacao' && m.id !== 'custom');
                            t = presets[diaNum % presets.length]?.texto || t;
                          }
                          return t.replace(/\{dia_semana\}/gi, obterDiaSemanaAtualPt());
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google Planilhas */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-semibold text-slate-200 block">Google Planilhas Integrado</span>
                        <span className="text-[10px] text-slate-400">Grava cada oferta em "produtos tcg valores"</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigs({ ...configs, google_sheets_ativo: configs['google_sheets_ativo'] === 'false' ? 'true' : 'false' })}
                      className="cursor-pointer"
                    >
                      {configs['google_sheets_ativo'] !== 'false' ? (
                        <ToggleRight className="w-7 h-7 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-500" />
                      )}
                    </button>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Webhook URL (Google Apps Script):</label>
                    <input
                      type="text"
                      placeholder="https://script.google.com/macros/s/..."
                      value={configs['google_sheets_webhook_url'] || ''}
                      onChange={e => setConfigs({ ...configs, google_sheets_webhook_url: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:outline-none focus:border-emerald-500/50 text-[11px] font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de Salvar Rodapé */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-sm transition-all shadow-xl shadow-cyan-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Check className="w-4 h-4 text-slate-950 font-bold" />
              <span>{loading ? 'Salvando Configurações...' : 'Salvar e Aplicar Todas as Configurações'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Modal de Criação / Edição de Rota (Opção 1) */}
      {modalRotaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-white/10 p-6 bg-slate-900/95 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Cabeçalho do Modal (Fixo) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-white">
                    {rotaIdEditando ? `Editar Rota: ${rotaNome || 'Sem Nome'}` : 'Nova Rota de Grupos'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Defina os grupos monitorados (Origem) e onde enviar as ofertas convertidas (Destino).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRotaAberto(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário com Miolo Rolável e Rodapé Fixo */}
            <form onSubmit={handleSalvarRota} className="flex flex-col flex-1 min-h-0 pt-4">
              <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-5 min-h-0">
                {/* Linha 1: Nome da Rota e Switch Ativa */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nome da Rota</label>
                    <input
                      type="text"
                      placeholder="Ex: Oficial, Ofertas VIP, Grupo Teste..."
                      value={rotaNome}
                      onChange={e => setRotaNome(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="text-xs font-semibold text-slate-300">Status da Rota</label>
                    <button
                      type="button"
                      onClick={() => setRotaAtiva(!rotaAtiva)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        rotaAtiva
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-white/10 text-slate-400'
                      }`}
                    >
                      <span>{rotaAtiva ? '✓ Rota Ativa' : '○ Rota Pausada'}</span>
                      {rotaAtiva ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Grid: 2 Colunas (Origens vs Destinos) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Coluna 1: Grupos de Origem */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-cyan-500/20 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5" />
                          1. Grupos de Origem
                        </h4>
                        <p className="text-[11px] text-slate-400">O robô copia ofertas daqui</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {rotaOrigens.length} selecionado(s)
                      </span>
                    </div>

                    {/* Chips de Grupos Selecionados (Permite visualizar e desmarcar na hora) */}
                    {rotaOrigens.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-cyan-300 font-semibold">
                          <span>Grupos Ativos ({rotaOrigens.length})</span>
                          <button
                            type="button"
                            onClick={() => setRotaOrigens([])}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                          >
                            Remover todos
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {rotaOrigens.map(id => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 text-[11px]"
                            >
                              <span className="max-w-[160px] truncate font-medium" title={id}>
                                {getChatNomePorId(id)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRotaOrigens(rotaOrigens.filter(x => x !== id))}
                                className="hover:bg-cyan-500/30 rounded p-0.5 text-cyan-400 hover:text-white"
                                title="Desmarcar grupo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-white/[0.01] border border-dashed border-white/10 text-center text-[11px] text-slate-500">
                        Nenhum grupo de origem selecionado
                      </div>
                    )}

                    {/* Busca e Atualizar */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar grupo..."
                          value={filtroChatOrigem}
                          onChange={e => setFiltroChatOrigem(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={carregarChats}
                        disabled={carregandoChats}
                        className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                        title="Sincronizar grupos do WhatsApp"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${carregandoChats ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Lista de Grupos com Checkbox */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 flex-1">
                      {chatsWhatsapp.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-4">
                          {carregandoChats ? 'Carregando grupos...' : 'Nenhum grupo encontrado no cache. Cole o JID abaixo se preferir.'}
                        </p>
                      ) : (
                        chatsWhatsapp
                          .filter(c => {
                            const cid = c.id || (c as any).chat_id || '';
                            return Boolean(cid) && (!filtroChatOrigem || (c.nome || cid).toLowerCase().includes(filtroChatOrigem.toLowerCase()));
                          })
                          .sort((a, b) => {
                            const aId = a.id || (a as any).chat_id || '';
                            const bId = b.id || (b as any).chat_id || '';
                            const aSel = rotaOrigens.includes(aId) ? 1 : 0;
                            const bSel = rotaOrigens.includes(bId) ? 1 : 0;
                            return bSel - aSel;
                          })
                          .map(chat => {
                            const chatId = chat.id || (chat as any).chat_id;
                            const isSelected = rotaOrigens.includes(chatId);
                            return (
                              <div
                                key={chatId}
                                onClick={() => {
                                  if (isSelected) {
                                    setRotaOrigens(rotaOrigens.filter(id => id !== chatId));
                                  } else {
                                    setRotaOrigens([...rotaOrigens, chatId]);
                                  }
                                }}
                                className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs border ${
                                  isSelected
                                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                                    : 'bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.05]'
                                }`}
                              >
                                <div className="truncate mr-2">
                                  <p className="font-semibold truncate">{chat.nome || 'Grupo sem nome'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">{chatId}</p>
                                </div>
                                <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-slate-950 font-bold" />}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {/* Inserir JID Manual */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ou cole o JID manual (ex: 12036...)"
                        value={inputOrigemManual}
                        onChange={e => setInputOrigemManual(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = inputOrigemManual.trim();
                          if (val && !rotaOrigens.includes(val)) {
                            setRotaOrigens([...rotaOrigens, val]);
                            setInputOrigemManual('');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Coluna 2: Grupos de Destino */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-purple-500/20 space-y-3 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5" />
                          2. Grupos de Destino
                        </h4>
                        <p className="text-[11px] text-slate-400">O robô envia ofertas convertidas para cá</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {rotaDestinos.length} selecionado(s)
                      </span>
                    </div>

                    {/* Chips de Grupos Selecionados (Permite visualizar e desmarcar na hora) */}
                    {rotaDestinos.length > 0 ? (
                      <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/20 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-purple-300 font-semibold">
                          <span>Grupos Ativos ({rotaDestinos.length})</span>
                          <button
                            type="button"
                            onClick={() => setRotaDestinos([])}
                            className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer"
                          >
                            Remover todos
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {rotaDestinos.map(id => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/40 text-[11px]"
                            >
                              <span className="max-w-[160px] truncate font-medium" title={id}>
                                {getChatNomePorId(id)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRotaDestinos(rotaDestinos.filter(x => x !== id))}
                                className="hover:bg-purple-500/30 rounded p-0.5 text-purple-400 hover:text-white"
                                title="Desmarcar grupo"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-white/[0.01] border border-dashed border-white/10 text-center text-[11px] text-slate-500">
                        Nenhum grupo de destino selecionado
                      </div>
                    )}

                    {/* Busca e Atualizar */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar grupo..."
                          value={filtroChatDestino}
                          onChange={e => setFiltroChatDestino(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={carregarChats}
                        disabled={carregandoChats}
                        className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300"
                        title="Sincronizar grupos do WhatsApp"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${carregandoChats ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {/* Lista de Grupos com Checkbox */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 flex-1">
                      {chatsWhatsapp.length === 0 ? (
                        <p className="text-[11px] text-slate-500 text-center py-4">
                          {carregandoChats ? 'Carregando grupos...' : 'Nenhum grupo encontrado no cache. Cole o JID abaixo se preferir.'}
                        </p>
                      ) : (
                        chatsWhatsapp
                          .filter(c => {
                            const cid = c.id || (c as any).chat_id || '';
                            return Boolean(cid) && (!filtroChatDestino || (c.nome || cid).toLowerCase().includes(filtroChatDestino.toLowerCase()));
                          })
                          .sort((a, b) => {
                            const aId = a.id || (a as any).chat_id || '';
                            const bId = b.id || (b as any).chat_id || '';
                            const aSel = rotaDestinos.includes(aId) ? 1 : 0;
                            const bSel = rotaDestinos.includes(bId) ? 1 : 0;
                            return bSel - aSel;
                          })
                          .map(chat => {
                            const chatId = chat.id || (chat as any).chat_id;
                            const isSelected = rotaDestinos.includes(chatId);
                            return (
                              <div
                                key={chatId}
                                onClick={() => {
                                  if (isSelected) {
                                    setRotaDestinos(rotaDestinos.filter(id => id !== chatId));
                                  } else {
                                    setRotaDestinos([...rotaDestinos, chatId]);
                                  }
                                }}
                                className={`p-2 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs border ${
                                  isSelected
                                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                                    : 'bg-white/[0.02] border-white/[0.04] text-slate-300 hover:bg-white/[0.05]'
                                }`}
                              >
                                <div className="truncate mr-2">
                                  <p className="font-semibold truncate">{chat.nome || 'Grupo sem nome'}</p>
                                  <p className="text-[10px] text-slate-500 font-mono truncate">{chatId}</p>
                                </div>
                                <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                  isSelected ? 'bg-purple-500 border-purple-400 text-white font-bold' : 'border-white/20'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 text-white font-bold" />}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {/* Inserir JID Manual */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ou cole o JID manual (ex: 12036...)"
                        value={inputDestinoManual}
                        onChange={e => setInputDestinoManual(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = inputDestinoManual.trim();
                          if (val && !rotaDestinos.includes(val)) {
                            setRotaDestinos([...rotaDestinos, val]);
                            setInputDestinoManual('');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé (Fixo na parte inferior do modal) */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10 shrink-0">
                {rotaIdEditando ? (
                  <button
                    type="button"
                    onClick={() => handleExcluirRota(rotaIdEditando, rotaNome)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Rota</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModalRotaAberto(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoRota}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {salvandoRota ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando Rota...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-slate-950 font-bold" />
                        <span>{rotaIdEditando ? 'Salvar Alterações' : 'Criar Rota'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
