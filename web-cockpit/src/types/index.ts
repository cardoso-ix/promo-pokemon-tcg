export type ActiveModule = 'dashboard' | 'afiliados' | 'replica' | 'financas' | 'radar';

export interface RadarBuscaFiltros {
  apenasOficiaisOuPlatinum?: boolean;
  apenasNovos?: boolean;
  apenasFreteGratis?: boolean;
  apenasFull?: boolean;
  apenasSemJuros?: boolean;
  precoMin?: number;
  precoMax?: number;
  categoria?: string;
  ordenarPor?: 'price_asc' | 'relevance' | 'discount_desc';
}

export interface RadarItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  condition: string;
  official_store_id?: number | null;
  official_store_name?: string | null;
  seloVendedor: string;
  ehOficial: boolean;
  ehPlatinum: boolean;
  ehFull: boolean;
  categoria?: string;
  descricaoPadronizada?: string;
  parcelamentoFormatado: string;
  linkAfiliado: string;
  linkCurto?: string;
  linkVerNoMl?: string;
  fotoHd: string;
  copyCliente: string;
  copyGrupo: string;
  ultimaAtualizacao?: string;
  origemRegistro?: string;
  shipping?: {
    free_shipping?: boolean;
    logistic_type?: string;
  };
  installments?: {
    quantity: number;
    amount: number;
    rate: number;
  };
}

export interface RadarBuscaResponse {
  ok: boolean;
  total: number;
  itens: RadarItem[];
  erro?: string;
}

export type SubTabReplica = 'feed' | 'rotas' | 'leads' | 'gerador' | 'ia' | 'conectar' | 'config';
export type SubTabBot = 'visao-geral' | 'grupos' | 'leads' | 'campanhas' | 'meta-cloud' | 'anti-ban' | 'logs';

export interface WhatsAppGroupItem {
  id: string;
  nome: string;
  total_membros: number;
  is_announce?: boolean;
}

export interface WhatsAppContactItem {
  phone: string;
  formattedPhone: string;
  country: string;
  groups: string[];
  isAdmin: boolean;
}

export interface WhatsAppContactsStats {
  totalGrupos: number;
  totalMembrosBrutos: number;
  totalUnicos: number;
  totalDuplicadosRemovidos: number;
  taxaAproveitamento: number;
}

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr';

export interface WhatsAppState {
  status: WhatsAppConnectionStatus;
  qrDataUrl: string | null;
  userPhone: string | null;
}

export interface CookieStatus {
  status: 'valid' | 'expired' | 'missing' | 'checking';
  lastChecked: string;
  message: string;
}

export interface ReplicaStatus {
  whatsapp: WhatsAppState;
  isAtivo: boolean;
  postsLastHour: number;
  totalEnviadosHoje: number;
  cookieStatus: CookieStatus;
}

export interface BotStatus {
  online: boolean;
  whatsapp: WhatsAppState;
  metricas?: {
    totalContatos: number;
    totalGrupos: number;
    enviosHoje: number;
    falhasHoje: number;
    respostasIaHoje: number;
    warmup?: {
      nivel: number;
      limiteDiario: number;
      enviosHoje: number;
      porcentagemUso: number;
    };
  };
}

export interface UnifiedStatus {
  replica: ReplicaStatus;
  bot: BotStatus;
  timestamp: string;
}

export interface OfertaLog {
  id: number;
  origem: string;
  destino: string;
  texto: string;
  foto_url?: string | null;
  status: 'enviado' | 'ignorado' | 'erro';
  motivo?: string | null;
  criado_em: string;
}

export interface RotaGrupo {
  id: number;
  nome?: string;
  origem_id: string;
  origem_nome: string;
  destino_id: string;
  destino_nome: string;
  ativo: boolean;
  ativa?: boolean;
  origens?: string[];
  destinos?: string[];
  total_mensagens?: number;
  ultima_mensagem?: string | null;
  criada_em?: string;
}

export interface LeadContact {
  id: number;
  jid: string;
  numero?: string;
  nome: string;
  grupo_nome?: string;
  pasta?: string;
  origem_tipo?: string;
  ativo?: number;
  criado_em: string;
}

export interface Campanha {
  id: number;
  nome: string;
  mensagem_template: string;
  canal_envio: 'baileys' | 'meta_cloud';
  meta_template_nome?: string | null;
  status: 'criada' | 'executando' | 'pausada' | 'concluida' | 'cancelada';
  total_destinatarios: number;
  enviados: number;
  falhas: number;
  criado_em: string;
  iniciado_em?: string | null;
  concluido_em?: string | null;
}

