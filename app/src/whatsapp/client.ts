import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { AUTH_DIR } from '../config.js';
import {
  getConfig,
  getAllRotas,
  insertLog,
  getPostsLastHour,
  updateChatCache,
  getChatName
} from '../db/database.js';
import { processMessageText, downloadProductImage } from '../core/affiliate.js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'qr';

export interface WhatsAppState {
  status: ConnectionStatus;
  qrDataUrl: string | null;
  userPhone: string | null;
}

export class WhatsAppManager {
  private sock: WASocket | null = null;
  private state: WhatsAppState = {
    status: 'disconnected',
    qrDataUrl: null,
    userPhone: null
  };
  private onStateChangeListeners: ((state: WhatsAppState) => void)[] = [];
  private onMessageProcessedListeners: ((log: any) => void)[] = [];
  private reconnectAttempts = 0;
  private lastSyncTime = 0;

  constructor() {
    this.logger = pino({ level: 'warn' });
  }

  private logger: pino.Logger;

  public getState(): WhatsAppState {
    return { ...this.state };
  }

  public onStateChange(listener: (state: WhatsAppState) => void) {
    this.onStateChangeListeners.push(listener);
  }

  public onMessageProcessed(listener: (log: any) => void) {
    this.onMessageProcessedListeners.push(listener);
  }

