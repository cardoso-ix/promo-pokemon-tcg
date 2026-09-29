import { getConfig, setConfig, getAllRotas, DEFAULT_MSG_ABERTURA, PRESET_MSGS_ABERTURA } from '../db/database.js';
import { metaAdsService } from '../analytics/meta.service.js';
import { meliAffiliateService } from '../analytics/meli-affiliate.service.js';

export interface HoraBrasiliaInfo {
  horaFormatada: string; // 'HH:mm'
  dataFormatada: string; // 'YYYY-MM-DD'
  diaSemana: string;     // 'segunda-feira', etc.
}

/**
 * Retorna o horário e data oficiais de Brasília (America/Sao_Paulo),
 * independente de onde o servidor está hospedado (ex: Railway operando em UTC).
 */
export function obterHoraBrasilia(dataRef: Date = new Date()): HoraBrasiliaInfo {
  const opcoesHora: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  const opcoesData: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };
  const opcoesSemana: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long'
  };

  const horaFormatada = new Intl.DateTimeFormat('pt-BR', opcoesHora).format(dataRef);
  const dataPt = new Intl.DateTimeFormat('pt-BR', opcoesData).format(dataRef);
  const [dia, mes, ano] = dataPt.split('/');
  const dataFormatada = `${ano}-${mes}-${dia}`;
  const diaSemana = new Intl.DateTimeFormat('pt-BR', opcoesSemana).format(dataRef);

  return { horaFormatada, dataFormatada, diaSemana };
}

/**
 * Prepara o texto da mensagem aplicando interpolações de tags dinâmicas se houver.
 * Suporta rotação diária automática de modelos caso o template seja '[ROTACAO_DIARIA]'
 * ou 'rotacao'.
 */
export function prepararTextoMensagemAbertura(
  template: string,
  diaSemana?: string,
  dataRef: Date = new Date()
): string {
  const dia = diaSemana || obterHoraBrasilia(dataRef).diaSemana;
  const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);

  let textoBase = (template || '').trim();

  // Rotação diária automática: se for '[ROTACAO_DIARIA]' ou 'rotacao'
  if (!textoBase || textoBase === '[ROTACAO_DIARIA]' || textoBase.toLowerCase() === 'rotacao') {
    const indice = dataRef.getDay() % PRESET_MSGS_ABERTURA.length;
    textoBase = PRESET_MSGS_ABERTURA[indice]?.texto || DEFAULT_MSG_ABERTURA;
  }

  return textoBase
    .replace(/\{dia_semana\}/gi, diaCapitalizado)
    .trim();
}

/**
 * Coleta todos os JIDs de grupos de destino únicos configurados nas rotas ativas.
 */
export function obterDestinosAtivos(): string[] {
  const rotas = getAllRotas();
  const destinosSet = new Set<string>();
  for (const rota of rotas) {
    if (rota.ativa && Array.isArray(rota.destinos)) {
      for (const d of rota.destinos) {
        if (d && (d.endsWith('@g.us') || d.endsWith('@s.whatsapp.net'))) {
          destinosSet.add(d.trim());
        }
      }
    }
  }
  return Array.from(destinosSet);
}

export interface DisparoAberturaResult {
  sucesso: boolean;
  totalEnviados: number;
  totalFalhas: number;
  destinos: string[];
  mensagem: string;
  motivo?: string;
}

export interface WhatsAppClientLike {
  enviarMensagemTexto?: (destino: string, texto: string) => Promise<any>;
  getSocket?: () => any;
}

/**
 * Dispara a mensagem de abertura do grupo para todos os destinos configurados.
 */
