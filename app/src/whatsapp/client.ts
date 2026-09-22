import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  proto,
  WASocket,
  Browsers
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AUTH_DIR } from '../config.js';
import {
  getConfig,
  getAllRotas,
  insertLog,
  getPostsLastHour,
  updateChatCache,
  getChatName,
  registrarProdutoReplicado,
  consultarCooldownProduto,
  db
} from '../db/database.js';
import { processMessageText, downloadProductImage } from '../core/affiliate.js';
import { extrairDadosOferta, registrarOfertaPlanilha } from '../core/sheets.js';
import {
  isProdutoTCG,
  detectarGatilhoUrgencia,
  detectarMensagemCupom,
  formatarMensagemReplicada,
  extrairCupom,
  extrairParcelamento,
  determinarTipoMensagem
} from '../core/anuncio.js';

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
  private lastDispatchTime = 0;
  private watchdogInterval: NodeJS.Timeout | null = null;

  private startWatchdog(): void {
    this.stopWatchdog();
    this.watchdogInterval = setInterval(() => {
      if (this.state.status === 'connected' && this.sock) {
        try {
          const ws = (this.sock as any)?.ws;
          const readyState = ws?.readyState;
          if (readyState !== undefined && readyState !== 1) {
            console.warn(`[WA Watchdog] Conexão WebSocket Baileys inativa (readyState=${readyState}). Reconectando...`);
            this.reconnectAttempts = 0;
            this.start();
          } else if (ws && typeof ws.ping === 'function') {
            ws.ping();
          }
        } catch (err) {
          console.warn('[WA Watchdog] Heartbeat falhou:', err);
        }
      }
    }, 45000);
  }

  private stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

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
    this.stopWatchdog();
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

      // Verificar se creds.json está corrompido (JSON inválido)
      const credsFile = path.join(AUTH_DIR, 'creds.json');
      if (fs.existsSync(credsFile)) {
        try {
          JSON.parse(fs.readFileSync(credsFile, 'utf8'));
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
        browser: Browsers.windows('Chrome'),
        markOnlineOnConnect: true,
        getMessage: async () => undefined,
        syncFullHistory: false
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
          this.stopWatchdog();
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403;
          const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

          console.log(`[WA] Conexão fechada com status ${statusCode}. Deslogado/Revogado: ${isLoggedOut}. RestartRequired: ${isRestartRequired}`);

          if (isRestartRequired) {
            // Status 515 acontece imediatamente após o celular escanear o QR Code.
            // É fundamental reconectar IMEDIATAMENTE preservando as credenciais recebidas do WhatsApp!
            console.log('[WA] Pareamento detectado (status 515)! Conectando aparelho imediatamente...');
            this.reconnectAttempts = 0;
            this.start();
            return;
          }

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
            console.log('[WA] Reiniciando Baileys em 1.5s para gerar novo QR Code...');
            setTimeout(() => this.start(), 1500);
          } else {
            // Erros temporários ou rotação de QR (ex: 408 timedOut, 428 connectionClosed)
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
          this.startWatchdog();

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
    this.stopWatchdog();
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

    let {
      novoTexto,
      linksConvertidos,
      hashConteudo,
      contemMercadoLivre,
      productImageUrl,
      resolvedProductUrl,
      canonicalProductId
    } = await processMessageText(
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

    // Identificação de conteúdo especial:
    // A) Cupom de Desconto (tela/print de cupom ou mensagem de código)
    const cupomExtraido = extrairCupom(rawText) || '';
    const isCupom = Boolean(cupomExtraido || detectarMensagemCupom(rawText) || /\bcupo(?:m|ns)\b/i.test(rawText));

    // B) Links de Marketplaces concorrentes (Amazon, Shopee, Magalu, AliExpress, etc.)
    const contemMarketplaceConcorrente = /(?:amazon\.com|amzn\.to|shopee\.com|shope\.ee|magazineluiza\.com|aliexpress\.com)/i.test(rawText);

    // C) Digitação avulsa / Comunicado informativo sem link de marketplace
    const replicarComunicados = getConfig('replicar_comunicados_texto', 'false') === 'true';
    const isComunicadoSemLink = linksConvertidos === 0 && !contemMarketplaceConcorrente && !isCupom;

    // Se for uma TELA DE CUPOM (print ou texto de cupom) sem link prévio:
    // Aceita e vincula automaticamente o link oficial da sua vitrine do Mercado Livre
    if (isCupom && (!contemMercadoLivre || linksConvertidos === 0)) {
      contemMercadoLivre = true;
      linksConvertidos = 1;
      resolvedProductUrl = linkVitrineCurto;
    }

    // REGRA DE NEGÓCIO: Filtragem de Marketplaces Concorrentes e Links
    const somenteMercadoLivre = getConfig('somente_mercadolivre', 'true') === 'true';
    if (somenteMercadoLivre) {
      if (contemMarketplaceConcorrente) {
        console.log(`[Filtro Mercado Livre] Mensagem ignorada: contém link de marketplace concorrente.`);
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
          motivo: 'marketplace_concorrente'
        });
        this.notifyMessage(log);
        return;
      }

      if (!contemMercadoLivre && !isComunicadoSemLink) {
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

      if (isComunicadoSemLink && !replicarComunicados) {
        console.log(`[Filtro Mercado Livre] Digitação avulsa ignorada (replicar_comunicados_texto desativado).`);
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
          motivo: 'comunicado_desativado'
        });
        this.notifyMessage(log);
        return;
      }
    }

    // Se for comunicado sem link, higieniza links de convite para grupos de WhatsApp de concorrentes
    if (isComunicadoSemLink) {
      novoTexto = novoTexto.replace(/https?:\/\/chat\.whatsapp\.com\/[^\s]+/gi, '').trim();
      if (!novoTexto && !messageHasImage) {
        return;
      }
    }

    // 5. Extração de dados da oferta (título, preço De/Por, cupom)
    const dadosOferta = extrairDadosOferta(novoTexto, resolvedProductUrl, origemNome);

    // 6. Guardião de Nicho TCG (Filtro Inteligente de Jogos de Cartas)
    const filtroApenasTcg = getConfig('filtro_apenas_tcg', 'true') === 'true';
    const slugParaFiltro = resolvedProductUrl ? resolvedProductUrl.split('/').pop() || '' : '';
    const eTCG = isProdutoTCG(rawText, dadosOferta.produto, slugParaFiltro);

    // Cupons e comunicados de grupos monitorados são permitidos
    const liberadoPeloGuardião = eTCG || isCupom || isComunicadoSemLink;

    if (filtroApenasTcg && !liberadoPeloGuardião) {
      console.log(`[Guardião Nicho TCG] Mensagem ignorada: produto "${dadosOferta.produto}" fora do nicho TCG/Card Games.`);
      const log = {
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: hashConteudo,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: Boolean(messageHasImage),
        links_convertidos: linksConvertidos,
        status: 'ignorado' as const,
        motivo: 'fora_nicho_tcg'
      };
      insertLog(log);
      this.notifyMessage(log);
      return;
    }

    // 7. Desduplicação Global Cross-Group por Produto Canônico (MLB ID ou Identificador de Cupom + 30 min Cooldown)
    const precoPorNum = parseFloat(
      (dadosOferta.valorPor || '').replace(/R\$/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')
    ) || 0;

    // Se for mensagem de cupom sem ID canônico de produto, gera identificador único de cupom para desduplicação cross-group
    if (!canonicalProductId && isCupom) {
      const textoSemLinks = rawText.replace(/https?:\/\/[^\s]+/gi, '').toLowerCase().replace(/\s+/g, '');
      const hashCupom = crypto.createHash('md5').update(textoSemLinks).digest('hex').slice(0, 10);
      canonicalProductId = `CUPOM_${cupomExtraido || hashCupom}`;
    }

    if (canonicalProductId) {
      const cooldownMinutos = parseInt(getConfig('cooldown_duplicidade_minutos', '30'), 10) || 30;
      const cooldownCheck = consultarCooldownProduto(canonicalProductId, precoPorNum, cooldownMinutos);

      if (cooldownCheck.emCooldown) {
        console.log(
          `[Cross-Group Cooldown] Produto ${canonicalProductId} já postado há ${cooldownCheck.tempoAtrasSegundos}s por "${cooldownCheck.postadoPor}". Descartando duplicação.`
        );
        const log = {
          origem_chat_id: remoteJid,
          origem_nome: origemNome,
          destino_chat_id: '',
          hash_conteudo: hashConteudo,
          texto_original: rawText,
          texto_publicado: '',
          tem_foto: Boolean(messageHasImage),
          links_convertidos: linksConvertidos,
          status: 'ignorado' as const,
          motivo: `duplicata_produto_cooldown_${cooldownCheck.postadoPor}`
        };
        insertLog(log);
        this.notifyMessage(log);
        return;
      }
    }

    // 8. Obtenção da imagem do produto:
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

    // 9. Determinar Texto Final para Envio (Modo Template de Marca vs Modo Fiel)
    const templateModo = getConfig('template_modo', 'padrao');
    let textoFinalPublicar = novoTexto;

    if (templateModo === 'padrao' && !isComunicadoSemLink) {
      // Verifica se a mensagem traz um produto específico (ID canônico MLB real, ou preço válido sem ser cupom)
      const hasCanonicalProduct = Boolean(
        canonicalProductId &&
        !canonicalProductId.startsWith('CUPOM_')
      );
      const hasPrecoValido = Boolean(
        (dadosOferta.valorPor && dadosOferta.valorPor !== 'Consultar' && dadosOferta.valorPor !== 'R$ 0') ||
        (dadosOferta.valorDe && dadosOferta.valorDe !== 'Consultar' && dadosOferta.valorDe !== 'R$ 0')
      );
      const isTituloProduto = Boolean(
        dadosOferta.produto &&
        dadosOferta.produto !== 'Colecionável Pokémon TCG' &&
        !dadosOferta.produto.toLowerCase().includes('cupom') &&
        !dadosOferta.produto.toLowerCase().includes('desconto')
      );

      const hasProdutoEspecifico = Boolean(
        hasCanonicalProduct ||
        (!isCupom && hasPrecoValido && isTituloProduto) ||
        (Boolean(messageHasImage) && !isCupom)
      );

      const tipoMensagem = determinarTipoMensagem({
        texto: rawText,
        hasProdutoEspecifico
      });

      const linkMatches = novoTexto.match(/https?:\/\/[^\s]+/gi);
      const linkAfiliadoFinal = linkMatches && linkMatches.length > 0 ? linkMatches[0] : (dadosOferta.link || linkVitrineCurto);
      const parcelamentoExtraido = extrairParcelamento(rawText);

      textoFinalPublicar = formatarMensagemReplicada({
        tipo: tipoMensagem,
        titulo: dadosOferta.produto || 'Colecionável Pokémon TCG',
        precoDe: dadosOferta.valorDe,
        precoPor: dadosOferta.valorPor,
        parcelamento: parcelamentoExtraido || undefined,
        cupom: cupomExtraido,
        detalhesCupom: tipoMensagem === 'cupom' ? 'Desconto especial no app para colecionáveis' : undefined,
        linkAfiliado: linkAfiliadoFinal,
        linkVitrineCurto,
        textoOriginalHigienizado: novoTexto
      });
    }

    // 10. Testar Deduplicação Prévia de Hash no Banco
    const destinoIds = rotasCorrespondentes.flatMap((r) => r.destinos).filter((d) => d && d !== remoteJid);
    const destinoChatId = destinoIds.join(', ');

    const rowExistingHash = db.prepare('SELECT id FROM logs WHERE hash_conteudo = ?').get(hashConteudo);
    if (rowExistingHash) {
      console.log(`Mensagem descartada por duplicidade de hash (${hashConteudo.slice(0, 10)})`);
      return;
    }

    // 11. Aplicar Delay configurado + Pacing de cadência anti-rajada
    const delaySegundos = parseInt(getConfig('delay_segundos', '5'), 10);
    if (delaySegundos > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySegundos * 1000));
    }

    const agoraPacing = Date.now();
    const minPacingMs = 8000; // Pacing mínimo de 8s entre envios para manter o grupo agradável
    const decorridoPacing = agoraPacing - this.lastDispatchTime;
    if (this.lastDispatchTime > 0 && decorridoPacing < minPacingMs) {
      await new Promise((resolve) => setTimeout(resolve, minPacingMs - decorridoPacing));
    }
    this.lastDispatchTime = Date.now();

    // 12. Enviar para todos os destinos configurados com isolamento de falhas
    let enviosSucesso = 0;
    let enviosFalha = 0;

    if (this.sock) {
      let safeImageBuffer: Buffer | null = imageBuffer;
      if (safeImageBuffer && safeImageBuffer.length > 8 * 1024 * 1024) {
        console.warn(`[Mídia Segura] Imagem excede 8MB (${Math.round(safeImageBuffer.length / 1024)} KB). Enviando apenas texto.`);
        safeImageBuffer = null;
      }

      for (const destino of destinoIds) {
        if (!destino || (!destino.endsWith('@g.us') && !destino.endsWith('@s.whatsapp.net'))) {
          console.warn(`[REPLICA SKIP] JID de destino inválido descartado: "${destino}"`);
          continue;
        }

        try {
          if (safeImageBuffer && safeImageBuffer.length > 0) {
            await this.sock.sendMessage(destino, {
              image: safeImageBuffer,
              caption: textoFinalPublicar
            });
          } else {
            await this.sock.sendMessage(destino, {
              text: textoFinalPublicar
            });
          }
          enviosSucesso++;
          console.log(`[REPLICA OK] Post enviado com sucesso para destino: ${destino} (com foto: ${Boolean(safeImageBuffer)})`);
        } catch (err: unknown) {
          enviosFalha++;
          const msgErro = err instanceof Error ? err.message : String(err);
          console.error(`[REPLICA ERRO] Falha ao enviar para destino ${destino}: ${msgErro}`);
        }
      }

      console.log(`[REPLICA RESULTADO] Broadcast finalizado: ${enviosSucesso} enviados com sucesso, ${enviosFalha} falhas.`);

      // 13. Registro Atômico do Produto e no Google Sheets (apenas se houve sucesso real)
      if (enviosSucesso > 0) {
        if (canonicalProductId) {
          registrarProdutoReplicado(canonicalProductId, remoteJid, origemNome, precoPorNum);
        }

        try {
          const dadosParaPlanilha = extrairDadosOferta(textoFinalPublicar, resolvedProductUrl, origemNome);
          registrarOfertaPlanilha(dadosParaPlanilha).catch((e: unknown) => {
            console.warn('[Google Sheets] Erro em background ao registrar oferta:', e);
          });
        } catch (errSheets: unknown) {
          console.warn('[Google Sheets] Falha ao extrair dados da oferta para a planilha:', errSheets);
        }
      }
    }

    // 14. Inserir Log Atômico com Status Real
    const statusFinal: 'enviado' | 'erro' = enviosSucesso > 0 ? 'enviado' : 'erro';
    const motivoFinal = enviosSucesso > 0
      ? (contemMercadoLivre ? 'copia_com_afiliado' : 'copia_sem_afiliado')
      : 'falha_envio_whatsapp';

    const log = insertLog({
      origem_chat_id: remoteJid,
      origem_nome: origemNome,
      destino_chat_id: destinoChatId,
      hash_conteudo: hashConteudo,
      texto_original: rawText,
      texto_publicado: textoFinalPublicar,
      tem_foto: Boolean(imageBuffer && imageBuffer.length > 0),
      links_convertidos: linksConvertidos,
      status: statusFinal,
      motivo: motivoFinal
    });

    if (log) {
      this.notifyMessage(log);
    }
  }
}

export const whatsAppManager = new WhatsAppManager();
