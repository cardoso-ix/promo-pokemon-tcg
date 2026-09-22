import { getConfig, setConfig, getAllRotas, DEFAULT_MSG_ABERTURA } from '../db/database.js';

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
 */
export function prepararTextoMensagemAbertura(template: string, diaSemana?: string): string {
  const dia = diaSemana || obterHoraBrasilia().diaSemana;
  const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
  return (template || DEFAULT_MSG_ABERTURA)
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

/**
 * Inicia o agendador contínuo em segundo plano (polling a cada 30 segundos).
 */
export function iniciarAgendadorDiario(client: WhatsAppClientLike): void {
  if (agendadorInterval) {
    clearInterval(agendadorInterval);
  }

  console.log('[Agendador Diário] Serviço de abertura de grupos ativado (verificação a cada 30s).');

  verificarEExecutarAgendador(client).catch((err) => {
    console.error('[Agendador Diário] Erro na verificação inicial:', err);
  });

  agendadorInterval = setInterval(() => {
    verificarEExecutarAgendador(client).catch((err) => {
      console.error('[Agendador Diário] Erro na verificação periódica:', err);
    });
  }, 30000);
}

/**
 * Para o agendador (usado em testes e shutdown gracioso).
 */
export function pararAgendadorDiario(): void {
  if (agendadorInterval) {
    clearInterval(agendadorInterval);
    agendadorInterval = null;
  }
}