export async function dispararMensagemAbertura(
  client: WhatsAppClientLike,
  forcarTeste: boolean = false,
  pacingMs: number = 3000
): Promise<DisparoAberturaResult> {
  const ativo = getConfig('msg_abertura_ativa', 'true') === 'true';
  if (!ativo && !forcarTeste) {
    return {
      sucesso: false,
      totalEnviados: 0,
      totalFalhas: 0,
      destinos: [],
      mensagem: '',
      motivo: 'mensagem_abertura_desativada'
    };
  }

  const destinos = obterDestinosAtivos();
  if (destinos.length === 0) {
    console.warn('[Agendador Abertura] Nenhum grupo de destino ativo configurado nas rotas.');
    return {
      sucesso: false,
      totalEnviados: 0,
      totalFalhas: 0,
      destinos: [],
      mensagem: '',
      motivo: 'sem_destinos_ativos'
    };
  }

  const socket = typeof client.getSocket === 'function' ? client.getSocket() : (client as any).sock;
  if (!socket && typeof client.enviarMensagemTexto !== 'function') {
    console.warn('[Agendador Abertura] WhatsApp desconectado. Impossível enviar mensagem de abertura.');
    return {
      sucesso: false,
      totalEnviados: 0,
      totalFalhas: 0,
      destinos,
      mensagem: '',
      motivo: 'whatsapp_desconectado'
    };
  }

  const template = getConfig('msg_abertura_texto', DEFAULT_MSG_ABERTURA);
  const textoFinal = prepararTextoMensagemAbertura(template);

  let enviados = 0;
  let falhas = 0;

  console.log(`[Agendador Abertura] Enviando mensagem de abertura para ${destinos.length} grupo(s)...`);

  for (const destino of destinos) {
    try {
      if (typeof client.enviarMensagemTexto === 'function') {
        await client.enviarMensagemTexto(destino, textoFinal);
      } else if (socket) {
        await socket.sendMessage(destino, { text: textoFinal });
      }
      enviados++;
      console.log(`[Agendador Abertura] Enviado com sucesso para ${destino}`);
      if (destinos.length > 1 && pacingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, pacingMs));
      }
    } catch (err: unknown) {
      falhas++;
      console.error(`[Agendador Abertura] Falha ao enviar para ${destino}:`, err);
    }
  }

  if (!forcarTeste && enviados > 0) {
    const { dataFormatada } = obterHoraBrasilia();
    setConfig('msg_abertura_ultimo_envio', dataFormatada);
  }

  return {
    sucesso: enviados > 0,
    totalEnviados: enviados,
    totalFalhas: falhas,
    destinos,
    mensagem: textoFinal
  };
}

/**
 * Verifica se atingiu o horário configurado em Brasília e se ainda não foi enviado hoje.
 */
export async function verificarEExecutarAgendador(
  client: WhatsAppClientLike
): Promise<boolean> {
  const ativo = getConfig('msg_abertura_ativa', 'true') === 'true';
  if (!ativo) return false;

  const horarioAlvo = getConfig('msg_abertura_horario', '07:00').trim();
  const { horaFormatada, dataFormatada } = obterHoraBrasilia();

  if (horaFormatada !== horarioAlvo) {
    return false;
  }

  const ultimoEnvio = getConfig('msg_abertura_ultimo_envio', '');
  if (ultimoEnvio === dataFormatada) {
    return false;
  }

  console.log(`[Agendador Abertura] Horário de abertura atingido (${horaFormatada} BRT). Disparando anúncio matinal...`);
  const res = await dispararMensagemAbertura(client, false);
  return res.sucesso;
}

let agendadorInterval: NodeJS.Timeout | null = null;
let caixaMetaInterval: NodeJS.Timeout | null = null;
let affiliateSyncInterval: NodeJS.Timeout | null = null;
let ultimoDiaConhecidoBRT = '';

/**
 * Monitora a transição de dia oficial de Brasília (00:00:00 BRT).
 * Quando a data vira, reseta instantaneamente as métricas de comissão de hoje para R$ 0,00.
 */