export interface BalancoFinanceiro {
  mesReferencia: string;
  totalGastoCampanhas: number;
  totalLucroBruto: number;
  resultadoLiquido: number;
  status: 'lucro' | 'prejuizo' | 'neutro';
  percentualReinvestimento: number;
  valorReinvestimentoCampanhas: number;
  valorLucroDisponivel: number;
  margemLiquidaPercentual: number;
  roiPercentual: number;
  totalDiasLancados: number;
  itens: LancamentoDiario[];
}

export interface LancamentoDiario {
  id: number;
  data_lancamento: string;
  mes_referencia: string;
  gasto_campanhas: number;
  lucro_bruto: number;
  descricao: string | null;
  categoria: string;
  criado_em: string;
  atualizado_em?: string;
  dataLancamento?: string;
  gastoCampanhas?: number;
  lucroBruto?: number;
  vendasBrutas?: number;
  vendas_brutas?: number;
  saldoDia?: number;
  cliquesMeta?: number;
  impressoesMeta?: number;
  blendedRoas?: number;
}

export interface FaturaDespesaPdf {
  id: number;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_bytes: number;
  data_despesa: string;
  valor: number;
  descricao: string;
  conta_anuncio: string | null;
  metodo_pagamento: string | null;
  observacoes: string | null;
  criado_em: string;
}

export interface ResumoDespesasPdf {
  dataInicio: string | null;
  dataFim: string | null;
  totalGasto: number;
  totalFaturas: number;
  maiorDespesa: number;
  mediaPorFatura: number;
  itens: FaturaDespesaPdf[];
}

export interface UploadPlanilhaFinancas {
  id: number;
  nome_arquivo: string;
  semana_rotulo: string;
  mes_referencia: string;
  gasto_total: number;
  leads_gerados: number;
  impressoes: number;
  cliques: number;
  ctr_medio: number;
  cpc_medio: number;
  criado_em: string;
}

export interface MetaTemplate {
  id?: number;
  meta_id?: string;
  nome: string;
  categoria: 'UTILITY' | 'MARKETING';
  idioma: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  motivo_rejeicao?: string;
  corpo_texto: string;
  exemplo_variaveis?: string;
  sincronizado_em?: string;
}

export interface WarmupStatus {
  dataInicio: string;
  diasAquecimento: number;
  limiteDiarioAtual: number;
  enviadosHoje: number;
  porcentagemHoje: number;
  diasRestantes: number;
  fase: string;
}

export interface LogSistema {
  id: number;
  nivel: 'info' | 'warn' | 'error';
  categoria: string;
  mensagem: string;
  criado_em: string;
}

export interface FluxoHorarioItem {
  hora: string;
  ofertas: number;
  cliques: number;
  leads?: number;
}

export interface MetaCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface MetaInsightsDaily {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  purchases: number;
}

export interface MetaInsightsOverview {
  configured: boolean;
  accountId: string;
  data: {
    totalSpend: number;
    spendToday: number;
    totalImpressions: number;
    totalClicks: number;
    avgCpc: number;
    avgCtr: number;
    totalPurchases: number;
    totalPurchaseValue: number;
    topCampaigns: MetaCampaignInsight[];
    dailyData: MetaInsightsDaily[];
  };
}

export interface MeliOrder {
  order_id: string;
  date_created: string;
  total_amount: number;
  paid_amount: number;
  marketplace_fee: number;
  shipping_cost: number;
  status: string;
  buyer_nickname: string;
}

export interface MeliOrdersDaily {
  date: string;
  orders: number;
  revenue: number;
  fees: number;
}

export interface MeliOrdersOverview {
  configured: boolean;
  userId: string;
  webhookUrl: string;
  data: {
    totalRevenue: number;
    revenueToday: number;
    totalOrders: number;
    ordersToday: number;
    totalFees: number;
    totalShipping: number;
    netProfit: number;
    avgTicket: number;
    recentOrders: MeliOrder[];
    dailyData: MeliOrdersDaily[];
  };
}

export interface MeliAffiliateSale {
  id: string;
  date: string;
  productName: string;
  productImage: string;
  link: string;
  storeName: string;
  saleValue: number;
  saleUnits: number;
  commissionValue: number;
  commissionPercentage: number;
}

export interface MeliAffiliateDaily {
  date: string;
  orders: number;
  quantity: number;
  earnings: number;
  touchpoints: number;
  cvr: number;
}

export interface MeliProductSold {
  id: string;
  title: string;
  image: string;
  unitsSold: number;
  totalSales: number;
  commissionRate: number;
  estimatedEarnings: number;
  permalink: string;
}

export interface MeliAudienceDemographics {
  ageGroups: Array<{ range: string; percentage: number; buyers: number }>;
  gender: Array<{ label: string; percentage: number; buyers: number }>;
  locations: Array<{ state: string; stateName: string; percentage: number; orders: number }>;
}

export interface MeliUnrealizedSale {
  id: string;
  title: string;
  image: string;
  units: number;
  lostSalesValue: number;
  estimatedLostCommission: number;
  reason: string;
  date: string;
}

