import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto,
  jidNormalizedUser,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'node:path';
import fs from 'node:fs';
import QRCode from 'qrcode';
import {
  getConfig,
  logSistema,
  upsertGrupo,
  upsertContato,
  getAllGrupos
} from '../db/database.js';
import { generateDeepSeekResponse } from '../ai/deepseek.js';

export interface WhatsAppState {
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_ready';
  qrDataUrl: string | null;
  pairingCode: string | null;
  userPhone: string | null;
}

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data');
const AUTH_DIR = path.join(DATA_DIR, 'auth');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export function calculateTypingDelay(textLength: number, minSec = 3, maxSec = 10): number {
  const minMs = Math.max(1, minSec) * 1000;
  const maxMs = Math.max(minMs, maxSec * 1000);
  const baseMs = 1500 + textLength * 35;
  // Jitter +/- 15%
  const jitter = (Math.random() * 0.3 - 0.15) * baseMs;
  const calculated = Math.round(baseMs + jitter);
  return Math.min(maxMs, Math.max(minMs, calculated));
}

export class WhatsAppManager {
  private sock: any = null;
  private logger = pino({ level: 'silent' });
  private reconnectAttempts = 0;
  private pendingPairingPhone: string | null = null;
  private listeners: ((state: WhatsAppState) => void)[] = [];

  public state: WhatsAppState = {
    status: 'disconnected',
    qrDataUrl: null,
    pairingCode: null,
    userPhone: null
  };

  constructor() {
    // Inicia desconectado, esperando chamada explícita de start()
  }

  public onStateChange(listener: (state: WhatsAppState) => void) {
    this.listeners.push(listener);
  }

  private notifyState() {
    for (const l of this.listeners) {
      l(this.state);
    }
  }

  public async start(pairingPhone?: string): Promise<void> {
    if (pairingPhone) {
      this.pendingPairingPhone = pairingPhone.replace(/\D/g, '');
    }

    this.state.status = 'connecting';
    this.notifyState();

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: this.logger,
        printQRInTerminal: false,
        browser: Browsers.windows('Chrome'),
        markOnlineOnConnect: true,
        getMessage: async () => undefined,
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Gerar Pairing Code caso solicitado para chip novo
      if (!this.sock.authState.creds.registered && this.pendingPairingPhone) {
        setTimeout(async () => {
          try {
            if (this.sock && this.pendingPairingPhone) {
              const code = await this.sock.requestPairingCode(this.pendingPairingPhone);
              this.state.pairingCode = code;
              this.state.status = 'qr_ready';
              this.notifyState();
              logSistema('info', 'whatsapp', `Código de emparelhamento gerado: ${code}`);
            }
          } catch (err: any) {
            logSistema('error', 'whatsapp', `Erro ao solicitar código de emparelhamento: ${err?.message || err}`);
          }
        }, 3000);
      }

      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr && !this.pendingPairingPhone) {
          try {
            this.state.qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
            this.state.status = 'qr_ready';
            this.notifyState();
            logSistema('info', 'whatsapp', 'Novo QR Code gerado para conexão.');
          } catch (err) {
            console.error('Erro ao converter QR Code para DataURL:', err);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.state.status = 'disconnected';
          this.state.qrDataUrl = null;
          this.state.pairingCode = null;
          this.state.userPhone = null;
          this.notifyState();

          logSistema('warn', 'whatsapp', `Conexão encerrada (status: ${statusCode}). Reconectar: ${shouldReconnect}`);

          if (statusCode === DisconnectReason.loggedOut) {
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            } catch {}
          }

          if (shouldReconnect) {
            const delay = Math.min(10000, 2000 * Math.pow(1.5, this.reconnectAttempts++));
            setTimeout(() => this.start(), delay);
          }
        } else if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.pendingPairingPhone = null;
          this.state.status = 'connected';
          this.state.qrDataUrl = null;
          this.state.pairingCode = null;
          this.state.userPhone = this.sock?.user?.id?.split(':')[0] || null;
          this.notifyState();