export async function verificarViradaDeDia(): Promise<void> {
  const { dataFormatada } = obterHoraBrasilia();
  if (!ultimoDiaConhecidoBRT) {
    ultimoDiaConhecidoBRT = dataFormatada;
    return;
  }

  if (dataFormatada !== ultimoDiaConhecidoBRT) {
    console.log(`[Agendador] 🕛 Virada de dia detectada no fuso de Brasília! De ${ultimoDiaConhecidoBRT} para ${dataFormatada}.`);
    ultimoDiaConhecidoBRT = dataFormatada;
    try {
      meliAffiliateService.resetarNovoDia(dataFormatada);
      console.log(`[Agendador] ✅ Novo dia iniciado (${dataFormatada}): Comissões e vendas de hoje reiniciadas em R$ 0,00 conforme Mercado Livre.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[Agendador] Erro ao resetar comissões no novo dia:', msg);
    }
  }
}

/**
 * Executa sincronização em background das comissões do Mercado Livre a cada 20 minutos.
 */
export async function sincronizarAfiliadosEmBackground(): Promise<void> {
  try {
    if (!meliAffiliateService.isConnected()) {
      return;
    }
    const metrics = await meliAffiliateService.fetchLiveMetrics();
    console.log(`[Meli Afiliados Auto-Sync] Sincronização em background: Hoje R$ ${metrics.commissionsToday.toFixed(2)} (${metrics.ordersToday} pedidos, ${metrics.totalClicks} cliques).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Meli Afiliados Auto-Sync] Erro na sincronização em background:', msg);
  }
}

/**
 * Executa verificação e snapshot em background do Saldo de Caixa do Meta Ads.
 * Roda a cada 2 horas e também na inicialização.
 */
export async function sincronizarCaixaMetaEmBackground(): Promise<void> {
  try {
    const config = await metaAdsService.getConfigStatus();
    if (!config.configured) {
      return;
    }
    const res = await metaAdsService.getAdAccountBalance();
    if (res && res.ok) {
      console.log(`[Caixa Meta Ads] Snapshot em background sincronizado: R$ ${res.currentBalance.toFixed(2)} (${res.statusBadge.toUpperCase()})`);
      if (res.statusBadge === 'critical' || res.statusBadge === 'warning') {
        console.warn(`[Caixa Meta Ads Alerta] Atenção: Saldo de caixa baixo ou crítico: R$ ${res.currentBalance.toFixed(2)} (Limite: R$ ${res.alertThreshold.toFixed(2)})`);
      }
    }
  } catch (err: unknown) {
    console.warn('[Caixa Meta Ads] Aviso na sincronização em background:', err);
  }
}

/**
 * Inicia o agendador contínuo em segundo plano (polling a cada 30 segundos).
 */
export function iniciarAgendadorDiario(client: WhatsAppClientLike): void {
  if (agendadorInterval) {
    clearInterval(agendadorInterval);
  }
  if (caixaMetaInterval) {
    clearInterval(caixaMetaInterval);
  }
  if (affiliateSyncInterval) {
    clearInterval(affiliateSyncInterval);
  }

  // Inicializa o dia conhecido de Brasília
  ultimoDiaConhecidoBRT = obterHoraBrasilia().dataFormatada;

  console.log('[Agendador Diário] Serviço de abertura de grupos e monitoramento de virada de dia ativado.');

  verificarEExecutarAgendador(client).catch((err) => {
    console.error('[Agendador Diário] Erro na verificação inicial:', err);
  });

  agendadorInterval = setInterval(() => {
    verificarEExecutarAgendador(client).catch((err) => {
      console.error('[Agendador Diário] Erro na verificação periódica:', err);
    });
    // Verifica virada de dia a cada 30 segundos
    verificarViradaDeDia().catch((err) => {
      console.error('[Agendador Diário] Erro ao verificar virada de dia:', err);
    });
  }, 30000);

  // Sincronização periódica de Afiliados Mercado Livre a cada 20 minutos (warmup inicial em 10s)
  setTimeout(() => {
    sincronizarAfiliadosEmBackground().catch(() => {});
  }, 10000);

  const VINTE_MINUTOS_MS = 20 * 60 * 1000;
  affiliateSyncInterval = setInterval(() => {
    sincronizarAfiliadosEmBackground().catch(() => {});
  }, VINTE_MINUTOS_MS);

  // Sincronização periódica do Caixa Meta Ads a cada 2 horas (com warmup inicial de 5s)
  setTimeout(() => {
    sincronizarCaixaMetaEmBackground().catch(() => {});
  }, 5000);

  const DUAS_HORAS_MS = 2 * 60 * 60 * 1000;
  caixaMetaInterval = setInterval(() => {
    sincronizarCaixaMetaEmBackground().catch(() => {});
  }, DUAS_HORAS_MS);
}

/**
 * Para o agendador (usado em testes e shutdown gracioso).
 */
export function pararAgendadorDiario(): void {
  if (agendadorInterval) {
    clearInterval(agendadorInterval);
    agendadorInterval = null;
  }
  if (caixaMetaInterval) {
    clearInterval(caixaMetaInterval);
    caixaMetaInterval = null;
  }
  if (affiliateSyncInterval) {
    clearInterval(affiliateSyncInterval);
    affiliateSyncInterval = null;
  }
}

