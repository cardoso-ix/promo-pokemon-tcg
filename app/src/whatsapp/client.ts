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
  getCachedChats,
  getChatName,
  registrarProdutoReplicado,
  consultarCooldownProduto,
  inserirOfertaHistorico,
  registrarEventoComunidade,
  db
} from '../db/database.js';
import { processMessageText, downloadProductImage, isAmazonUrl, buildAmazonAffiliateUrl, encurtarLinkAmazon, isMagazineLuiza } from '../core/affiliate.js';
import { extrairDadosOferta, registrarOfertaPlanilha } from '../core/sheets.js';
import {
  isProdutoTCG,
  detectarGatilhoUrgencia,
  detectarMensagemCupom,
  formatarMensagemReplicada,
  extrairCupom,
  extrairParcelamento,
  extrairPrecoUnitario,
  determinarTipoMensagem,
  calcularDesconto,
  deveBuscarFotoExterna,
  obterFotoCupomBuffer
} from '../core/anuncio.js';
import { notificarDisparadorOferta } from '../core/internal-sync.js';
import { padronizarFotoEstudio } from '../core/image-studio.js';
import {
  processarLeadsGrupos,
  type ResultadoProcessamentoLeads,
  type GrupoComParticipantes
} from '../core/leads-exporter.js';

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

  public getSocket(): WASocket | null {
    return this.sock;
  }

  public isConnected(): boolean {
    return this.state.status === 'connected' && Boolean(this.sock);
  }

  public async enviarMensagemTexto(destino: string, texto: string): Promise<any> {
    if (!this.sock) {
      throw new Error('WhatsApp desconectado.');
    }
    return await this.sock.sendMessage(destino, { text: texto });
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

      this.sock.ev.on('group-participants.update', async (event: any) => {
        try {
          const { id, participants, action } = event;
          if (action === 'add' || action === 'remove') {
            const tipo = action === 'add' ? 'entrada' : 'saida';
            if (Array.isArray(participants)) {
              for (const p of participants) {
                const phone = typeof p === 'string' ? p.split('@')[0].split(':')[0] : '';
                registrarEventoComunidade(id, tipo, phone);
              }
            }
          }
        } catch (err) {
          console.error('[WA] Erro ao registrar evento de participantes de grupo:', err);
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

  /**
   * Obtém lista de grupos participantes com contagem de membros em tempo real.
   */
  public async obterGruposComDetalhes(): Promise<{
    id: string;
    nome: string;
    total_membros: number;
    is_announce?: boolean;
  }[]> {
    if (this.sock && this.state.status === 'connected') {
      try {
        const groups = await this.sock.groupFetchAllParticipating();
        const lista: { id: string; nome: string; total_membros: number; is_announce?: boolean }[] = [];
        for (const [id, meta] of Object.entries(groups)) {
          const nome = meta.subject || 'Grupo Sem Nome';
          const total = Array.isArray(meta.participants) ? meta.participants.length : 0;
          updateChatCache(id, nome, true);
          lista.push({
            id,
            nome,
            total_membros: total,
            is_announce: Boolean((meta as any).announce)
          });
        }
        return lista.sort((a, b) => b.total_membros - a.total_membros);
      } catch (e: any) {
        console.warn('[WhatsApp] Erro ao buscar grupos via Baileys:', e?.message || e);
      }
    }
    // Fallback gracioso para chats_cache no SQLite
    const cached = getCachedChats().filter((c: any) => c.is_group);
    return cached.map((c: any) => ({
      id: c.chat_id,
      nome: c.nome,
      total_membros: 0
    }));
  }

  /**
   * Extrai e deduplica contatos de grupos selecionados ou de todos os grupos do WhatsApp.
   */
  public async extrairLeadsGrupos(groupIds?: string[]): Promise<ResultadoProcessamentoLeads> {
    if (!this.sock || this.state.status !== 'connected') {
      throw new Error('WhatsApp não está conectado. Conecte pelo QR Code antes de exportar contatos.');
    }

    const groups = await this.sock.groupFetchAllParticipating();
    const gruposParaProcessar: GrupoComParticipantes[] = [];
    const targetSet = Array.isArray(groupIds) && groupIds.length > 0 ? new Set(groupIds) : null;

    for (const [id, meta] of Object.entries(groups)) {
      if (targetSet && !targetSet.has(id)) {
        continue;
      }
      gruposParaProcessar.push({
        id,
        name: meta.subject || 'Grupo Sem Nome',
        participants: (meta.participants || []).map(p => ({
          id: p.id,
          admin: p.admin as any,
          phoneNumber: (p as any).phoneNumber
        }))
      });
    }

    const botPhone = this.state.userPhone || (this.sock.user?.id ? this.sock.user.id.split('@')[0].split(':')[0] : null);
    return processarLeadsGrupos(gruposParaProcessar, botPhone);
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
    let finalBuffer = imageBuffer;
    if (finalBuffer && finalBuffer.length > 0) {
      const padronizarAtivo = getConfig('padronizar_fotos_respiro', 'true') === 'true';
      if (padronizarAtivo) {
        try {
          const paddingPercentual = parseInt(getConfig('padding_foto_percentual', '12'), 10) || 12;
          const corFundo = getConfig('fundo_foto_cor', '#FFFFFF');
          finalBuffer = await padronizarFotoEstudio(finalBuffer, {
            paddingPercentual,
            corFundo
          });
        } catch {}
      }
      await this.sock.sendMessage(toChatId, {
        image: finalBuffer,
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

    // REGRA DE OURO: Bloqueio Total e Irrestrito de Magazine Luiza (Links e Menções Textuais)
    if (isMagazineLuiza(rawText)) {
      console.log(`[Filtro Magazine Luiza] Mensagem sumariamente ignorada: contém link ou menção à Magazine Luiza.`);
      const log = insertLog({
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: '',
        hash_conteudo: `magalu_block_${Date.now()}_${Math.random()}`,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: Boolean(messageHasImage),
        links_convertidos: 0,
        status: 'ignorado',
        motivo: 'magazine_luiza_bloqueado'
      });
      if (log) {
        this.notifyMessage(log);
      }
      return;
    }

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

    // 4. Converter texto e links com suporte a meli.la, cookies e Amazon
    const mattWord = getConfig('affiliate_matt_word', 'caed1312314');
    const mattTool = getConfig('affiliate_matt_tool', '96097202');
    const meliCookie = getConfig('meli_cookie', '');
    const meliTag = getConfig('meli_tag', mattWord);
    const frasesRemover = getConfig('frases_remover', '');
    const linkVitrineCurto = getConfig('link_vitrine_curto', 'https://mercadolivre.com/sec/2rM6RPm');
    const amazonTag = getConfig('amazon_tag', 'tcgpokepromo-20');
    const replicarAmazon = getConfig('replicar_amazon', 'true') === 'true';

    let {
      novoTexto,
      linksConvertidos,
      hashConteudo,
      contemMercadoLivre,
      contemAmazon,
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
      linkPreviewTitle || '',
      amazonTag,
      replicarAmazon
    );

    // Identificação de conteúdo especial:
    // A) Cupom de Desconto (tela/print de cupom ou mensagem de código)
    const cupomExtraido = extrairCupom(rawText) || '';
    const isCupom = Boolean(cupomExtraido || detectarMensagemCupom(rawText) || /\bcupo(?:m|ns)\b/i.test(rawText));

    // B) Links de Marketplaces concorrentes (Se Amazon estiver ativa, ela é permitida e não entra como concorrente rejeitado)
    const contemMarketplaceConcorrente = replicarAmazon
      ? /(?:shopee\.com|shope\.ee|magazineluiza\.com|aliexpress\.com)/i.test(rawText)
      : /(?:amazon\.com|amzn\.to|shopee\.com|shope\.ee|magazineluiza\.com|aliexpress\.com)/i.test(rawText);

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

      const temLinkValido = contemMercadoLivre || (replicarAmazon && contemAmazon);
      if (!temLinkValido && !isComunicadoSemLink) {
        console.log(`[Filtro Marketplaces] Mensagem ignorada: não contém links válidos do Mercado Livre ou Amazon.`);
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

    const imageDownloadSuccess = Boolean(imageBuffer && imageBuffer.length > 0);

    const isMsgCupomGeral = Boolean(
      isCupom ||
      detectarMensagemCupom(rawText) ||
      /\bcupo(?:m|ns)\b/i.test(rawText)
    );

    // Identificação de produto específico (ID canônico MLB real, ou preço válido e título de produto)
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
      dadosOferta.produto !== 'Cupons de Desconto Mercado Livre' &&
      !dadosOferta.produto.toLowerCase().includes('cupom') &&
      !dadosOferta.produto.toLowerCase().includes('desconto')
    );

    const isCabecalhoCupom = /(?:novo|novos)\s+cupo(?:m|ns)|cupo(?:m|ns)\s+(?:no\s+app|de\s+desconto|do\s+mercado|mercado\s+livre|meracdo\s+livre)/i.test(rawText);

    // Se for mensagem geral de cupom com cabeçalho explícito, ou sem produto canônico individual (MLB) ou sem preço válido, é cupom puro
    const isPublicacaoCupomPuro = Boolean(
      isCabecalhoCupom ||
      (isMsgCupomGeral && (!hasCanonicalProduct || !isTituloProduto || !hasPrecoValido))
    );

    const hasProdutoEspecifico = Boolean(
      !isPublicacaoCupomPuro && (
        hasCanonicalProduct ||
        (!isMsgCupomGeral && (
          (hasPrecoValido && isTituloProduto) ||
          Boolean(messageHasImage) ||
          (contemMercadoLivre && hasPrecoValido)
        ))
      )
    );

    // Para comunicados de cupons puros, NUNCA busca foto externa de produtos do Mercado Livre
    const buscarFotoMl = !isPublicacaoCupomPuro && deveBuscarFotoExterna({
      messageHasImage: Boolean(messageHasImage),
      imageDownloadSuccess,
      isCupom: Boolean(isCupom),
      isComunicadoSemLink: Boolean(isComunicadoSemLink),
      hasProdutoEspecifico
    });

    // B) Se NÃO veio foto anexada no WhatsApp (ou falhou o download), mas temos anúncio do Mercado Livre ou Amazon:
    // Baixa a imagem oficial do anúncio em alta resolução (se permitido)
    if (buscarFotoMl && (!imageBuffer || imageBuffer.length === 0) && (contemMercadoLivre || contemAmazon || productImageUrl)) {
      if (productImageUrl || resolvedProductUrl) {
        try {
          imageBuffer = await downloadProductImage(
            resolvedProductUrl || '',
            meliCookie,
            productImageUrl || ''
          );
          if (imageBuffer && imageBuffer.length > 0) {
            console.log(`[Imagem Marketplace] Foto oficial do anúncio baixada com sucesso (${Math.round(imageBuffer.length / 1024)} KB).`);
          }
        } catch (err) {
          console.warn('[Imagem Marketplace] Falha ao obter foto do anúncio oficial:', err);
        }
      }
    }

    // C) Fallback de Imagem: Se não conseguimos a foto em alta resolução do ML, mas tínhamos a miniatura do link preview
    // Usa a miniatura do WhatsApp quando há produto específico ou para links que não são vitrines genéricas
    if (buscarFotoMl && (!imageBuffer || imageBuffer.length === 0) && linkPreviewThumbnail && linkPreviewThumbnail.length > 3000) {
      const isVitrineGenericaSocial = Boolean(resolvedProductUrl && resolvedProductUrl.includes('/social/'));
      if (!isVitrineGenericaSocial || hasProdutoEspecifico) {
        imageBuffer = linkPreviewThumbnail;
        console.log(`[Imagem Preview Fallback] Usando miniatura do link preview do WhatsApp (${Math.round(imageBuffer.length / 1024)} KB).`);
      }
    }

    // 9. Determinar Texto Final para Envio (Modo Template de Marca vs Modo Fiel)
    const templateModo = getConfig('template_modo', 'padrao');
    let textoFinalPublicar = novoTexto;

    if (isPublicacaoCupomPuro) {
      // REGRA DE OURO PARA COMUNICADOS DE CUPOM MERCADO LIVRE:
      // Replica fielmente a mesma mensagem original, mantendo regras, emojis e textos,
      // apenas substituindo o link do concorrente pelo link de afiliado oficial do usuário
      novoTexto = novoTexto.replace(/https?:\/\/[^\s]+/gi, linkVitrineCurto);
      textoFinalPublicar = novoTexto;
    } else if (templateModo === 'padrao' && !isComunicadoSemLink) {
      const tipoMensagem = determinarTipoMensagem({
        texto: rawText,
        hasProdutoEspecifico
      });

      const linkMatches = novoTexto.match(/https?:\/\/[^\s]+/gi);
      let linkAfiliadoFinal = linkMatches && linkMatches.length > 0 ? linkMatches[0] : (dadosOferta.link || linkVitrineCurto);

      if (hasProdutoEspecifico && (linkAfiliadoFinal === linkVitrineCurto || linkAfiliadoFinal.includes('/social/')) && dadosOferta.produto && dadosOferta.produto !== 'Colecionável Pokémon TCG' && dadosOferta.produto !== 'Cupons de Desconto Mercado Livre') {
        const termoBusca = dadosOferta.produto.replace(/[^\w\s\u00C0-\u00FF-]/gi, ' ').replace(/\s+/g, ' ').trim();
        const slugBusca = encodeURIComponent(termoBusca).replace(/%20/g, '-');
        linkAfiliadoFinal = `https://lista.mercadolivre.com.br/${slugBusca}_OrderId_PRICE_ASC?matt_word=${encodeURIComponent(mattWord)}&matt_tool=${encodeURIComponent(mattTool)}&forceInApp=true`;
      } else if (contemAmazon || isAmazonUrl(linkAfiliadoFinal)) {
        if (resolvedProductUrl) {
          linkAfiliadoFinal = resolvedProductUrl;
        } else {
          const aff = buildAmazonAffiliateUrl(linkAfiliadoFinal, amazonTag);
          linkAfiliadoFinal = await encurtarLinkAmazon(aff);
        }
      }
      const parcelamentoExtraido = extrairParcelamento(rawText);

      textoFinalPublicar = formatarMensagemReplicada({
        tipo: tipoMensagem,
        titulo: dadosOferta.produto || 'Colecionável Pokémon TCG',
        precoDe: dadosOferta.valorDe,
        precoPor: dadosOferta.valorPor,
        precoUnitario: dadosOferta.valorUnitario || extrairPrecoUnitario(rawText) || undefined,
        parcelamento: parcelamentoExtraido || undefined,
        cupom: cupomExtraido,
        detalhesCupom: undefined,
        linkAfiliado: linkAfiliadoFinal,
        linkVitrineCurto,
        textoOriginalHigienizado: novoTexto
      });
    }

    // 10. Testar Deduplicação Prévia de Hash no Banco dentro da janela de cooldown
    let destinoIds = rotasCorrespondentes.flatMap((r) => r.destinos).filter((d) => d && d !== remoteJid);

    // REGRA DE CURADORIA DE OFERTAS DA AMAZON:
    // Se a mensagem for oferta da Amazon, ela NUNCA deve ir automaticamente para grupos oficiais.
    // Ela é enviada EXCLUSIVAMENTE para o grupo TESTE para validação prévia humana.
    if (contemAmazon) {
      const rotaTeste = rotas.find((r) => r.nome.toLowerCase().includes('teste'));
      const destinosTeste = rotaTeste && rotaTeste.destinos && rotaTeste.destinos.length > 0
        ? rotaTeste.destinos
        : [getConfig('grupo_teste_id', '120363429483901666@g.us')];

      destinoIds = destinosTeste.filter((d) => d && d !== remoteJid);
      console.log(`[Curadoria Amazon] Oferta da Amazon redirecionada exclusivamente para o grupo de TESTE: ${destinoIds.join(', ')}`);
    }

    const destinoChatId = destinoIds.join(', ');

    const cooldownMinutos = parseInt(getConfig('cooldown_duplicidade_minutos', '30'), 10) || 30;
    const rowExistingHash = db.prepare(`
      SELECT id FROM logs
      WHERE hash_conteudo = ?
        AND status = 'enviado'
        AND criado_em >= datetime('now', '-' || ? || ' minutes')
    `).get(hashConteudo, cooldownMinutos);

    if (rowExistingHash) {
      console.log(`[Deduplicação de Hash] Mensagem já enviada nos últimos ${cooldownMinutos}min (${hashConteudo.slice(0, 10)}). Descartando.`);
      const log = insertLog({
        origem_chat_id: remoteJid,
        origem_nome: origemNome,
        destino_chat_id: destinoChatId,
        hash_conteudo: `hash_dup_${Date.now()}_${Math.random()}`,
        texto_original: rawText,
        texto_publicado: '',
        tem_foto: Boolean(messageHasImage),
        links_convertidos: linksConvertidos,
        status: 'ignorado',
        motivo: `duplicata_hash_${cooldownMinutos}min`
      });
      if (log) {
        this.notifyMessage(log);
      }
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

      let usouFotoOficialCupom = false;
      const isQualquerCupom = Boolean(isCupom || isPublicacaoCupomPuro || isMsgCupomGeral);

      if (isQualquerCupom) {
        if (!hasCanonicalProduct) {
          // Se a mensagem original já veio com imagem anexada do WhatsApp, PRESERVA A MESMA IMAGEM!
          if (safeImageBuffer && safeImageBuffer.length > 0) {
            console.log(`[Cupom WhatsApp] Replicando a mesma imagem recebida na mensagem original (${Math.round(safeImageBuffer.length / 1024)} KB).`);
          } else {
            // Se veio apenas texto sem imagem, anexa a foto oficial amarela de cupom como fallback
            const bufferOficialCupom = obterFotoCupomBuffer();
            if (bufferOficialCupom) {
              safeImageBuffer = bufferOficialCupom;
              usouFotoOficialCupom = true;
              console.log(`[Cupom WhatsApp] Anexando foto oficial amarela "NOVO CUPOM" (${Math.round(bufferOficialCupom.length / 1024)} KB).`);
            }
          }
        }
      }

      // REGRA DE OURO DE ESTÚDIO:
      // Se a padronização estiver ativa e houver foto de produto (não sendo banner de cupom ou comunicado puro),
      // padroniza no canvas 1:1 com respiro proporcional de estúdio
      const padronizarAtivo = getConfig('padronizar_fotos_respiro', 'true') === 'true';
      if (padronizarAtivo && safeImageBuffer && safeImageBuffer.length > 0 && !usouFotoOficialCupom && !isPublicacaoCupomPuro && !isQualquerCupom) {
        try {
          const paddingPercentual = parseInt(getConfig('padding_foto_percentual', '12'), 10) || 12;
          const corFundo = getConfig('fundo_foto_cor', '#FFFFFF');
          safeImageBuffer = await padronizarFotoEstudio(safeImageBuffer, {
            paddingPercentual,
            corFundo
          });
          console.log(`[Estúdio de Imagem] Foto padronizada com respiro de ${paddingPercentual}% em canvas 1:1.`);
        } catch (errEstudio) {
          console.warn('[Estúdio de Imagem] Falha ao aplicar enquadramento de estúdio, mantendo original:', errEstudio);
        }
      }

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
          const dadosParaPlanilha = extrairDadosOferta(textoFinalPublicar, resolvedProductUrl, origemNome, productImageUrl);
          registrarOfertaPlanilha(dadosParaPlanilha).catch((e: unknown) => {
            console.warn('[Google Sheets] Erro em background ao registrar oferta:', e);
          });
        } catch (errSheets: unknown) {
          console.warn('[Google Sheets] Falha ao extrair dados da oferta para a planilha:', errSheets);
        }

        // 13.1. Notificar Bot Disparador via rede interna Docker/Coolify
        try {
          const dadosParaSync = extrairDadosOferta(textoFinalPublicar, resolvedProductUrl, origemNome, productImageUrl);
          const precoDeNum = parseFloat(
            (dadosParaSync.valorDe || '').replace(/R\$/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')
          ) || undefined;
          const precoPorNumSync = parseFloat(
            (dadosParaSync.valorPor || '').replace(/R\$/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.')
          ) || undefined;

          const descCalculado = calcularDesconto(dadosParaSync.valorDe, dadosParaSync.valorPor);
          const parcelamentoExtraido = extrairParcelamento(textoFinalPublicar) || undefined;

          notificarDisparadorOferta({
            titulo: dadosParaSync.produto || dadosOferta.produto || 'Oferta Pokémon TCG',
            linkAfiliado: resolvedProductUrl || '',
            linkOriginal: '',
            precoDe: precoDeNum,
            precoPor: precoPorNumSync,
            desconto: descCalculado ? descCalculado.percentualOff : undefined,
            cupom: cupomExtraido || undefined,
            parcelamento: parcelamentoExtraido,
            imagemUrl: (!messageHasImage && isPublicacaoCupomPuro) ? undefined : (productImageUrl || undefined),
            mensagemFormatada: textoFinalPublicar,
            origem: `replicador:${origemNome}`
          }).catch(() => {});
        } catch {}
      }
    }

    // 14. Inserir Log Atômico com Status Real
    const statusFinal: 'enviado' | 'erro' = enviosSucesso > 0 ? 'enviado' : 'erro';
    const motivoFinal = enviosSucesso > 0
      ? (contemAmazon ? 'copia_amazon_grupo_teste' : contemMercadoLivre ? 'copia_com_afiliado' : 'copia_sem_afiliado')
      : 'falha_envio_whatsapp';

    const log = insertLog({
      origem_chat_id: remoteJid,
      origem_nome: origemNome,
      destino_chat_id: destinoChatId,
      hash_conteudo: hashConteudo,
      texto_original: rawText,
      texto_publicado: textoFinalPublicar,
      tem_foto: Boolean(imageBuffer && imageBuffer.length > 0),
      foto_url: productImageUrl || null,
      links_convertidos: linksConvertidos,
      status: statusFinal,
      motivo: motivoFinal
    });

    if (log) {
      this.notifyMessage(log);
    }

    // Ingestão Ativa no Histórico TCG: Toda oferta enviada com sucesso é salva e atualizada no histórico
    if (enviosSucesso > 0) {
      try {
        const dadosExt = extrairDadosOferta(textoFinalPublicar || rawText);
        if (dadosExt && dadosExt.produto && dadosExt.valorPor) {
          const precoNumerico = Number(
            String(dadosExt.valorPor).replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.')
          ) || 0;
          const precoDeNumerico = dadosExt.valorDe
            ? Number(String(dadosExt.valorDe).replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.'))
            : undefined;
          const precoUnitarioNumerico = dadosExt.valorUnitario
            ? Number(String(dadosExt.valorUnitario).replace(/[^\d,\.]/g, '').replace(/\./g, '').replace(',', '.'))
            : undefined;

          if (precoNumerico >= 12.0) {
            inserirOfertaHistorico({
              produto: dadosExt.produto,
              precoPor: precoNumerico,
              precoDe: precoDeNumerico,
              precoUnitario: precoUnitarioNumerico,
              link: dadosExt.link || resolvedProductUrl || undefined,
              imagemUrl: productImageUrl || undefined,
              grupo: destinoChatId || 'Grupo Pokémon TCG',
              origem: 'robo_envio'
            });
            console.log(`[Histórico TCG] Oferta registrada automaticamente: "${dadosExt.produto}" por R$ ${precoNumerico.toFixed(2)}`);
          }
        }
      } catch (eHist) {
        console.warn('[WhatsApp] Aviso ao registrar oferta no histórico TCG:', eHist);
      }
    }
  }
}

export const whatsAppManager = new WhatsAppManager();
