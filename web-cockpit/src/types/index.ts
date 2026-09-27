export type ActiveModule = 'dashboard' | 'afiliados' | 'replica' | 'financas';

export type SubTabReplica = 'feed' | 'rotas' | 'gerador' | 'conectar' | 'config';
export type SubTabBot = 'visao-geral' | 'grupos' | 'leads' | 'campanhas' | 'meta-cloud' | 'anti-ban' | 'logs';

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
  leads: number;
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




