import {
  getConfig,
  logSistema,
  getNextItemFila,
  updateItemFilaStatus,
  updateCampanhaStatus,
  incrementCampanhaCounter,
  getCampanhaById,
  db
} from '../db/database.js';
import { whatsapp } from '../whatsapp/client.js';

class DispatchEngine {
  private isRunning = false;
  private consecutiveSends = 0;
  private loopTimer: NodeJS.Timeout | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logSistema('info', 'disparo', 'Motor de disparos iniciado.');
    this.processNext();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    logSistema('info', 'disparo', 'Motor de disparos pausado.');
  }

  private isWithinAllowedHours(): boolean {
    const inicio = getConfig('disparo_horario_inicio', '08:00');
    const fim = getConfig('disparo_horario_fim', '21:30');

    const agora = new Date();
    const horaMinutoAtual = agora.toTimeString().slice(0, 5);

    return horaMinutoAtual >= inicio && horaMinutoAtual <= fim;
  }

  private isDailyLimitReached(): boolean {
    const limite = parseInt(getConfig('disparo_limite_diario', '100'), 10);
    const enviosHoje = (
      db.prepare(`
        SELECT COUNT(*) as c FROM fila_envios
        WHERE status = 'enviado' AND date(enviado_em) = date('now', 'localtime')
      `).get() as any
    ).c;

    return enviosHoje >= limite;
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

    // Verificar limite diário
    if (this.isDailyLimitReached()) {
      logSistema('warn', 'disparo', 'Limite diário de disparos atingido para aquecimento do chip.');
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

    // Checar descanso periódico
    const pausaACada = parseInt(getConfig('disparo_pausa_a_cada', '20'), 10);
    const pausaMinutos = parseInt(getConfig('disparo_pausa_tempo_minutos', '5'), 10);

    if (pausaACada > 0 && this.consecutiveSends >= pausaACada) {
      this.consecutiveSends = 0;
      logSistema(
        'info',
        'disparo',
        `Pausa de proteção anti-ban ativada: descansando por ${pausaMinutos} minutos...`
      );
      this.loopTimer = setTimeout(() => this.processNext(), pausaMinutos * 60 * 1000);
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

    // Delay randômico anti-ban entre mensagens
    const delayMin = parseInt(getConfig('disparo_delay_min', '30'), 10);
    const delayMax = parseInt(getConfig('disparo_delay_max', '65'), 10);
    const delayRandom = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;

    logSistema('info', 'disparo', `Próximo disparo em ${Math.round(delayRandom / 1000)} segundos...`);
    this.loopTimer = setTimeout(() => this.processNext(), delayRandom);
  }
}

export const dispatchEngine = new DispatchEngine();