export interface MeliCategoryStat {
  name: string;
  sales: number;
  earnings: number;
  percentage: number;
  units: number;
}

export interface MeliTrackingTagStat {
  tag: string;
  clicks: number;
  sales: number;
  earnings: number;
  cvr: number;
}

export interface MeliAffiliateOverview {
  tag: string;
  totalClicks: number;
  totalBuyers: number;
  totalRequests: number;
  totalOrders: number;
  totalSales: number;
  totalCommissions: number;
  cvr: number;
  commissionsToday: number;
  ordersToday: number;
  totalSalesToday?: number;
  clicksToday?: number;
  buyersToday?: number;
  productsEstimatedToday?: number;
  unrealizedSalesToday?: number;
  epcToday?: number;
  aovToday?: number;
  effectiveCommissionRateToday?: number;
  basketMultiplierToday?: number;
  sessionExpired?: boolean;
  recentSales: MeliAffiliateSale[];
  dailyData: MeliAffiliateDaily[];
  productsSold?: MeliProductSold[];
  audience?: MeliAudienceDemographics;
  unrealizedSales?: MeliUnrealizedSale[];
  categories?: MeliCategoryStat[];
  trackingTags?: MeliTrackingTagStat[];
  updatedAt: string;
}

export interface ProdutoValorConsolidado {
  produto: string;
  produto_limpo: string;
  chave_canonica?: string;
  formato_nome?: string;
  colecao_nome?: string;
  menor_preco: number;
  maior_preco: number;
  ultimo_preco: number;
  preco_medio: number;
  menor_preco_de?: number;
  maior_preco_de?: number;
  total_postagens: number;
  primeira_postagem: string;
  ultima_postagem: string;
  ultimo_link?: string;
  grupo_recente?: string;
  variacao_perc: number;
}

export interface RegistroHistoricoProduto {
  id: number;
  produto: string;
  produto_limpo: string;
  chave_canonica?: string;
  preco_por: number;
  preco_de?: number;
  preco_unitario?: number;
  link?: string;
  grupo?: string;
  origem?: string;
  criado_em: string;
}

export interface BenchmarkPrecoProduto {
  encontrado: boolean;
  termoBuscado?: string;
  chaveCanonica?: string;
  produto?: string;
  produto_limpo?: string;
  menorPreco?: number;
  maiorPreco?: number;
  ultimoPreco?: number;
  precoMedio?: number;
  totalPostagens?: number;
  ultimaPostagem?: string;
  ultimoLink?: string;
}

export interface MetaRecargaItem {
  id: number;
  valor: number;
  descricao: string;
  saldo_resultante: number;
  data_recarga: string;
}

export interface MetaAdBalanceInfo {
  ok: boolean;
  accountName: string;
  accountId: string;
  currency: string;
  accountStatus: number;
  accountStatusText: string;
  currentBalance: number;
  apiBalance: number;
  manualBalance: number;
  spendCap: number;
  amountSpent: number;
  fundingSource: string;
  statusBadge: 'healthy' | 'warning' | 'critical';
  alertThreshold: number;
  lastUpdated: string;
  source: 'api' | 'manual' | 'hybrid';
  mode: 'hybrid' | 'auto' | 'manual';
  recargas: MetaRecargaItem[];
  error?: string;
}

export interface RelatorioMensalKpis {
  faturamentoMeli: number;
  comissoesConfirmadasMeli: number;
  investimentoMetaAds: number;
  lucroOperacionalLiquido: number;
  reservaReinvestimento70: number;
  lucroDisponivel30: number;
  blendedRoas: number;
  margemLucroPercentual: number;
  cliquesMeta: number;
  impressoesMeta: number;
  cpcMedio: number;
  ctrMedio: number;
  diasComMovimento: number;
  diasLucrativos: number;
  diasPrejuizo: number;
  mediaDiariaFaturamento: number;
  mediaDiariaGasto: number;
  mediaDiariaLucro: number;
}

export interface RelatorioMensalItemDiario {
  dataLancamento: string;
  gastoCampanhas: number;
  lucroBruto: number;
  vendasBrutas: number;
  saldoDia: number;
  blendedRoas: number;
  cliquesMeta: number;
  impressoesMeta: number;
  descricao?: string;
  categoria?: string;
}

export interface RelatorioMensalExecutivo {
  ok: boolean;
  mesReferencia: string;
  rotuloMes: string;
  statusCompetencia: 'em_andamento' | 'fechado';
  diasNoMes: number;
  diasDecorridos: number;
  percentualMesDecorrido: number;
  geradoEm: string;
  kpis: RelatorioMensalKpis;
  diagnostico: {
    statusRoas: string;
    recomendacaoRoas: string;
  };
  resumoWhatsapp: string;
  detalhamentoDiario: RelatorioMensalItemDiario[];
}
