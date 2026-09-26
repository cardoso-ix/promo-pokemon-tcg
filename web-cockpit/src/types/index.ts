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
  nome: string;
  pasta: string;
  origem_grupo?: string | null;
  criado_em: string;
}

export interface Campanha {
  id: number;
  nome: string;
  pasta: string;
  template: string;
  canal_envio: 'baileys' | 'meta_cloud';
  status: 'pendente' | 'em_andamento' | 'pausada' | 'concluida' | 'cancelada';
  total_alvos: number;
  enviados: number;
  falhas: number;
  criado_em: string;
}

export interface BalancoFinanceiro {
  mes: string;
  faturamento_bruto: number;
  gastos_meta_ads: number;
  gastos_operacionais: number;
  lucro_bruto: number;
  lucro_liquido: number;
  reinvestimento_sugerido_70: number;
  retirada_liquida_30: number;
  roi_percentual: number;
  roas: number;
  leads_gerados?: number;
  custo_por_lead?: number;
}

export interface LancamentoDiario {
  id: number;
  data: string;
  tipo: 'receita' | 'despesa_meta' | 'despesa_operacional';
  descricao: string;
  valor: number;
  criado_em: string;
}

export interface MetaTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY';
  status: string;
  language: string;
}
