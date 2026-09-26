export type ActiveModule = 'dashboard' | 'replica' | 'disparador' | 'financas' | 'deepseek';

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
  origem_id: string;
  origem_nome: string;
  destino_id: string;
  destino_nome: string;
  ativo: boolean;
  total_mensagens?: number;
  ultima_mensagem?: string | null;
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

