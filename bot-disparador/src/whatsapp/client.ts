import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto
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
        browser: ['Disparador Pro', 'Chrome', '128.0.0.0'],
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

  public async extractGroupParticipants(groupJid: string): Promise<{ total: number; grupoNome: string }> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado.');
    }

    const meta = await this.sock.groupMetadata(groupJid);
    const grupoNome = meta.subject || 'Grupo WhatsApp';
    const participants = meta.participants || [];
    let count = 0;

    for (const p of participants) {
      const jid = p.id;
      if (!jid || jid.includes(':')) continue; // Ignorar IDs com sufixo de dispositivo

      const numero = jid.split('@')[0];
      // Ignorar o próprio bot
      if (numero === this.state.userPhone) continue;

      const salvo = upsertContato({
        jid,
        numero,
        nome: '',
        origem_grupo: groupJid,
        grupo_nome: grupoNome,
        origem_tipo: 'extracao'
      });

      if (salvo) count++;
    }

    logSistema('info', 'extracao', `Extraídos ${count} novos membros do grupo "${grupoNome}".`);
    return { total: count, grupoNome };
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

  public async sendDirectMessage(
    toJid: string,
    text: string,
    mediaPath?: string
  ): Promise<boolean> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado.');
    }

    // Simular digitação por 2 segundos antes de disparar
    await this.sock.sendPresenceUpdate('composing', toJid);
    await new Promise((r) => setTimeout(r, 2000));

    if (mediaPath && fs.existsSync(mediaPath)) {
      const mediaBuf = fs.readFileSync(mediaPath);
      await this.sock.sendMessage(toJid, {
        image: mediaBuf,
        caption: text
      });
    } else {
      await this.sock.sendMessage(toJid, {
        text
      });
    }

    await this.sock.sendPresenceUpdate('paused', toJid);
    return true;
  }
}

export const whatsapp = new WhatsAppManager();
