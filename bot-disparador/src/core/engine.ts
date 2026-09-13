import {
  getConfig,
  logSistema,
  getNextItemFila,
  updateItemFilaStatus,
  updateCampanhaStatus,
  incrementCampanhaCounter,
  getCampanhaById,
  getWarmupStatus,
  db
} from '../db/database.js';
import { whatsapp } from '../whatsapp/client.js';

export function calculateDynamicDelay(minSec = 15, maxSec = 45): number {
  let min = Math.max(5, minSec);
  let max = Math.max(5, maxSec);
  if (min > max) [min, max] = [max, min];

  // Garante que NUNCA haja intervalo fixo mesmo se min == max
  if (min === max) {
    min = Math.max(5, Math.floor(min * 0.8));
    max = Math.ceil(max * 1.2) + 2;
  }

  const randomizedSec = Math.floor(Math.random() * (max - min + 1) + min);
  // Adiciona jitter adicional de milissegundos para naturalidade absoluta
  const jitterMs = Math.floor(Math.random() * 900);
  return randomizedSec * 1000 + jitterMs;
}

export function calculateBlockPauseMinutes(minMin = 30, maxMin = 60): number {
  let min = Math.max(1, minMin);
  let max = Math.max(1, maxMin);
  if (min > max) [min, max] = [max, min];
  if (min === max) max = min + 5;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

class DispatchEngine {
  private isRunning = false;
  private consecutiveSends = 0;
  private loopTimer: NodeJS.Timeout | null = null;
  private blockPauseUntil: Date | null = null;

  public getStatus() {
    const isPaused = this.blockPauseUntil !== null && this.blockPauseUntil.getTime() > Date.now();
    const remainingMs = isPaused ? this.blockPauseUntil!.getTime() - Date.now() : 0;
    const remainingMin = Math.ceil(remainingMs / 60000);
    const pauseTimeFormatted = isPaused
      ? new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit'
        }).format(this.blockPauseUntil!)
      : null;

    return {
      isRunning: this.isRunning,
      consecutiveSends: this.consecutiveSends,
      inBlockPause: isPaused,
      pauseUntil: isPaused ? this.blockPauseUntil!.toISOString() : null,
      pauseTimeFormatted,
      remainingMinutes: remainingMin
    };
  }

  public async start(forceResume = false): Promise<void> {
    if (this.loopTimer && forceResume) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
      this.blockPauseUntil = null;
    }
    if (this.isRunning && !forceResume) return;
    this.isRunning = true;
    logSistema('info', 'disparo', 'Motor de disparos iniciado.');
    this.processNext();
  }

  public resumeNow(): void {
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    this.blockPauseUntil = null;
    this.consecutiveSends = 0;
    this.isRunning = true;
    logSistema('info', 'disparo', 'Pausa forçada encerrada pelo usuário. Retomando fila de disparos agora!');
    this.processNext();
  }

  public stop(): void {
    this.isRunning = false;
    this.blockPauseUntil = null;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    logSistema('info', 'disparo', 'Motor de disparos pausado.');
  }

  private isWithinAllowedHours(): boolean {
    const inicio = getConfig('disparo_horario_inicio', '08:00');
    const fim = getConfig('disparo_horario_fim', '21:30');

    // Fuso horário oficial do Brasil (Brasília / America/Sao_Paulo)
    const horaMinutoAtual = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());

    return horaMinutoAtual >= inicio && horaMinutoAtual <= fim;
  }

  private isDailyLimitReached(): boolean {
    const warmup = getWarmupStatus();
    return warmup.enviosHoje >= warmup.limiteHoje;
  }

  private async processNext(): Promise<void> {
    if (!this.isRunning) return;

    // Verificar se o WhatsApp está conectado
    if (whatsapp.state.status !== 'connected') {
      this.loopTimer = setTimeout(() => this.processNext(), 5000);
      return;
    }

    // Verificar janela de horário
    if (!this.isWithinAllowedHours()) {
      logSistema('info', 'disparo', 'Fora do horário permitido de disparo. Aguardando...');
      this.loopTimer = setTimeout(() => this.processNext(), 60000);
      return;
    }

    // Verificar limite diário (com Warm Up / Aquecimento Inteligente)
    if (this.isDailyLimitReached()) {
      const warmup = getWarmupStatus();
      if (warmup.ativo) {
        logSistema(
          'warn',
          'disparo',
          `[AQUECIMENTO] Limite diário de segurança atingido (Dia ${warmup.diaAtual}: ${warmup.enviosHoje}/${warmup.limiteHoje} mensagens). O volume aumentará amanhã gradativamente.`
        );
      } else {
        logSistema(
          'warn',
          'disparo',
          `Limite diário de disparos atingido (${warmup.enviosHoje}/${warmup.limiteHoje}).`
        );
      }
      this.loopTimer = setTimeout(() => this.processNext(), 60000);
      return;
    }

    // Obter próximo item da fila
    const item = getNextItemFila();

    if (!item) {
      // Nenhum item pendente no momento
      this.loopTimer = setTimeout(() => this.processNext(), 5000);
      return;
    }

    const campanha = getCampanhaById(item.campanha_id);
    if (!campanha || campanha.status !== 'executando') {
      this.loopTimer = setTimeout(() => this.processNext(), 2000);
      return;
    }

    // Checar descanso periódico e pausas longas em blocos (Fator Humano)
    const pausaACada = parseInt(getConfig('disparo_pausa_a_cada', '50'), 10);
    const pausaMinutosMin = parseInt(getConfig('disparo_pausa_minutos_min', '30'), 10);
    const pausaMinutosMax = parseInt(getConfig('disparo_pausa_minutos_max', '60'), 10);

    if (pausaACada > 0 && this.consecutiveSends >= pausaACada) {
      this.consecutiveSends = 0;
      const pausaMinutos = calculateBlockPauseMinutes(pausaMinutosMin, pausaMinutosMax);
      const agora = new Date();
      agora.setMinutes(agora.getMinutes() + pausaMinutos);
      this.blockPauseUntil = agora;

      const horaRetorno = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
      }).format(agora);

      logSistema(
        'info',
        'disparo',
        `[PAUSA LONGA HUMANA] Bloco de ${pausaACada} envios concluído! Pausando por ${pausaMinutos} minutos para descanso natural do chip (retoma às ${horaRetorno})...`
      );
      this.loopTimer = setTimeout(() => {
        this.blockPauseUntil = null;
        this.processNext();
      }, pausaMinutos * 60 * 1000);
      return;
    }

    // Marcar como enviando
    updateItemFilaStatus(item.id!, 'enviando');

    try {
      await whatsapp.sendDirectMessage(
        item.destinatario_jid,
        item.mensagem_gerada,
        campanha.midia_path || undefined
      );

      updateItemFilaStatus(item.id!, 'enviado');
      incrementCampanhaCounter(item.campanha_id, 'enviados');
      this.consecutiveSends++;

      logSistema(
        'disparo',
        'disparo',
        `[ENVIADO] Mensagem entregue para ${item.destinatario_nome || item.destinatario_jid.split('@')[0]}`
      );
    } catch (err: any) {
      const erroMsg = err?.message || String(err);
      updateItemFilaStatus(item.id!, 'falha', erroMsg);
      incrementCampanhaCounter(item.campanha_id, 'falhas');

      logSistema(
        'error',
        'disparo',
        `[FALHA] Erro ao disparar para ${item.destinatario_jid.split('@')[0]}: ${erroMsg}`
      );
    }

    // Verificar se a campanha acabou
    const restante = getNextItemFila(item.campanha_id);
    if (!restante) {
      updateCampanhaStatus(item.campanha_id, 'concluida');
      logSistema('info', 'disparo', `Campanha #${item.campanha_id} concluída com sucesso!`);
    }

    // Delay randômico anti-ban entre mensagens (dinâmico e nunca fixo)
    const delayMin = parseInt(getConfig('disparo_delay_min', '15'), 10);
    const delayMax = parseInt(getConfig('disparo_delay_max', '45'), 10);
    const delayRandom = calculateDynamicDelay(delayMin, delayMax);

    logSistema(
      'info',
      'disparo',
      `Próximo disparo em ${Math.round(delayRandom / 1000)}s (intervalo variável)...`
    );
    this.loopTimer = setTimeout(() => this.processNext(), delayRandom);
  }
}

export const dispatchEngine = new DispatchEngine();