          logSistema('info', 'whatsapp', `WhatsApp Conectado com sucesso! Número: ${this.state.userPhone}`);
          await this.syncGrupos();
        }
      });

      // Escutar mensagens recebidas para Atendimento Automático com DeepSeek
      this.sock.ev.on('messages.upsert', async (m: any) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          await this.handleIncomingMessage(msg);
        }
      });
    } catch (err: any) {
      logSistema('error', 'whatsapp', `Falha ao inicializar WhatsApp: ${err?.message || err}`);
      this.state.status = 'disconnected';
      this.notifyState();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {}
      this.sock = null;
    }
    try {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {}
    this.state = { status: 'disconnected', qrDataUrl: null, pairingCode: null, userPhone: null };
    this.notifyState();
    logSistema('info', 'whatsapp', 'Sessão do WhatsApp desconectada e limpa.');
  }

  public async syncGrupos(): Promise<any[]> {
    if (!this.sock || this.state.status !== 'connected') return [];

    try {
      const groups = await this.sock.groupFetchAllParticipating();
      const list: any[] = [];

      for (const [jid, meta] of Object.entries(groups) as [string, any][]) {
        if (meta.subject) {
          let fotoUrl = null;
          try {
            fotoUrl = await this.sock.profilePictureUrl(jid, 'image');
          } catch {}

          const g = {
            jid,
            nome: meta.subject,
            total_membros: meta.participants?.length || 0,
            foto_url: fotoUrl
          };
          upsertGrupo(g);
          list.push(g);
        }
      }

      logSistema('info', 'whatsapp', `Sincronizados ${list.length} grupos do WhatsApp.`);
      return list;
    } catch (err: any) {
      logSistema('warn', 'whatsapp', `Aviso ao sincronizar grupos: ${err?.message || err}`);
      return [];
    }
  }

  public async extractGroupParticipants(groupJid: string): Promise<{
    total: number;
    grupoNome: string;
    adminsIgnorados: number;
    ocultosIgnorados: number;
  }> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado.');
    }

    const meta = await this.sock.groupMetadata(groupJid);
    const grupoNome = meta.subject || 'Grupo WhatsApp';
    const participants = meta.participants || [];
    let count = 0;
    let adminsIgnorados = 0;
    let ocultosIgnorados = 0;

    for (const p of participants as any[]) {
      // 1. Resolver identificador: em comunidades, p.phoneNumber traz o telefone real se visível
      let realJid = p.phoneNumber || p.id;
      if (!realJid) continue;

      if (!realJid.includes('@')) {
        realJid = `${realJid.replace(/\D/g, '')}@s.whatsapp.net`;
      }

      // Normalizar para remover sufixos de dispositivo (:1, :2, etc.)
      realJid = jidNormalizedUser(realJid);

      // Se ainda for @lid, significa que o contato está com o número oculto pelas regras de comunidade do WhatsApp
      if (realJid.endsWith('@lid')) {
        ocultosIgnorados++;
        continue;
      }

      const numero = realJid.split('@')[0];
      // Ignorar o próprio bot conectado
      if (numero === this.state.userPhone) continue;

      // Ignorar administradores e criadores do grupo para proteger o usuário de denúncias
      const isAdmin = p.admin === 'admin' || p.admin === 'superadmin';
      if (isAdmin) {
        adminsIgnorados++;
        continue;
      }

      const salvo = upsertContato({
        jid: realJid,
        numero,
        nome: p.notify || p.name || '',
        origem_grupo: groupJid,
        grupo_nome: grupoNome,
        origem_tipo: 'extracao'
      });

      if (salvo) count++;
    }

    if (ocultosIgnorados > 0) {
      logSistema(
        'warn',
        'extracao',
        `Grupo "${grupoNome}": ${ocultosIgnorados} membros possuem número oculto por privacidade de comunidade do WhatsApp e foram ignorados para evitar mensagens perdidas.`
      );
    }

    logSistema(
      'info',
      'extracao',
      `Extração concluída no grupo "${grupoNome}": ${count} contatos válidos extraídos (${adminsIgnorados} admins ignorados, ${ocultosIgnorados} números ocultos ignorados).`
    );
    return { total: count, grupoNome, adminsIgnorados, ocultosIgnorados };
  }

  private async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    if (!msg.key || msg.key.fromMe) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us')) return; // Apenas no Privado (1 a 1)

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      '';

    if (!text.trim()) return;

    const senderName = msg.pushName || '';
    const delayMin = parseInt(getConfig('deepseek_delay_min', '3'), 10);
    const delayMax = parseInt(getConfig('deepseek_delay_max', '6'), 10);
    const typingDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;

    try {
      // Simular presença humana: "digitando..."
      await this.sock.sendPresenceUpdate('composing', remoteJid);

      // Gerar resposta inteligente com DeepSeek
      const reply = await generateDeepSeekResponse(remoteJid, text, senderName);

      if (reply) {
        // Aguarda a simulação natural de digitação
        await new Promise((resolve) => setTimeout(resolve, typingDelay));

        await this.sock.sendMessage(remoteJid, { text: reply });
        await this.sock.sendPresenceUpdate('paused', remoteJid);
      }
    } catch (err: any) {
      logSistema('error', 'ia', `Erro ao responder via IA para ${remoteJid}: ${err?.message || err}`);
    }
  }

  private async simulateHumanPresence(toJid: string, text: string, mediaPath?: string): Promise<void> {
    if (!this.sock) return;
    const simular = getConfig('disparo_simular_digitacao', 'true') === 'true';
    if (!simular) return;

    const presencaConfig = getConfig('disparo_presenca_tipo', 'auto');
    let presence: 'composing' | 'recording' = 'composing';

    if (presencaConfig === 'recording') {
      presence = 'recording';
    } else if (presencaConfig === 'composing') {
      presence = 'composing';
    } else {
      const ext = mediaPath ? path.extname(mediaPath).toLowerCase() : '';
      if (['.mp3', '.ogg', '.opus', '.m4a', '.wav'].includes(ext)) {
        presence = 'recording';
      } else {
        presence = 'composing';
      }
    }

    const minSec = parseInt(getConfig('disparo_digitacao_min', '3'), 10) || 3;
    const maxSec = parseInt(getConfig('disparo_digitacao_max', '10'), 10) || 10;
    const totalDelayMs = calculateTypingDelay(text.length, minSec, maxSec);

    try {
      await this.sock.sendPresenceUpdate(presence, toJid);

      // WhatsApp expira presença após ~5-8s. Se o delay for maior que 4.5s, renovamos o status.
      let elapsed = 0;
      const interval = 4000;
      while (elapsed < totalDelayMs) {
        const sleepTime = Math.min(interval, totalDelayMs - elapsed);
        await new Promise((r) => setTimeout(r, sleepTime));
        elapsed += sleepTime;
        if (elapsed < totalDelayMs) {
          await this.sock.sendPresenceUpdate(presence, toJid);
        }
      }
    } catch {
      // Ignora erro de presença para não travar o fluxo de disparo
    }
  }

  public async sendDirectMessage(
    toJid: string,
    text: string,
    mediaPath?: string
  ): Promise<boolean> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado.');
    }

    if (!toJid || toJid.endsWith('@lid')) {
      throw new Error('Contato possui número oculto no grupo (@lid) e não permite mensagens diretas no WhatsApp.');
    }

    // Normalizar JID de usuário (remove sufixos de dispositivo tipo :1@s.whatsapp.net)
    let cleanJid = jidNormalizedUser(toJid);
    if (!cleanJid.includes('@')) {
      cleanJid = `${cleanJid.replace(/\D/g, '')}@s.whatsapp.net`;
    }

    // Validar se o contato existe e obter o JID canônico registrado no WhatsApp
    let checked: any = null;
    try {
      const results = await this.sock.onWhatsApp(cleanJid);
      checked = results?.[0];
    } catch (err: any) {
      logSistema('warn', 'whatsapp', `Aviso ao consultar onWhatsApp para ${cleanJid}: ${err?.message || err}`);
    }

    const digitsOnly = cleanJid.split('@')[0].replace(/\D/g, '');
    // Se não encontrou e for número brasileiro com 13 dígitos (55 + DDD + 9 dígitos), tentar sem o 9
    if ((!checked || !checked.exists) && digitsOnly.startsWith('55') && digitsOnly.length === 13) {
      const numWithout9 = digitsOnly.slice(0, 4) + digitsOnly.slice(5, 13) + '@s.whatsapp.net';
      try {
        const fallbackResults = await this.sock.onWhatsApp(numWithout9);
        if (fallbackResults?.[0]?.exists) {
          checked = fallbackResults[0];
        }
      } catch {}
    }
    // Se for número brasileiro com 12 dígitos (55 + DDD + 8 dígitos), tentar com o 9
    else if ((!checked || !checked.exists) && digitsOnly.startsWith('55') && digitsOnly.length === 12) {
      const numWith9 = digitsOnly.slice(0, 4) + '9' + digitsOnly.slice(4, 12) + '@s.whatsapp.net';
      try {
        const fallbackResults = await this.sock.onWhatsApp(numWith9);
        if (fallbackResults?.[0]?.exists) {
          checked = fallbackResults[0];
        }
      } catch {}
    }

    if (!checked || !checked.exists) {
      throw new Error(`Número ${digitsOnly} não está registrado ou não possui conta ativa no WhatsApp.`);
    }

    const targetJid = checked.jid || cleanJid;

    // Simulação dinâmica e humana de digitação ou áudio
    await this.simulateHumanPresence(targetJid, text, mediaPath);

    let sentResult: any = null;
    if (mediaPath && fs.existsSync(mediaPath)) {
      const ext = path.extname(mediaPath).toLowerCase();
      const mediaBuf = fs.readFileSync(mediaPath);

      if (['.mp3', '.ogg', '.opus', '.m4a', '.wav'].includes(ext)) {
        sentResult = await this.sock.sendMessage(targetJid, {
          audio: mediaBuf,
          mimetype: ext === '.mp3' ? 'audio/mp4' : 'audio/ogg; codecs=opus',
          ptt: true
        });
      } else {
        sentResult = await this.sock.sendMessage(targetJid, {
          image: mediaBuf,
          caption: text
        });
      }
    } else {
      sentResult = await this.sock.sendMessage(targetJid, {
        text
      });
    }

    if (!sentResult || !sentResult.key) {
      throw new Error(`Falha ao entregar mensagem para ${targetJid}: WhatsApp não confirmou o envio.`);
    }

    try {
      await this.sock.sendPresenceUpdate('paused', targetJid);
    } catch {}

    return true;
  }
}

export const whatsapp = new WhatsAppManager();