  private notifyStateChange() {
    for (const listener of this.onStateChangeListeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error('Erro no listener de estado WhatsApp:', err);
      }
    }
  }

  private notifyMessage(log: any) {
    for (const listener of this.onMessageProcessedListeners) {
      try {
        listener(log);
      } catch (err) {
        console.error('Erro no listener de mensagem WhatsApp:', err);
      }
    }
  }

  public cleanAuthDir(): void {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      fs.mkdirSync(AUTH_DIR, { recursive: true });
      console.log('[WA] Diretório de autenticação limpo com sucesso.');
    } catch (err) {
      console.error('[WA] Erro ao limpar AUTH_DIR:', err);
    }
  }

  public async resetSession(): Promise<void> {
    console.log('[WA] Reset de sessão solicitado.');
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {}
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    this.cleanAuthDir();
    this.reconnectAttempts = 0;
    this.state = { status: 'connecting', qrDataUrl: null, userPhone: null };
    this.notifyStateChange();
    await this.start();
  }

  public async start(): Promise<void> {
    try {
      this.state.status = 'connecting';
      this.notifyStateChange();

      // Verificar integridade dos dados de autenticação antes de carregar
      const credsFile = path.join(AUTH_DIR, 'creds.json');
      if (fs.existsSync(credsFile)) {
        try {
          const credsContent = fs.readFileSync(credsFile, 'utf8');
          const parsed = JSON.parse(credsContent);
          if (parsed && parsed.registered === false) {
            console.log('[WA] Detectada sessão antiga/não registrada em creds.json. Limpando para forçar novo QR Code...');
            this.cleanAuthDir();
          }
        } catch (e) {
          console.error('[WA] creds.json corrompido. Limpando pasta de auth:', e);
          this.cleanAuthDir();
        }
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: this.logger,
        browser: ['Promo Replica', 'Chrome', '124.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.state.qrDataUrl = await QRCode.toDataURL(qr);
            this.state.status = 'qr';
            this.notifyStateChange();
            console.log('[WA] Novo QR Code gerado e pronto para pareamento.');
          } catch (e) {
            console.error('Erro ao gerar imagem QR:', e);
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
          const shouldReconnect = !isLoggedOut;

          console.log(`[WA] Conexão fechada com status ${statusCode}. Deslogado/Revogado: ${isLoggedOut}. Reconectar sessão: ${shouldReconnect}`);

          this.state.status = 'disconnected';
          this.state.qrDataUrl = null;
          this.state.userPhone = null;
          this.notifyStateChange();

          if (isLoggedOut) {
            console.log('[WA] Sessão encerrada/revogada pelo WhatsApp. Limpando dados de auth para gerar novo QR Code...');
            this.reconnectAttempts = 0;
            try {
              if (this.sock) {
                this.sock.end(undefined);
                this.sock = null;
              }
            } catch {}
            this.cleanAuthDir();
            // Reiniciar automaticamente para emitir um novo QR Code limpo!
            console.log('[WA] Reiniciando Baileys em 1.5s para gerar novo QR Code...');
            setTimeout(() => this.start(), 1500);
          } else if (shouldReconnect) {
            const delay = Math.min(10000, 2000 * Math.pow(1.5, this.reconnectAttempts++));
            console.log(`[WA] Tentando reconectar sessão em ${delay / 1000}s...`);
            setTimeout(() => this.start(), delay);
          }
        } else if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.state.status = 'connected';
          this.state.qrDataUrl = null;
          this.state.userPhone = this.sock?.user?.id?.split(':')[0] || null;
          this.notifyStateChange();

          console.log(`WhatsApp conectado com sucesso como: ${this.state.userPhone}`);
          await this.syncGroups();
        }
      });

      this.sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;
        for (const msg of m.messages) {
          await this.handleIncomingMessage(msg);
        }
      });

      this.sock.ev.on('groups.update', async (updates) => {
        for (const u of updates) {
          if (u.id && u.subject) {
            updateChatCache(u.id, u.subject, true);
          }
        }
      });
    } catch (err) {
      console.error('Erro ao iniciar WhatsApp:', err);
      this.state.status = 'disconnected';
      this.notifyStateChange();
    }
  }

  public async syncGroups(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncTime < 60000) {
      return; // Prevenir rate limit do WhatsApp
    }
    this.lastSyncTime = now;
    if (!this.sock) return;

    try {
      const groups = await this.sock.groupFetchAllParticipating();
      for (const [id, metadata] of Object.entries(groups)) {
        if (metadata.subject) {
          updateChatCache(id, metadata.subject, true);
        }
      }
      console.log(`Sincronizados ${Object.keys(groups).length} grupos do WhatsApp.`);
    } catch (err: any) {
      console.warn('Aviso de sincronização de grupos:', err?.message || err);
    }
  }

  public async logout(): Promise<void> {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch {}
      try {
        this.sock.end(undefined);
      } catch {}
      this.sock = null;
    }
    this.cleanAuthDir();
    this.state = { status: 'disconnected', qrDataUrl: null, userPhone: null };
    this.notifyStateChange();
  }

  public async sendDirectMessage(
    toChatId: string,
    text: string,
    imageBuffer?: Buffer | null
  ): Promise<boolean> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado no momento.');
    }
    if (imageBuffer && imageBuffer.length > 0) {
      await this.sock.sendMessage(toChatId, {
        image: imageBuffer,
        caption: text
      });
    } else {
      await this.sock.sendMessage(toChatId, {
        text
      });
    }
    return true;
  }

  public unwrapMessage(msg: any): any {
    if (!msg) return msg;
    if (msg.ephemeralMessage?.message) return this.unwrapMessage(msg.ephemeralMessage.message);
    if (msg.viewOnceMessage?.message) return this.unwrapMessage(msg.viewOnceMessage.message);
    if (msg.viewOnceMessageV2?.message) return this.unwrapMessage(msg.viewOnceMessageV2.message);
    if (msg.viewOnceMessageV2Extension?.message) return this.unwrapMessage(msg.viewOnceMessageV2Extension.message);
    if (msg.documentWithCaptionMessage?.message) return this.unwrapMessage(msg.documentWithCaptionMessage.message);
    if (msg.deviceSentMessage?.message) return this.unwrapMessage(msg.deviceSentMessage.message);
    if (msg.editedMessage?.message) return this.unwrapMessage(msg.editedMessage.message);
    return msg;
  }

  public extractMediaAndText(rawMessage: any): {
    rawText: string;
    hasImage: boolean;
    imageMessageObj: any;
    isDocumentImage: boolean;
    linkPreviewTitle?: string;
    linkPreviewThumbnail?: Buffer;
  } {
    const content = this.unwrapMessage(rawMessage);
    if (!content) {
      return { rawText: '', hasImage: false, imageMessageObj: null, isDocumentImage: false };
    }

    let rawText = '';
    let hasImage = false;
    let imageMessageObj: any = null;
    let isDocumentImage = false;
    let linkPreviewTitle: string | undefined;
    let linkPreviewThumbnail: Buffer | undefined;

    if (content.imageMessage) {
      rawText = content.imageMessage.caption || '';
      hasImage = true;
      imageMessageObj = content.imageMessage;
    } else if (content.documentMessage) {
      rawText = content.documentMessage.caption || '';
      if (content.documentMessage.mimetype?.startsWith('image/')) {
        hasImage = true;
        imageMessageObj = content.documentMessage;
        isDocumentImage = true;
      }
    } else if (content.interactiveMessage) {
      rawText = content.interactiveMessage.body?.text || '';
      if (content.interactiveMessage.header?.imageMessage) {
        hasImage = true;
        imageMessageObj = content.interactiveMessage.header.imageMessage;
      }
    } else if (content.templateMessage?.hydratedTemplate) {
      const tmpl = content.templateMessage.hydratedTemplate;
      rawText = tmpl.hydratedContentText || '';
      if (tmpl.imageMessage) {
        hasImage = true;
        imageMessageObj = tmpl.imageMessage;
      }
    } else if (content.templateMessage?.hydratedFourRowTemplate) {
      const tmpl = content.templateMessage.hydratedFourRowTemplate;
      rawText = tmpl.hydratedContentText || '';
      if (tmpl.imageMessage) {
        hasImage = true;
        imageMessageObj = tmpl.imageMessage;
      }
    } else if (content.buttonsMessage) {
      rawText = content.buttonsMessage.contentText || '';
      if (content.buttonsMessage.imageMessage) {
        hasImage = true;
        imageMessageObj = content.buttonsMessage.imageMessage;
      }
    } else if (content.extendedTextMessage) {
      rawText = content.extendedTextMessage.text || '';
      if (content.extendedTextMessage.title) {
        linkPreviewTitle = content.extendedTextMessage.title;
      }
      if (content.extendedTextMessage.jpegThumbnail) {
        const thumb = content.extendedTextMessage.jpegThumbnail;
        linkPreviewThumbnail = Buffer.isBuffer(thumb) ? thumb : Buffer.from(thumb);
      }
    } else if (content.conversation) {
      rawText = content.conversation;
    }

    return { rawText, hasImage, imageMessageObj, isDocumentImage, linkPreviewTitle, linkPreviewThumbnail };
  }

  private async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    if (!msg.key || !msg.key.remoteJid) return;
    const remoteJid = msg.key.remoteJid;
    if (!remoteJid.endsWith('@g.us')) return; // Apenas mensagens de grupo

    // Evitar loop se a mensagem for de um destino que postou de volta
    const rotas = getAllRotas().filter((r) => r.ativa);
    const rotasCorrespondentes = rotas.filter((r) => r.origens.includes(remoteJid));

    if (rotasCorrespondentes.length === 0) {
      return; // Este grupo não é origem de nenhuma rota ativa
    }

    // Extrair texto e mídia desembrulhando containers (ephemeral, viewOnce, deviceSentMessage, etc.)
    const {
      rawText,
      hasImage: messageHasImage,
      imageMessageObj,
      isDocumentImage,
      linkPreviewTitle,
      linkPreviewThumbnail
    } = this.extractMediaAndText(msg.message);
    let imageBuffer: Buffer | null = null;

    if (!rawText.trim() && !messageHasImage) {
      return; // Mensagem vazia ou sticker/áudio sem legenda
    }

    const origemNome = getChatName(remoteJid);
    const isAtivo = getConfig('ativo', 'true') === 'true';

    // 1. Checar se esteira está ativa
    if (!isAtivo) {
      const log = {
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: `disabled_${Date.now()}_${Math.random()}`,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: messageHasImage,
        links_convertidos: 0,
        status: 'ignorado' as const,
        motivo: 'replica_desligada'
      };
      insertLog(log);
      this.notifyMessage(log);
      return;
    }

    // 2. Checar idade da mensagem (máximo atraso)
    const maxAtraso = parseInt(getConfig('atraso_maximo_segundos', '600'), 10);
    const messageTimestamp = Number(msg.messageTimestamp || 0);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (messageTimestamp > 0 && nowSeconds - messageTimestamp > maxAtraso) {
      const log = {
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: `old_${Date.now()}_${Math.random()}`,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: messageHasImage,
        links_convertidos: 0,
        status: 'ignorado' as const,
        motivo: 'mensagem_muito_antiga'
      };
      insertLog(log);
      this.notifyMessage(log);
      return;
    }

    // 3. Checar teto anti-flood por hora
    const tetoHora = parseInt(getConfig('teto_hora', '40'), 10);
    const postsLastHour = getPostsLastHour();
    if (postsLastHour >= tetoHora) {
      const log = {
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: `flood_${Date.now()}_${Math.random()}`,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: messageHasImage,
        links_convertidos: 0,
        status: 'ignorado' as const,
        motivo: `teto_atingido_${postsLastHour}/${tetoHora}`
      };
      insertLog(log);
      this.notifyMessage(log);
      return;
    }

    // 4. Converter texto e links com suporte a meli.la e cookies
    const mattWord = getConfig('affiliate_matt_word', 'caed1312314');
    const mattTool = getConfig('affiliate_matt_tool', '96097202');
    const meliCookie = getConfig('meli_cookie', '');
    const meliTag = getConfig('meli_tag', mattWord);
    const frasesRemover = getConfig('frases_remover', '');
    const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');

    const { novoTexto, linksConvertidos, hashConteudo, contemMercadoLivre, productImageUrl, resolvedProductUrl } =
      await processMessageText(
        rawText,
        remoteJid,
        mattWord,
        mattTool,
        frasesRemover,
        meliCookie,
        meliTag,
        linkVitrineCurto,
        linkPreviewTitle || ''
      );

    // REGRA DE NEGÓCIO: Apenas postar publicações do Mercado Livre
    // Mensagens sem link ML ou de outros marketplaces (Amazon, Shopee, etc.) são ignoradas
    const somenteMercadoLivre = getConfig('somente_mercadolivre', 'true') === 'true';
    if (somenteMercadoLivre && (!contemMercadoLivre || linksConvertidos === 0)) {
      console.log(`[Filtro Mercado Livre] Mensagem ignorada: não contém links válidos do Mercado Livre.`);
      const log = insertLog({
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: hashConteudo,
        texto_original: rawText,
        texto_publicado: novoTexto,
        tem_foto: Boolean(messageHasImage),
        links_convertidos: linksConvertidos,
        status: 'ignorado',
        motivo: 'sem_link_mercadolivre'
      });
      this.notifyMessage(log);
      return;
    }

    // 5. Obtenção da imagem do produto:
    // A) Se veio foto anexada no WhatsApp, baixa o buffer pelo Baileys
    if (messageHasImage && imageMessageObj && this.sock) {
      try {
        const downloadPayload = isDocumentImage
          ? { key: msg.key, message: { documentMessage: imageMessageObj } }
          : { key: msg.key, message: { imageMessage: imageMessageObj } };

        imageBuffer = (await downloadMediaMessage(
          downloadPayload as any,
          'buffer',
          {},
          { logger: this.logger, reuploadRequest: this.sock.updateMediaMessage }
        )) as Buffer;

        console.log(`[Imagem WhatsApp] Foto baixada com sucesso (${Math.round(imageBuffer.length / 1024)} KB).`);
      } catch (err) {
        console.error('Erro ao baixar mídia com downloadPayload, tentando fallback:', err);
        try {
          imageBuffer = (await downloadMediaMessage(
            msg as any,
            'buffer',
            {},
            { logger: this.logger, reuploadRequest: this.sock.updateMediaMessage }
          )) as Buffer;
          console.log(`[Imagem WhatsApp Fallback] Foto baixada com sucesso (${Math.round(imageBuffer.length / 1024)} KB).`);
        } catch (err2) {
          console.error('Erro no fallback ao baixar mídia do WhatsApp:', err2);
        }
      }
    }

    // B) Se NÃO veio foto anexada no WhatsApp (ou falhou o download), mas temos anúncio do Mercado Livre:
    // Baixa a imagem oficial do anúncio em alta resolução diretamente do Mercado Livre (se houver foto válida)
    if ((!imageBuffer || imageBuffer.length === 0) && (contemMercadoLivre || productImageUrl)) {
      if (productImageUrl || resolvedProductUrl) {
        try {
          imageBuffer = await downloadProductImage(
            resolvedProductUrl || '',
            meliCookie,
            productImageUrl || ''
          );
          if (imageBuffer && imageBuffer.length > 0) {
            console.log(`[Imagem ML] Foto oficial do anúncio baixada com sucesso (${Math.round(imageBuffer.length / 1024)} KB).`);
          }
        } catch (err) {
          console.warn('[Imagem ML] Falha ao obter foto do anúncio do Mercado Livre:', err);
        }
      }
    }

    // C) Fallback de Imagem: Se não conseguimos a foto em alta resolução do ML, mas tínhamos a miniatura do link preview
    if ((!imageBuffer || imageBuffer.length === 0) && linkPreviewThumbnail && linkPreviewThumbnail.length > 500) {
      imageBuffer = linkPreviewThumbnail;
      console.log(`[Imagem Preview Fallback] Usando miniatura do link preview do WhatsApp (${Math.round(imageBuffer.length / 1024)} KB).`);
    }

    // 6. Testar Deduplicação no Banco
    const destinoIds = rotasCorrespondentes.flatMap((r) => r.destinos).filter((d) => d && d !== remoteJid);
    const destinoChatId = destinoIds.join(', ');

    const inserted = insertLog({
      origem_chat_id: remoteJid,
      origem_nome: origemNome,
      destino_chat_id: destinoChatId,
      hash_conteudo: hashConteudo,
      texto_original: rawText,
      texto_publicado: novoTexto,
      tem_foto: Boolean(imageBuffer && imageBuffer.length > 0),
      links_convertidos: linksConvertidos,
      status: 'enviado',
      motivo: contemMercadoLivre ? 'copia_com_afiliado' : 'copia_sem_afiliado'
    });

    if (!inserted) {
      console.log(`Mensagem descartada por duplicidade (hash: ${hashConteudo.slice(0, 10)})`);
      return;
    }

    // 7. Aplicar Delay configurado
    const delaySegundos = parseInt(getConfig('delay_segundos', '5'), 10);
    if (delaySegundos > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySegundos * 1000));
    }

    // 8. Enviar para todos os destinos configurados
    if (this.sock) {
      for (const destino of destinoIds) {
        try {
          if (imageBuffer && imageBuffer.length > 0) {
            await this.sock.sendMessage(destino, {
              image: imageBuffer,
              caption: novoTexto
            });
          } else {
            await this.sock.sendMessage(destino, {
              text: novoTexto
            });
          }
          console.log(`[REPLICA OK] Post enviado para destino: ${destino} (com foto: ${Boolean(imageBuffer)})`);
        } catch (err) {
          console.error(`Erro ao enviar para destino ${destino}:`, err);
        }
      }
    }

    // Notificar painel via WebSocket
    this.notifyMessage({
      origem_chat_id: remoteJid,
      origem_nome: origemNome,
      destino_chat_id: destinoChatId,
      hash_conteudo: hashConteudo,
      texto_original: rawText,
      texto_publicado: novoTexto,
      tem_foto: Boolean(imageBuffer && imageBuffer.length > 0),
      links_convertidos: linksConvertidos,
      status: 'enviado',
      motivo: contemMercadoLivre ? 'copia_com_afiliado' : 'copia_sem_afiliado',
      criado_em: new Date().toISOString()
    });
  }
}

export const whatsAppManager = new WhatsAppManager();
