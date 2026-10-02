import Database from 'better-sqlite3';
import { DB_PATH, CONFIG } from '../config.js';
import { getBrazilToday } from '../utils/date.js';
import { sanearPrecoHistoricoTCG } from '../core/pricing.js';

export interface ModeloAbertura {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  texto: string;
}

export const PRESET_MSGS_ABERTURA: ModeloAbertura[] = [
  {
    id: 'comunidade_gratidao',
    nome: 'Modelo 1: Comunidade & Curadoria a Dedo',
    icone: '🌟',
    descricao: 'Tom pessoal e acolhedor, agradecendo a comunidade e destacando a dedicação diária de buscar ofertas reais a dedo.',
    texto: `@pokemon_tcg_promo

🌅 *BOM DIA, TREINADORES E COLECIONADORES!* ⚡
O nosso grupo oficial de ofertas de Pokémon TCG está oficialmente *ABERTO* nesta {dia_semana}!

Sejam muito bem-vindos todos os novos membros que entraram no grupo nas últimas horas! É muito gratificante ver a nossa família de colecionadores crescendo todos os dias! 🙏✨

🔎 Passo boa parte do meu dia garimpando pessoalmente lojas oficiais, distribuidores e estoques confiáveis no Mercado Livre e parceiros oficiais Copag. O meu objetivo aqui é simples: encontrar ofertas reais, cupons que funcionam de verdade no carrinho e produtos lacrados pelo preço justo de tabela, sem ágio abusivo de cambistas.

🔔 *Dica de ouro:* Mantenham as notificações do grupo ativadas! As melhores oportunidades (ETBs, caixas com desconto e cupons relâmpago) costumam esgotar em poucos minutos.

👥 *Convide seus amigos:* Fique 100% à vontade para mandar o link do grupo para amigos que também amam colecionar. Quanto mais forte o nosso grupo, mais força temos para garimpar as melhores promoções! 🚀

Tenham todos uma excelente {dia_semana} e um dia cheio de bons pulls e raridades! 🔥🃏`
  },
  {
    id: 'radar_drops',
    nome: 'Modelo 2: Garimpo Diário & Ofertas Reais',
    icone: '🎯',
    descricao: 'Foco na busca manual diária, tempo dedicado para filtrar os melhores preços e reposições de estoque.',
    texto: `@pokemon_tcg_promo

⚡ *BOM DIA, MESTRES POKÉMON!* 🎯
Grupo liberado e dia começando a todo vapor nesta {dia_semana}!

Hoje já comecei a varredura manual pelos estoques oficiais. Todo dia sento e dedico tempo para vasculhar os anúncios um por um, separando somente o que é produto original, de vendedor seguro e com preço justo de verdade.

🛒 *O que garimpo a dedo todos os dias para vocês:*
• Combos de boosters avulsos com o menor valor real por pacote
• Boxes temáticas, Bundles, Fichários e Latas com desconto verdadeiro
• Cupons de desconto relâmpago testados e funcionando no carrinho
• Reposições de estoques disputados sem ágio de revenda

🔔 *Dica de amigo:* Mantenha as notificações ativadas! As melhores oportunidades que encontro costumam esgotar bem rápido.

Bora caçar aquelas cartas secretas e completar as coleções! Ótimo dia a todos! 🌟`
  },
  {
    id: 'colecionador_raiz',
    nome: 'Modelo 3: Colecionador Raiz & Preço Justo',
    icone: '🃏',
    descricao: 'Compromisso pessoal contra ágio abusivo, cálculo manual de preço por booster e amor pelo hobby.',
    texto: `@pokemon_tcg_promo

☀️ *BOM DIA, FAMÍLIA POKÉMON TCG!* 🃏
Mais um dia começando e o nosso grupo está oficialmente *ABERTO* nesta {dia_semana}!

Colecionar é uma paixão compartilhada, e o meu maior compromisso aqui é cuidar do bolso de vocês. Eu mesmo confiro o histórico de preços e calculo o valor unitário por booster antes de postar qualquer link, para garantir que você esteja fazendo um bom negócio e não caindo em armadilhas de falsas promoções.

📦 Aqui não tem pegadinha nem preço inflacionado: só entra no grupo o que eu mesmo compraria para a minha própria coleção!

🚀 Se você valoriza esse trabalho diário de busca e curadoria feita de fã para fãs, convide aquele amigo que também rasga booster para se juntar a nós. Vamos juntos fortalecer o hobby no Brasil! 🇧🇷

Que o dia venha recheado de hits e raridades! Pra cima! 🔥✨`
  },
  {
    id: 'cupons_estrategia',
    nome: 'Modelo 4: Cupons & Achados Selecionados',
    icone: '🎟️',
    descricao: 'Dicas práticas de compra, acompanhamento manual de cupons e economia real.',
    texto: `@pokemon_tcg_promo

🎟️ *BOM DIA, COLECIONADORES E CAÇADORES DE OFERTAS!* ⚡
Grupo 100% aberto e pronto para as melhores oportunidades desta {dia_semana}!

Hoje o foco do meu garimpo está nos novos cupons liberados no app, compras com frete grátis e combos que realmente compensam o parcelamento sem juros. Testo os cupons manualmente antes de mandar aqui para você não perder tempo.

💡 *Dicas para aproveitar melhor o dia:*
1. Quando eu postar um cupom, resgate imediatamente no seu aplicativo
2. Confira sempre o valor final com as vantagens aplicadas no carrinho
3. Fique atento aos avisos de "Últimas Unidades" para não ficar sem

Obrigado a cada um de vocês pela confiança no meu trabalho e pela parceria diária. Vamos juntos em busca dos melhores achados! 🏆🎯`
  }
];

export const DEFAULT_MSG_ABERTURA = PRESET_MSGS_ABERTURA[0].texto;

export const db = new Database(DB_PATH);

// Ativar modo WAL para melhor concorrência e velocidade
db.pragma('journal_mode = WAL');

// Inicializar esquema de tabelas
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS configs (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rotas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      ativa INTEGER NOT NULL DEFAULT 1,
      criada_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rota_origens (
      rota_id INTEGER NOT NULL,
      chat_id TEXT NOT NULL,
      PRIMARY KEY (rota_id, chat_id),
      FOREIGN KEY (rota_id) REFERENCES rotas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rota_destinos (
      rota_id INTEGER NOT NULL,
      chat_id TEXT NOT NULL,
      PRIMARY KEY (rota_id, chat_id),
      FOREIGN KEY (rota_id) REFERENCES rotas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem_chat_id TEXT,
      origem_nome TEXT,
      destino_chat_id TEXT,
      hash_conteudo TEXT,
      texto_original TEXT,
      texto_publicado TEXT,
      tem_foto INTEGER DEFAULT 0,
      foto_url TEXT,
      links_convertidos INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      motivo TEXT,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chats_cache (
      chat_id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      is_group INTEGER DEFAULT 1,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos_replicados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id TEXT NOT NULL,
      origem_chat_id TEXT NOT NULL,
      origem_nome TEXT,
      preco_por REAL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta_ad_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      campaign_name TEXT NOT NULL,
      spend REAL NOT NULL DEFAULT 0.0,
      impressions INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0.0,
      cpc REAL NOT NULL DEFAULT 0.0,
      purchases INTEGER NOT NULL DEFAULT 0,
      purchase_value REAL NOT NULL DEFAULT 0.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, campaign_id)
    );

    CREATE TABLE IF NOT EXISTS meli_orders (
      order_id TEXT PRIMARY KEY,
      date_created TEXT NOT NULL,
      date_closed TEXT,
      total_amount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      marketplace_fee REAL NOT NULL DEFAULT 0.0,
      shipping_cost REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL,
      buyer_id TEXT,
      buyer_nickname TEXT,
      currency_id TEXT DEFAULT 'BRL',
      raw_data TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS historico_produtos_valores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto TEXT NOT NULL,
      produto_limpo TEXT NOT NULL,
      chave_canonica TEXT,
      preco_por REAL NOT NULL,
      preco_de REAL,
      preco_unitario REAL,
      link TEXT,
      imagem_url TEXT,
      grupo TEXT,
      origem TEXT DEFAULT 'auto',
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meta_ad_recargas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valor REAL NOT NULL,
      descricao TEXT,
      saldo_resultante REAL,
      data_recarga DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash_conteudo);
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs(criado_em);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
    CREATE INDEX IF NOT EXISTS idx_prod_rec ON produtos_replicados(produto_id, criado_em);
    CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_ad_insights(date);
    CREATE INDEX IF NOT EXISTS idx_meta_recargas_data ON meta_ad_recargas(data_recarga);
    CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders(date_created);
    CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders(status);
    CREATE INDEX IF NOT EXISTS idx_hist_prod_limpo ON historico_produtos_valores(produto_limpo);
    CREATE INDEX IF NOT EXISTS idx_hist_prod_data ON historico_produtos_valores(criado_em);
    CREATE INDEX IF NOT EXISTS idx_hist_prod_preco ON historico_produtos_valores(preco_por);

    CREATE TABLE IF NOT EXISTS radar_itens_ocultos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id TEXT,
      chave_canonica TEXT,
      produto TEXT NOT NULL,
      produto_limpo TEXT NOT NULL,
      motivo TEXT DEFAULT 'manual',
      ocultado_em DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_radar_ocultos_chave ON radar_itens_ocultos(chave_canonica);
    CREATE INDEX IF NOT EXISTS idx_radar_ocultos_prod ON radar_itens_ocultos(produto_limpo);
  `);

  // Migração suave para adicionar foto_url se a tabela já existia sem a coluna
  try {
    db.prepare('ALTER TABLE logs ADD COLUMN foto_url TEXT').run();
  } catch {}

  // Semear valores padrão se não existirem
  const defaultConfigs: Record<string, string> = {
    ativo: 'true',
    delay_segundos: String(CONFIG.defaultDelaySeconds),
    teto_hora: String(CONFIG.defaultHourlyCap),
    atraso_maximo_segundos: String(CONFIG.defaultMaxDelaySeconds),
    affiliate_matt_word: CONFIG.defaultMattWord,
    affiliate_matt_tool: CONFIG.defaultMattTool,
    meli_cookie: '',
    meli_tag: CONFIG.defaultMattWord,
    link_vitrine_curto: 'https://mercadolivre.com/sec/2rM6RPm',
    frases_remover: '@rasgabooster.tcg\n#rasgaboot\n@rasgabooster',
    somente_mercadolivre: 'true',
    replicar_comunicados_texto: 'false',
    template_modo: 'padrao',
    cooldown_duplicidade_minutos: '30',
    filtro_apenas_tcg: 'true',
    google_sheets_webhook_url: '',
    google_sheets_ativo: 'true',
    msg_abertura_ativa: 'true',
    msg_abertura_horario: '07:00',
    msg_abertura_texto: DEFAULT_MSG_ABERTURA,
    msg_abertura_ultimo_envio: '',
    meta_ad_balance_manual: '0.00',
    meta_ad_balance_mode: 'hybrid',
    meta_ad_alert_threshold: '50.00',
    meta_ad_balance_last_sync: '',
    meta_ad_balance_api_cached: '0.00'
  };

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configs (chave, valor) VALUES (?, ?)
  `);

  for (const [chave, valor] of Object.entries(defaultConfigs)) {
    insertConfig.run(chave, valor);
  }

  // Migrar padrão antigo de 5 minutos para 30 minutos caso o banco já exista com valor legado
  db.prepare("UPDATE configs SET valor = '30' WHERE chave = 'cooldown_duplicidade_minutos' AND valor = '5'").run();

  // Garantir que a réplica de mensagens avulsas (sem link/cupom) fique desativada
  // evitando que mensagens aleatórias cruzem entre múltiplos grupos monitorados
  db.prepare("UPDATE configs SET valor = 'false' WHERE chave = 'replicar_comunicados_texto' AND valor = 'true'").run();

  // Migração: Remover restrição UNIQUE legada de hash_conteudo na tabela logs para permitir histórico contínuo
  try {
    const autoIndex = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = 'logs' AND name LIKE 'sqlite_autoindex_logs_%'
    `).get();

    if (autoIndex) {
      db.transaction(() => {
        db.exec(`
          CREATE TABLE logs_temp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origem_chat_id TEXT,
            origem_nome TEXT,
            destino_chat_id TEXT,
            hash_conteudo TEXT,
            texto_original TEXT,
            texto_publicado TEXT,
            tem_foto INTEGER DEFAULT 0,
            links_convertidos INTEGER DEFAULT 0,
            status TEXT NOT NULL,
            motivo TEXT,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
          );
          INSERT INTO logs_temp (id, origem_chat_id, origem_nome, destino_chat_id, hash_conteudo, texto_original, texto_publicado, tem_foto, links_convertidos, status, motivo, criado_em)
          SELECT id, origem_chat_id, origem_nome, destino_chat_id, hash_conteudo, texto_original, texto_publicado, tem_foto, links_convertidos, status, motivo, criado_em FROM logs;
          DROP TABLE logs;
          ALTER TABLE logs_temp RENAME TO logs;
          CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash_conteudo);
          CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs(criado_em);
          CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
        `);
      })();
    }
  } catch (errMig: any) {
    console.warn('[Database Migration] Aviso ao verificar restrição UNIQUE de logs:', errMig?.message || errMig);
  }

  // Migração retroativa dos logs para a tabela de histórico de valores de produtos
  try {
    // Garantir que as colunas chave_canonica e imagem_url existem em bancos legados
    try {
      db.exec("ALTER TABLE historico_produtos_valores ADD COLUMN chave_canonica TEXT;");
    } catch {}
    try {
      db.exec("ALTER TABLE historico_produtos_valores ADD COLUMN imagem_url TEXT;");
    } catch {}
    try {
      db.exec("CREATE INDEX IF NOT EXISTS idx_hist_prod_canonico ON historico_produtos_valores(chave_canonica);");
    } catch {}

    purgarRegistrosCorrompidosHistorico();
    semearCatalogoCanonicoTCG();
    reprocessarChavesCanonicasHistorico();
    limparRegistrosPrecosInvalidos();
    
    // Purga automática inicial e agendamento a cada 24h para manter o SQLite leve (< 10 MB)
    purgarLogsAntigos(90);
    setInterval(() => {
      purgarLogsAntigos(90);
    }, 24 * 60 * 60 * 1000).unref();
  } catch (errHist: unknown) {
    console.warn('[Database Migration] Aviso ao calibrar histórico de produtos TCG:', errHist);
  }
}

// Helpers para ler e gravar configs
export function getConfig(chave: string, padrao: string = ''): string {
  const row = db.prepare('SELECT valor FROM configs WHERE chave = ?').get(chave) as { valor: string } | undefined;
  if (!row || row.valor === undefined || row.valor === null || row.valor === '') {
    return padrao;
  }
  return row.valor;
}

export function setConfig(chave: string, valor: string): void {
  db.prepare('INSERT OR REPLACE INTO configs (chave, valor) VALUES (?, ?)').run(chave, valor);
}

export function getAllConfigs(): Record<string, string> {
  const rows = db.prepare('SELECT chave, valor FROM configs').all() as { chave: string; valor: string }[];
  const res: Record<string, string> = {};
  for (const r of rows) {
    res[r.chave] = r.valor;
  }
  return res;
}

// Helpers para rotas
export interface Rota {
  id: number;
  nome: string;
  ativa: boolean;
  origens: string[];
  destinos: string[];
  criada_em: string;
}

export function getAllRotas(): Rota[] {
  const rotasRows = db.prepare('SELECT id, nome, ativa, criada_em FROM rotas ORDER BY id DESC').all() as {
    id: number;
    nome: string;
    ativa: number;
    criada_em: string;
  }[];

  const origensStmt = db.prepare('SELECT chat_id FROM rota_origens WHERE rota_id = ?');
  const destinosStmt = db.prepare('SELECT chat_id FROM rota_destinos WHERE rota_id = ?');

  return rotasRows.map((r) => ({
    id: r.id,
    nome: r.nome,
    ativa: Boolean(r.ativa),
    origens: (origensStmt.all(r.id) as { chat_id: string }[]).map((o) => o.chat_id),
    destinos: (destinosStmt.all(r.id) as { chat_id: string }[]).map((d) => d.chat_id),
    criada_em: r.criada_em
  }));
}

export function saveRota(rota: { id?: number; nome: string; ativa: boolean; origens: string[]; destinos: string[] }): number {
  const tx = db.transaction(() => {
    let rotaId = rota.id;
    if (rotaId) {
      db.prepare('UPDATE rotas SET nome = ?, ativa = ? WHERE id = ?').run(rota.nome, rota.ativa ? 1 : 0, rotaId);
      db.prepare('DELETE FROM rota_origens WHERE rota_id = ?').run(rotaId);
      db.prepare('DELETE FROM rota_destinos WHERE rota_id = ?').run(rotaId);
    } else {
      const info = db.prepare('INSERT INTO rotas (nome, ativa) VALUES (?, ?)').run(rota.nome, rota.ativa ? 1 : 0);
      rotaId = Number(info.lastInsertRowid);
    }

    const insertOrigem = db.prepare('INSERT OR IGNORE INTO rota_origens (rota_id, chat_id) VALUES (?, ?)');
    for (const o of rota.origens) {
      if (o.trim()) insertOrigem.run(rotaId, o.trim());
    }

    const insertDestino = db.prepare('INSERT OR IGNORE INTO rota_destinos (rota_id, chat_id) VALUES (?, ?)');
    for (const d of rota.destinos) {
      if (d.trim()) insertDestino.run(rotaId, d.trim());
    }

    return rotaId;
  });

  return tx();
}

export function toggleRota(id: number, ativa: boolean): void {
  db.prepare('UPDATE rotas SET ativa = ? WHERE id = ?').run(ativa ? 1 : 0, id);
}

export function deleteRota(id: number): void {
  db.prepare('DELETE FROM rotas WHERE id = ?').run(id);
}

// Helpers para Logs
export interface LogEntry {
  id: number;
  origem_chat_id: string;
  origem_nome: string;
  destino_chat_id: string;
  hash_conteudo: string;
  texto_original: string;
  texto_publicado: string;
  tem_foto: boolean;
  foto_url?: string | null;
  links_convertidos: number;
  status: 'enviado' | 'ignorado' | 'descartado' | 'erro';
  motivo: string;
  criado_em: string;
}

export function insertLog(log: Omit<LogEntry, 'id' | 'criado_em' | 'tem_foto'> & { tem_foto: boolean; foto_url?: string | null }): boolean {
  try {
    db.prepare(`
      INSERT INTO logs (
        origem_chat_id, origem_nome, destino_chat_id, hash_conteudo,
        texto_original, texto_publicado, tem_foto, foto_url, links_convertidos,
        status, motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.origem_chat_id,
      log.origem_nome,
      log.destino_chat_id,
      log.hash_conteudo,
      log.texto_original,
      log.texto_publicado,
      log.tem_foto ? 1 : 0,
      log.foto_url || null,
      log.links_convertidos,
      log.status,
      log.motivo
    );
    return true;
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return false; // Duplicado!
    }
    throw err;
  }
}

export function getRecentLogs(limit = 50): LogEntry[] {
  const rows = db.prepare(`
    SELECT id, origem_chat_id, origem_nome, destino_chat_id, hash_conteudo,
           texto_original, texto_publicado, tem_foto, foto_url, links_convertidos,
           status, motivo, criado_em
    FROM logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => ({
    ...r,
    tem_foto: Boolean(r.tem_foto),
    foto_url: r.foto_url || null
  }));
}

export function getPostsLastHour(): number {
  const row = db.prepare(`
    SELECT COUNT(*) as total
    FROM logs
    WHERE status = 'enviado'
      AND criado_em > datetime('now', '-1 hour')
  `).get() as { total: number };
  return row ? row.total : 0;
}

export function getTotalEnviadosHoje(): number {
  try {
    const row = db.prepare(`
      SELECT COUNT(*) as total
      FROM logs
      WHERE status = 'enviado'
        AND date(datetime(criado_em, '-3 hours')) = date('now', '-3 hours')
    `).get() as { total: number } | undefined;
    return Number(row?.total) || 0;
  } catch {
    return 0;
  }
}

// Helpers para Cache de Nomes de Grupos
export function updateChatCache(chatId: string, nome: string, isGroup = true): void {
  db.prepare(`
    INSERT INTO chats_cache (chat_id, nome, is_group, atualizado_em)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(chat_id) DO UPDATE SET
      nome = excluded.nome,
      is_group = excluded.is_group,
      atualizado_em = datetime('now')
  `).run(chatId, nome, isGroup ? 1 : 0);
}

export function getCachedChats(): { chat_id: string; nome: string; is_group: boolean }[] {
  const rows = db.prepare('SELECT chat_id, nome, is_group FROM chats_cache ORDER BY nome ASC').all() as any[];
  return rows.map((r) => ({
    chat_id: r.chat_id,
    nome: r.nome,
    is_group: Boolean(r.is_group)
  }));
}

export function getChatName(chatId: string): string {
  const row = db.prepare('SELECT nome FROM chats_cache WHERE chat_id = ?').get(chatId) as { nome: string } | undefined;
  return row ? row.nome : chatId;
}

// Helpers para Controle de Produtos Replicados & Cooldown Cross-Group
export interface CooldownCheckResult {
  emCooldown: boolean;
  motivo?: string;
  postadoPor?: string;
  tempoAtrasSegundos?: number;
  precoAnterior?: number;
}

export function registrarProdutoReplicado(
  produtoId: string,
  origemChatId: string,
  origemNome: string,
  precoPor: number = 0
): void {
  if (!produtoId) return;
  db.prepare(`
    INSERT INTO produtos_replicados (produto_id, origem_chat_id, origem_nome, preco_por, criado_em)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(produtoId, origemChatId, origemNome, precoPor);
}

export function consultarCooldownProduto(
  produtoId: string,
  precoPorAtual: number = 0,
  cooldownMinutos: number = 30
): CooldownCheckResult {
  if (!produtoId) return { emCooldown: false };

  const row = db.prepare(`
    SELECT produto_id, origem_chat_id, origem_nome, preco_por, criado_em,
           CAST((strftime('%s', 'now') - strftime('%s', criado_em)) AS INTEGER) as segundos_atras
    FROM produtos_replicados
    WHERE produto_id = ?
      AND criado_em >= datetime('now', '-' || ? || ' minutes')
    ORDER BY id DESC
    LIMIT 1
  `).get(produtoId, cooldownMinutos) as any;

  if (!row) {
    return { emCooldown: false };
  }

  // Se o preço atual for significativamente menor (> 5% de desconto em relação ao preço anterior)
  // Exceção de Queda de Preço: permite republicar!
  if (row.preco_por > 0 && precoPorAtual > 0 && precoPorAtual < row.preco_por * 0.95) {
    return {
      emCooldown: false,
      motivo: 'queda_de_preco',
      postadoPor: row.origem_nome,
      tempoAtrasSegundos: row.segundos_atras,
      precoAnterior: row.preco_por
    };
  }

  return {
    emCooldown: true,
    motivo: 'em_cooldown',
    postadoPor: row.origem_nome,
    tempoAtrasSegundos: row.segundos_atras,
    precoAnterior: row.preco_por
  };
}

export interface FluxoHorarioItem {
  hora: string;
  ofertas: number;
  cliques: number;
  leads?: number;
}

export function getFluxoHorarioHoje(): FluxoHorarioItem[] {
  try {
    const rows = db.prepare(`
      SELECT 
        strftime('%H', datetime(criado_em, '-3 hours')) as hora_br,
        SUM(CASE WHEN status = 'enviado' THEN 1 ELSE 0 END) as enviadas,
        SUM(CASE WHEN status = 'enviado' THEN COALESCE(NULLIF(links_convertidos, 0), 1) * 3 ELSE 0 END) as cliques_estimados
      FROM logs
      WHERE date(datetime(criado_em, '-3 hours')) = date('now', '-3 hours')
      GROUP BY hora_br
    `).all() as { hora_br: string; enviadas: number; cliques_estimados: number }[];

    const mapaEnvios: Record<string, { ofertas: number; cliques: number }> = {};
    for (const r of rows) {
      if (r && r.hora_br) {
        mapaEnvios[r.hora_br] = {
          ofertas: Number(r.enviadas) || 0,
          cliques: Number(r.cliques_estimados) || 0
        };
      }
    }

    // Faixas horárias de 1 em 1 hora (06h às 23h) para granularidade detalhada de métricas
    const faixas = [
      '06h', '07h', '08h', '09h', '10h', '11h',
      '12h', '13h', '14h', '15h', '16h', '17h',
      '18h', '19h', '20h', '21h', '22h', '23h'
    ];

    return faixas.map((label) => {
      const horaNum = parseInt(label.replace('h', ''), 10);
      const h = String(horaNum).padStart(2, '0');

      const ofertas = mapaEnvios[h]?.ofertas || 0;
      const cliques = mapaEnvios[h]?.cliques || 0;

      return {
        hora: label,
        ofertas,
        cliques
      };
    });
  } catch (err: unknown) {
    console.warn('[Database] Erro ao calcular fluxo horário:', err);
    const fallbackFaixas = [
      '06h', '07h', '08h', '09h', '10h', '11h',
      '12h', '13h', '14h', '15h', '16h', '17h',
      '18h', '19h', '20h', '21h', '22h', '23h'
    ];
    return fallbackFaixas.map(h => ({ hora: h, ofertas: 0, cliques: 0 }));
  }
}

export interface MetaInsightSqliteItem {
  date: string;
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  purchases: number;
  purchase_value: number;
}

export function saveMetaInsightSqlite(item: MetaInsightSqliteItem): void {
  try {
    db.prepare(`
      INSERT INTO meta_ad_insights (
        date, campaign_id, campaign_name, spend, impressions, clicks, ctr, cpc, purchases, purchase_value, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(date, campaign_id) DO UPDATE SET
        campaign_name = excluded.campaign_name,
        spend = excluded.spend,
        impressions = excluded.impressions,
        clicks = excluded.clicks,
        ctr = excluded.ctr,
        cpc = excluded.cpc,
        purchases = excluded.purchases,
        purchase_value = excluded.purchase_value,
        updated_at = datetime('now')
    `).run(
      item.date,
      item.campaign_id,
      item.campaign_name || 'Campanha Sem Nome',
      Number(item.spend) || 0,
      Number(item.impressions) || 0,
      Number(item.clicks) || 0,
      Number(item.ctr) || 0,
      Number(item.cpc) || 0,
      Number(item.purchases) || 0,
      Number(item.purchase_value) || 0
    );
  } catch (err: unknown) {
    console.warn('[Database] Erro ao salvar insight do Meta no SQLite:', err);
  }
}

export function getMetaInsightsStats(startDate?: string, endDate?: string) {
  try {
    let whereClause = '';
    const params: any[] = [];
    if (startDate && endDate) {
      whereClause = 'WHERE date >= ? AND date <= ?';
      params.push(startDate, endDate);
    } else if (startDate) {
      whereClause = 'WHERE date >= ?';
      params.push(startDate);
    }

    const totalsRow = db.prepare(`
      SELECT 
        COALESCE(SUM(spend), 0) as total_spend,
        COALESCE(SUM(impressions), 0) as total_impressions,
        COALESCE(SUM(clicks), 0) as total_clicks,
        COALESCE(SUM(purchases), 0) as total_purchases,
        COALESCE(SUM(purchase_value), 0) as total_purchase_value
      FROM meta_ad_insights
      ${whereClause}
    `).get(...params) as any;

    const todayStr = getBrazilToday();
    const todayRow = db.prepare(`
      SELECT COALESCE(SUM(spend), 0) as spend_today
      FROM meta_ad_insights
      WHERE date = ?
    `).get(todayStr) as any;

    const topCampaigns = db.prepare(`
      SELECT 
        campaign_id,
        campaign_name,
        SUM(spend) as spend,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(purchases) as purchases
      FROM meta_ad_insights
      ${whereClause}
      GROUP BY campaign_id, campaign_name
      ORDER BY spend DESC
      LIMIT 10
    `).all(...params) as any[];

    const dailyData = db.prepare(`
      SELECT 
        date,
        SUM(spend) as spend,
        SUM(impressions) as impressions,
        SUM(clicks) as clicks,
        SUM(purchases) as purchases
      FROM meta_ad_insights
      ${whereClause}
      GROUP BY date
      ORDER BY date ASC
    `).all(...params) as any[];

    const totalSpend = Number(totalsRow?.total_spend) || 0;
    const totalClicks = Number(totalsRow?.total_clicks) || 0;
    const totalImpressions = Number(totalsRow?.total_impressions) || 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      totalSpend,
      spendToday: Number(todayRow?.spend_today) || 0,
      totalImpressions,
      totalClicks,
      avgCpc: Number(avgCpc.toFixed(2)),
      avgCtr: Number(avgCtr.toFixed(2)),
      totalPurchases: Number(totalsRow?.total_purchases) || 0,
      totalPurchaseValue: Number(totalsRow?.total_purchase_value) || 0,
      topCampaigns: topCampaigns.map(c => ({
        ...c,
        spend: Number(c.spend) || 0,
        impressions: Number(c.impressions) || 0,
        clicks: Number(c.clicks) || 0,
        purchases: Number(c.purchases) || 0
      })),
      dailyData: dailyData.map(d => ({
        ...d,
        spend: Number(d.spend) || 0,
        impressions: Number(d.impressions) || 0,
        clicks: Number(d.clicks) || 0,
        purchases: Number(d.purchases) || 0
      }))
    };
  } catch (err: unknown) {
    console.warn('[Database] Erro ao obter estatísticas de Meta Ads:', err);
    return {
      totalSpend: 0,
      spendToday: 0,
      totalImpressions: 0,
      totalClicks: 0,
      avgCpc: 0,
      avgCtr: 0,
      totalPurchases: 0,
      totalPurchaseValue: 0,
      topCampaigns: [],
      dailyData: []
    };
  }
}

export interface MetaRecargaItem {
  id: number;
  valor: number;
  descricao: string;
  saldo_resultante: number;
  data_recarga: string;
}

export function salvarRecargaMeta(valor: number, descricao = 'Recarga de Saldo Meta Ads', saldoResultante = 0): number {
  try {
    const info = db.prepare(`
      INSERT INTO meta_ad_recargas (valor, descricao, saldo_resultante)
      VALUES (?, ?, ?)
    `).run(Number(valor) || 0, String(descricao || ''), Number(saldoResultante) || 0);
    return Number(info.lastInsertRowid);
  } catch (err) {
    console.warn('[Database] Erro ao salvar recarga do Meta Ads:', err);
    return 0;
  }
}

export function listarRecargasMeta(limit = 10): MetaRecargaItem[] {
  try {
    return db.prepare(`
      SELECT id, valor, descricao, saldo_resultante, data_recarga
      FROM meta_ad_recargas
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as MetaRecargaItem[];
  } catch {
    return [];
  }
}

export function getMetaTotalSpendDesde(dataIso?: string): number {
  try {
    if (!dataIso) return 0;
    const datePart = dataIso.slice(0, 10);
    const row = db.prepare(`
      SELECT COALESCE(SUM(spend), 0) as spend_desde
      FROM meta_ad_insights
      WHERE date >= ?
    `).get(datePart) as { spend_desde: number } | undefined;
    return Number(row?.spend_desde) || 0;
  } catch {
    return 0;
  }
}

export interface MeliOrderSqlitePayload {
  order_id: string;
  date_created: string;
  date_closed?: string | null;
  total_amount: number;
  paid_amount: number;
  marketplace_fee: number;
  shipping_cost: number;
  status: string;
  buyer_id?: string | null;
  buyer_nickname?: string | null;
  currency_id?: string;
  raw_data?: any;
}

export function saveMeliOrderSqlite(order: MeliOrderSqlitePayload): void {
  const rawDataStr = typeof order.raw_data === 'string' ? order.raw_data : JSON.stringify(order.raw_data || {});

  db.prepare(`
    INSERT INTO meli_orders (
      order_id,
      date_created,
      date_closed,
      total_amount,
      paid_amount,
      marketplace_fee,
      shipping_cost,
      status,
      buyer_id,
      buyer_nickname,
      currency_id,
      raw_data,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(order_id) DO UPDATE SET
      date_closed = excluded.date_closed,
      total_amount = excluded.total_amount,
      paid_amount = excluded.paid_amount,
      marketplace_fee = excluded.marketplace_fee,
      shipping_cost = excluded.shipping_cost,
      status = excluded.status,
      buyer_id = excluded.buyer_id,
      buyer_nickname = excluded.buyer_nickname,
      currency_id = excluded.currency_id,
      raw_data = excluded.raw_data,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    String(order.order_id),
    order.date_created,
    order.date_closed || null,
    Number(order.total_amount) || 0,
    Number(order.paid_amount) || 0,
    Number(order.marketplace_fee) || 0,
    Number(order.shipping_cost) || 0,
    String(order.status || 'confirmed'),
    order.buyer_id || null,
    order.buyer_nickname || null,
    order.currency_id || 'BRL',
    rawDataStr
  );
}

export function getMeliOrdersStats(startDate?: string, endDate?: string) {
  try {
    let whereClause = '';
    const params: any[] = [];

    if (startDate && endDate) {
      whereClause = 'WHERE date(date_created) >= date(?) AND date(date_created) <= date(?)';
      params.push(startDate, endDate);
    } else if (startDate) {
      whereClause = 'WHERE date(date_created) >= date(?)';
      params.push(startDate);
    }

    const todayStr = getBrazilToday();

    const totalsRow = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(paid_amount) as total_revenue,
        SUM(marketplace_fee) as total_fees,
        SUM(shipping_cost) as total_shipping
      FROM meli_orders
      ${whereClause ? whereClause + " AND status != 'cancelled'" : "WHERE status != 'cancelled'"}
    `).get(...params) as any;

    const todayRow = db.prepare(`
      SELECT 
        COUNT(*) as orders_today,
        SUM(paid_amount) as revenue_today,
        SUM(marketplace_fee) as fees_today
      FROM meli_orders
      WHERE date(date_created) = date(?) AND status != 'cancelled'
    `).get(todayStr) as any;

    const recentOrders = db.prepare(`
      SELECT 
        order_id,
        date_created,
        total_amount,
        paid_amount,
        marketplace_fee,
        shipping_cost,
        status,
        buyer_nickname
      FROM meli_orders
      ORDER BY date_created DESC
      LIMIT 10
    `).all() as any[];

    const dailyData = db.prepare(`
      SELECT 
        date(date_created) as date,
        COUNT(*) as orders,
        SUM(paid_amount) as revenue,
        SUM(marketplace_fee) as fees
      FROM meli_orders
      ${whereClause ? whereClause + " AND status != 'cancelled'" : "WHERE status != 'cancelled'"}
      GROUP BY date(date_created)
      ORDER BY date(date_created) ASC
    `).all(...params) as any[];

    const totalRevenue = Number(totalsRow?.total_revenue) || 0;
    const totalOrders = Number(totalsRow?.total_orders) || 0;
    const totalFees = Number(totalsRow?.total_fees) || 0;
    const totalShipping = Number(totalsRow?.total_shipping) || 0;
    const netProfit = totalRevenue - totalFees - totalShipping;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueToday: Number((Number(todayRow?.revenue_today) || 0).toFixed(2)),
      totalOrders,
      ordersToday: Number(todayRow?.orders_today) || 0,
      totalFees: Number(totalFees.toFixed(2)),
      totalShipping: Number(totalShipping.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      avgTicket: Number(avgTicket.toFixed(2)),
      recentOrders: recentOrders.map(o => ({
        order_id: String(o.order_id),
        date_created: String(o.date_created),
        total_amount: Number(o.total_amount) || 0,
        paid_amount: Number(o.paid_amount) || 0,
        marketplace_fee: Number(o.marketplace_fee) || 0,
        shipping_cost: Number(o.shipping_cost) || 0,
        status: String(o.status),
        buyer_nickname: o.buyer_nickname ? String(o.buyer_nickname) : 'Cliente ML'
      })),
      dailyData: dailyData.map(d => ({
        date: String(d.date),
        orders: Number(d.orders) || 0,
        revenue: Number(d.revenue) || 0,
        fees: Number(d.fees) || 0
      }))
    };
  } catch (err: unknown) {
    console.warn('[Database] Erro ao obter estatísticas do Mercado Livre:', err);
    return {
      totalRevenue: 0,
      revenueToday: 0,
      totalOrders: 0,
      totalFees: 0,
      totalShipping: 0,
      netProfit: 0,
      avgTicket: 0,
      recentOrders: [],
      dailyData: []
    };
  }
}

// ==========================================
// ==========================================
// MÓDULO: BASE DE PREÇOS TCG & CANONICALIZAÇÃO
// ==========================================

export interface IdentidadeCanonicaTCG {
  chaveCanonica: string;
  nomePadronizado: string;
  formatoId?: string;
  formatoNome?: string;
  colecaoId?: string;
  colecaoNome?: string;
}

export interface ProdutoValorConsolidado {
  produto: string;
  produto_limpo: string;
  chave_canonica?: string;
  formato_nome?: string;
  colecao_nome?: string;
  menor_preco: number;
  maior_preco: number;
  ultimo_preco: number;
  preco_medio: number;
  menor_preco_de?: number;
  maior_preco_de?: number;
  total_postagens: number;
  primeira_postagem: string;
  ultima_postagem: string;
  ultimo_link?: string;
  imagem_url?: string;
  grupo_recente?: string;
  variacao_perc: number;
}

export interface RegistroHistoricoProduto {
  id: number;
  produto: string;
  produto_limpo: string;
  chave_canonica?: string;
  preco_por: number;
  preco_de?: number;
  preco_unitario?: number;
  link?: string;
  imagem_url?: string;
  grupo?: string;
  origem?: string;
  criado_em: string;
}

export interface BenchmarkPrecoProduto {
  encontrado: boolean;
  termoBuscado?: string;
  chaveCanonica?: string;
  produto?: string;
  produto_limpo?: string;
  menorPreco?: number;
  maiorPreco?: number;
  ultimoPreco?: number;
  precoMedio?: number;
  totalPostagens?: number;
  ultimaPostagem?: string;
  ultimoLink?: string;
}

/**
 * Normaliza o nome do produto para agrupamento e indexação semântica
 */
export function normalizarNomeProduto(nome: string): string {
  if (!nome) return '';
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\*\_\~]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai a identidade canônica de um item TCG (Formato + Coleção)
 * Elimina duplicidades geradas por variações de títulos de vendedores
 */
export function extrairIdentidadeCanonicaTCG(nomeOriginal: string): IdentidadeCanonicaTCG {
  const limpo = normalizarNomeProduto(nomeOriginal);
  if (!limpo) {
    return {
      chaveCanonica: 'desconhecido',
      nomePadronizado: nomeOriginal || 'Item Desconhecido'
    };
  }

  // 1. Coleções / Expansões TCG
  const colecoes: { id: string; nome: string; regex: RegExp }[] = [
    { id: 'escuridao_absoluta', nome: 'Escuridão Absoluta', regex: /\b(?:escuridao\s*absoluta|darkness\s*ablaze|me\s*05|me05|me-05)\b/i },
    { id: 'evolucoes_prismaticas', nome: 'Evoluções Prismáticas', regex: /\b(?:evolucoes\s*prismaticas?|prismatic\s*evolutions?|sv\s*8\.5|sv8\.5|sv08\.5)\b/i },
    { id: 'faiscas_volumosas', nome: 'Faíscas Volumosas', regex: /\b(?:faiscas?\s*volumosas?|surging\s*sparks?|sv\s*8|sv8|sv08)\b/i },
    { id: 'coroa_estelar', nome: 'Coroa Estelar', regex: /\b(?:coroa\s*estelar|stellar\s*crown|sv\s*7|sv7|sv07)\b/i },
    { id: 'mascaras_do_crepusculo', nome: 'Máscaras do Crepúsculo', regex: /\b(?:mascaras?\s*do\s*crepusculo|twilight\s*masquerade|sv\s*6|sv6|sv06)\b/i },
    { id: 'forca_temporal', nome: 'Força Temporal', regex: /\b(?:forca\s*temporal|temporal\s*forces|sv\s*5|sv5|sv05)\b/i },
    { id: 'destinos_de_paldea', nome: 'Destinos de Paldea', regex: /\b(?:destinos?\s*de\s*paldea|paldean\s*fates|sv\s*4\.5|sv4\.5|sv04\.5)\b/i },
    { id: 'fenda_paradoxal', nome: 'Fenda Paradoxal', regex: /\b(?:fenda\s*paradoxal|paradox\s*rift|sv\s*4|sv4|sv04)\b/i },
    { id: '151', nome: '151', regex: /\b(?:pokemon\s*151|colecao\s*151|\b151\b|sv\s*3\.5|sv3\.5|sv03\.5)\b/i },
    { id: 'chamas_obsidianas', nome: 'Chamas Obsidianas', regex: /\b(?:chamas?\s*obsidianas?|obsidian\s*flames|sv\s*3|sv3|sv03)\b/i },
    { id: 'evolucoes_em_paldea', nome: 'Evoluções em Paldea', regex: /\b(?:evolucoes\s*em\s*paldea|paldea\s*evolved|sv\s*2|sv2|sv02)\b/i },
    { id: 'escarlate_e_violeta_base', nome: 'Escarlate e Violeta (Base)', regex: /\b(?:escarlate\s*e\s*violeta\s*base|escarlate\s*e\s*violeta|scarlet\s*(?:and|&)\s*violet|sv\s*1|sv1|sv01)\b/i },
    { id: 'cenit_dos_coroados', nome: 'Cênit dos Coroados', regex: /\b(?:cenit\s*dos\s*coroados|zenite\s*dos\s*coroados|crown\s*zenith|swsh\s*12\.5|swsh12\.5)\b/i },
    { id: 'tempestade_prateada', nome: 'Tempestade Prateada', regex: /\b(?:tempestade\s*prateada|silver\s*tempest|swsh\s*12|swsh12)\b/i },
    { id: 'origem_perdida', nome: 'Origem Perdida', regex: /\b(?:origem\s*perdida|lost\s*origin|swsh\s*11|swsh11)\b/i },
    { id: 'astros_reluzentes', nome: 'Astros Reluzentes', regex: /\b(?:astros?\s*reluzentes?|brilliant\s*stars|swsh\s*09|swsh9|swsh09)\b/i },
    { id: 'golpe_fusao', nome: 'Golpe Fusão', regex: /\b(?:golpe\s*fusao|fusion\s*strike|swsh\s*08|swsh8|swsh08)\b/i },
    { id: 'ceus_em_evolucao', nome: 'Céus em Evolução', regex: /\b(?:ceus?\s*em\s*evolucao|evolving\s*skies|swsh\s*07|swsh7|swsh07)\b/i },
    { id: 'reinado_arrepiante', nome: 'Reinado Arrepiante', regex: /\b(?:reinado\s*arrepiante|chilling\s*reign|swsh\s*06|swsh6|swsh06)\b/i },
    { id: 'estilos_de_batalha', nome: 'Estilos de Batalha', regex: /\b(?:estilos?\s*de\s*batalha|battle\s*styles|swsh\s*05|swsh5|swsh05)\b/i },
    { id: 'voltagem_vivida', nome: 'Voltagem Vívida', regex: /\b(?:voltagem\s*vivida|vivid\s*voltage|swsh\s*04|swsh4|swsh04)\b/i },
    { id: 'pokemon_go', nome: 'Pokémon GO', regex: /\bpokemon\s*go\b/i },
    { id: 'celebracoes_25', nome: 'Celebrações 25 Anos', regex: /\b(?:celebracoes|celebrations|25\s*anos)\b/i },
    { id: '30_anos', nome: '30 Anos', regex: /\b(?:30\s*anos|colecao\s*30\s*anos)\b/i }
  ];

  let colecaoEncontrada: { id: string; nome: string } | undefined;
  for (const c of colecoes) {
    if (c.regex.test(limpo)) {
      colecaoEncontrada = { id: c.id, nome: c.nome };
      break;
    }
  }

  // 2. Formatos TCG (ordenados por especificidade)
  const formatos: { id: string; nome: string; regex: RegExp }[] = [
    { id: 'blister_triplo', nome: 'Blister Triplo (3 Boosters)', regex: /\b(?:blister\s*triplo|triplo\s*blister|triple\s*blister|3\s*boosters?|3\s*pacotes?|pack\s*com\s*3|tripack|tri-pack)\b/i },
    { id: 'blister_quad', nome: 'Blister Quádruplo (Quadpack 4 Boosters)', regex: /\b(?:blister\s*quadruplo|quadruplo\s*blister|quadpack|quad-pack|quad\s*pack|4\s*boosters?|4\s*pacotes?|pack\s*com\s*4)\b/i },
    { id: 'booster_box', nome: 'Booster Box (Display 36)', regex: /\b(?:booster\s*box|box\s*booster|box\s*display|display\s*box|display\s*36|36\s*boosters?|36\s*pacotes?|caixa\s*display|\bdisplay\b)\b/i },
    { id: 'etb', nome: 'Elite Trainer Box (ETB)', regex: /\b(?:elite\s*trainer\s*box|\betb\b|caixa\s*(?:de\s*)?treinador\s*avancado|treinador\s*avancado)\b/i },
    { id: 'bundle_poster', nome: 'Coleção Pôster', regex: /\b(?:colecao\s*(?:com\s*)?poster|poster\s*collection)\b/i },
    { id: 'colecao_especial', nome: 'Coleção Especial / UPC', regex: /\b(?:colecao\s*(?:de\s*)?ilustracao\s*especial|ultra\s*premium\s*collection|colecao\s*ultra\s*premium|\bupc\b|colecao\s*especial|caixa\s*especial|caixa\s*premium|colecao\s*premium)\b/i },
    { id: 'blister_unitario', nome: 'Blister Unitário (1 Booster)', regex: /\b(?:blister\s*unitario|blister\s*individual|blister\s*simples|booster\s*avulso|booster\s*individual|pacotinho\s*booster|pacote\s*booster|1\s*booster)\b/i },
    { id: 'lata', nome: 'Lata Colecionável (Tin)', regex: /\b(?:mini\s*tin|\blata\b|\btin\b|latinha)\b/i },
    { id: 'fichario', nome: 'Fichário / Álbum Colecionador', regex: /\b(?:fichario|pasta\s*(?:de\s*)?cartas?|pasta\s*colecionador|\bbinder\b|album)\b/i },
    { id: 'deck', nome: 'Deck de Batalha (Baralho)', regex: /\b(?:battle\s*deck|deck\s*de\s*batalha|deluxe\s*battle\s*deck|baralho\s*(?:de\s*)?batalha|\bdeck\s*ex\b|\bdeck\b|\bbaralho\b)\b/i },
    { id: 'bundle', nome: 'Booster Bundle / Kit', regex: /\b(?:booster\s*bundle|\bbundle\b|\bcombo\b|\bkit\b)\b/i },
    { id: 'acessorio_sleeves', nome: 'Sleeves Protetores', regex: /\b(?:sleeves?|shields?|protetores?\s*de\s*cartas?)\b/i },
    { id: 'acessorio_toploader', nome: 'Toploaders Protetores', regex: /\b(?:toploaders?|top-loader|top\s*loader)\b/i }
  ];

  let formatoEncontrado: { id: string; nome: string } | undefined;
  for (const f of formatos) {
    if (f.regex.test(limpo)) {
      formatoEncontrado = { id: f.id, nome: f.nome };
      break;
    }
  }

  // 3. Montagem da Chave Canônica e Nome Padronizado
  if (colecaoEncontrada && formatoEncontrado) {
    return {
      chaveCanonica: `${formatoEncontrado.id}__${colecaoEncontrada.id}`,
      nomePadronizado: `Pokémon TCG: ${formatoEncontrado.nome} - ${colecaoEncontrada.nome}`,
      formatoId: formatoEncontrado.id,
      formatoNome: formatoEncontrado.nome,
      colecaoId: colecaoEncontrada.id,
      colecaoNome: colecaoEncontrada.nome
    };
  }

  if (colecaoEncontrada && !formatoEncontrado) {
    return {
      chaveCanonica: `tcg_colecao__${colecaoEncontrada.id}`,
      nomePadronizado: `Pokémon TCG: ${colecaoEncontrada.nome}`,
      colecaoId: colecaoEncontrada.id,
      colecaoNome: colecaoEncontrada.nome
    };
  }

  // Remover ruídos de marketing e títulos de anúncios
  const palavrasRuido = [
    'pokemon', 'tcg', 'copag', 'original', 'oficial', 'lacrado', 'lacrada', 'novo', 'nova',
    'pronta', 'entrega', 'envio', 'imediato', 'brasil', 'br', 'frete', 'gratis', 'promo',
    'promocao', 'oferta', 'barato', 'para', 'com', 'do', 'da', 'de', 'e'
  ];

  const termosSemRuido = limpo
    .split(' ')
    .filter(t => t.length >= 2 && !palavrasRuido.includes(t))
    .join('_');

  const slugFinal = termosSemRuido || limpo.replace(/\s+/g, '_');

  if (formatoEncontrado) {
    return {
      chaveCanonica: `${formatoEncontrado.id}__${slugFinal}`,
      nomePadronizado: `Pokémon TCG: ${formatoEncontrado.nome} (${slugFinal.replace(/_/g, ' ')})`,
      formatoId: formatoEncontrado.id,
      formatoNome: formatoEncontrado.nome
    };
  }

  return {
    chaveCanonica: `gen__${slugFinal}`,
    nomePadronizado: nomeOriginal.replace(/[\*_~]/g, '').trim()
  };
}

/**
 * Converte string ou número para valor float seguro
 */
function parseMoedaParaNumero(valor: string | number | undefined | null): number {
  if (valor === undefined || valor === null) return 0;
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  const limpo = String(valor)
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

/**
 * Insere ou atualiza um registro no histórico de valores de produtos Pokémon TCG
 */
export function inserirOfertaHistorico(item: {
  produto: string;
  precoPor: number | string;
  precoDe?: number | string;
  precoUnitario?: number | string;
  link?: string;
  imagemUrl?: string;
  grupo?: string;
  origem?: string;
  criadoEm?: string;
}): boolean {
  try {
    let nomeOriginal = (item.produto || '').replace(/[\*_~]/g, '').trim();
    if (!nomeOriginal || nomeOriginal.length < 3) return false;

    // Rejeitar frases de clickbait, conversas e comunicados
    const lowerNome = nomeOriginal.toLowerCase();
    if (
      lowerNome.startsWith('colecionadores de plantão') ||
      lowerNome.startsWith('olha só essa') ||
      lowerNome.startsWith('tá afim de') ||
      lowerNome.startsWith('cupom esgotado') ||
      lowerNome.includes('quem avisa') ||
      lowerNome.includes('achadinho')
    ) {
      return false;
    }

    const nomeLimpo = normalizarNomeProduto(nomeOriginal);
    if (!nomeLimpo || nomeLimpo.length < 3) return false;

    const precoPorBruto = parseMoedaParaNumero(item.precoPor);
    if (precoPorBruto < 6) return false;

    const precoDeBruto = item.precoDe ? parseMoedaParaNumero(item.precoDe) : undefined;
    const precoUnitario = item.precoUnitario ? parseMoedaParaNumero(item.precoUnitario) : undefined;

    // Sanidade Estrita TCG: Protege contra erros de parsing (ex: "8 boosters" virando R$ 8)
    const saneado = sanearPrecoHistoricoTCG(nomeOriginal, precoPorBruto, precoDeBruto);
    if (!saneado.valido) {
      return false;
    }
    const precoPor = saneado.precoPor;
    const precoDe = saneado.precoDe;

    const canonico = extrairIdentidadeCanonicaTCG(nomeOriginal);
    const chaveCanonica = canonico.chaveCanonica;

    // Verificar se já existe um registro para o mesmo produto cadastrado no mesmo dia
    const existenteHoje = db.prepare(`
      SELECT id, preco_por FROM historico_produtos_valores 
      WHERE (chave_canonica = ? OR produto_limpo = ?)
        AND date(criado_em) = date('now')
      ORDER BY id DESC LIMIT 1
    `).get(chaveCanonica, nomeLimpo) as { id: number; preco_por: number } | undefined;

    if (existenteHoje) {
      // Se já existe hoje, atualiza com a informação mais recente (ou menor preço verificado)
      db.prepare(`
        UPDATE historico_produtos_valores 
        SET preco_por = ?,
            preco_de = COALESCE(?, preco_de),
            preco_unitario = COALESCE(?, preco_unitario),
            link = COALESCE(?, link),
            imagem_url = COALESCE(?, imagem_url),
            origem = ?,
            criado_em = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        precoPor,
        precoDe || null,
        precoUnitario || null,
        item.link || null,
        item.imagemUrl || null,
        item.origem || 'radar_sync',
        existenteHoje.id
      );
      return true;
    }

    if (item.criadoEm) {
      db.prepare(`
        INSERT INTO historico_produtos_valores (
          produto, produto_limpo, chave_canonica, preco_por, preco_de, preco_unitario, link, imagem_url, grupo, origem, criado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nomeOriginal,
        nomeLimpo,
        chaveCanonica,
        precoPor,
        precoDe || null,
        precoUnitario || null,
        item.link || null,
        item.imagemUrl || null,
        item.grupo || 'Grupo Pokémon TCG',
        item.origem || 'radar_sync',
        item.criadoEm
      );
    } else {
      db.prepare(`
        INSERT INTO historico_produtos_valores (
          produto, produto_limpo, chave_canonica, preco_por, preco_de, preco_unitario, link, imagem_url, grupo, origem
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nomeOriginal,
        nomeLimpo,
        chaveCanonica,
        precoPor,
        precoDe || null,
        precoUnitario || null,
        item.link || null,
        item.imagemUrl || null,
        item.grupo || 'Grupo Pokémon TCG',
        item.origem || 'radar_sync'
      );
    }

    return true;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao inserir produto no histórico de valores:', err);
    return false;
  }
}

/**
 * Retorna os produtos consolidados com Menor Preço e Maior Preço histórico
 * Agrupa por Chave Canônica TCG para eliminar duplicidades
 */
export function getHistoricoProdutosConsolidado(busca?: string, limite = 100, offset = 0): {
  itens: ProdutoValorConsolidado[];
  total: number;
} {
  try {
    let whereClause = '';
    const params: (string | number)[] = [];

    if (busca && busca.trim()) {
      const termoNormalizado = normalizarNomeProduto(busca);
      const palavras = termoNormalizado
        .split(' ')
        .filter((w) => w.length >= 2 && !['de', 'do', 'da', 'dos', 'das', 'com', 'para', 'em', 'um', 'uma'].includes(w));

      if (palavras.length > 0) {
        // 1. Tentar primeiro com AND de todas as palavras
        const conditionsAnd = palavras.map(() => '(h.produto_limpo LIKE ? OR h.produto LIKE ? OR h.chave_canonica LIKE ?)');
        const paramsAnd: string[] = [];
        for (const p of palavras) {
          const pat = `%${p}%`;
          paramsAnd.push(pat, pat, pat);
        }

        const countAnd = db.prepare(`
          SELECT COUNT(DISTINCT COALESCE(h.chave_canonica, h.produto_limpo)) as total 
          FROM historico_produtos_valores h
          WHERE ${conditionsAnd.join(' AND ')}
        `).get(...paramsAnd) as { total?: number } | undefined;

        if (countAnd && countAnd.total && countAnd.total > 0) {
          whereClause = `WHERE ${conditionsAnd.join(' AND ')}`;
          params.push(...paramsAnd);
        } else {
          // 2. Fallback: Se AND não encontrar nada, usa OR com as palavras mais relevantes
          const conditionsOr = palavras.map(() => '(h.produto_limpo LIKE ? OR h.produto LIKE ? OR h.chave_canonica LIKE ?)');
          const paramsOr: string[] = [];
          for (const p of palavras) {
            const pat = `%${p}%`;
            paramsOr.push(pat, pat, pat);
          }
          whereClause = `WHERE ${conditionsOr.join(' OR ')}`;
          params.push(...paramsOr);
        }
      } else {
        whereClause = 'WHERE h.produto_limpo LIKE ? OR h.produto LIKE ?';
        params.push(`%${termoNormalizado}%`, `%${busca.trim()}%`);
      }
    }

    const filtroOcultos = "NOT EXISTS (SELECT 1 FROM radar_itens_ocultos o WHERE (o.chave_canonica = h.chave_canonica AND o.chave_canonica IS NOT NULL) OR o.produto_limpo = h.produto_limpo OR o.produto = h.produto)";
    const filtroSanidade = `(h.preco_por >= 6.00 AND NOT (h.preco_por < 35.00 AND (LOWER(h.produto) LIKE '%box%' OR LOWER(h.produto) LIKE '%display%' OR LOWER(h.produto) LIKE '%etb%' OR LOWER(h.produto) LIKE '%treinador%' OR LOWER(h.produto) LIKE '%360%'))) AND ${filtroOcultos}`;
    whereClause = whereClause ? `${whereClause} AND ${filtroSanidade}` : `WHERE ${filtroSanidade}`;

    const totalRow = db.prepare(`
      SELECT COUNT(DISTINCT COALESCE(h.chave_canonica, h.produto_limpo)) as total 
      FROM historico_produtos_valores h
      ${whereClause}
    `).get(...params) as { total?: number } | undefined;

    const total = totalRow?.total || 0;

    const rows = db.prepare(`
      SELECT 
        COALESCE(h.chave_canonica, h.produto_limpo) as chave_grupo,
        h.chave_canonica,
        h.produto_limpo,
        (SELECT h2.produto FROM historico_produtos_valores h2 WHERE COALESCE(h2.chave_canonica, h2.produto_limpo) = COALESCE(h.chave_canonica, h.produto_limpo) ORDER BY h2.criado_em DESC, h2.id DESC LIMIT 1) as produto_recente,
        MIN(h.preco_por) as menor_preco,
        MAX(h.preco_por) as maior_preco,
        ROUND(AVG(h.preco_por), 2) as preco_medio,
        MIN(h.preco_de) as menor_preco_de,
        MAX(h.preco_de) as maior_preco_de,
        COUNT(*) as total_postagens,
        MIN(h.criado_em) as primeira_postagem,
        MAX(h.criado_em) as ultima_postagem,
        (SELECT h3.preco_por FROM historico_produtos_valores h3 WHERE COALESCE(h3.chave_canonica, h3.produto_limpo) = COALESCE(h.chave_canonica, h.produto_limpo) ORDER BY h3.criado_em DESC, h3.id DESC LIMIT 1) as ultimo_preco,
        (SELECT h4.link FROM historico_produtos_valores h4 WHERE COALESCE(h4.chave_canonica, h4.produto_limpo) = COALESCE(h.chave_canonica, h.produto_limpo) ORDER BY h4.criado_em DESC, h4.id DESC LIMIT 1) as ultimo_link,
        (SELECT h5.imagem_url FROM historico_produtos_valores h5 WHERE COALESCE(h5.chave_canonica, h5.produto_limpo) = COALESCE(h.chave_canonica, h.produto_limpo) AND h5.imagem_url IS NOT NULL AND h5.imagem_url != '' ORDER BY h5.criado_em DESC, h5.id DESC LIMIT 1) as imagem_url,
        (SELECT h6.grupo FROM historico_produtos_valores h6 WHERE COALESCE(h6.chave_canonica, h6.produto_limpo) = COALESCE(h.chave_canonica, h.produto_limpo) ORDER BY h6.criado_em DESC, h6.id DESC LIMIT 1) as grupo_recente
      FROM historico_produtos_valores h
      ${whereClause}
      GROUP BY COALESCE(h.chave_canonica, h.produto_limpo)
      ORDER BY ultima_postagem DESC
      LIMIT ? OFFSET ?
    `).all(...params, limite, offset) as any[];

    const itens: ProdutoValorConsolidado[] = rows.map((r) => {
      const menor = Number(r.menor_preco) || 0;
      const maior = Number(r.maior_preco) || 0;
      const variacao = maior > 0 && maior !== menor
        ? Number((((maior - menor) / maior) * 100).toFixed(1))
        : 0;

      const canonico = extrairIdentidadeCanonicaTCG(r.produto_recente || r.produto_limpo);

      return {
        produto: canonico.nomePadronizado || String(r.produto_recente || r.produto_limpo),
        produto_limpo: String(r.produto_limpo),
        chave_canonica: String(r.chave_grupo || r.chave_canonica || r.produto_limpo),
        formato_nome: canonico.formatoNome,
        colecao_nome: canonico.colecaoNome,
        menor_preco: menor,
        maior_preco: maior,
        ultimo_preco: Number(r.ultimo_preco) || menor,
        preco_medio: Number(r.preco_medio) || menor,
        menor_preco_de: r.menor_preco_de ? Number(r.menor_preco_de) : undefined,
        maior_preco_de: r.maior_preco_de ? Number(r.maior_preco_de) : undefined,
        total_postagens: Number(r.total_postagens) || 1,
        primeira_postagem: String(r.primeira_postagem),
        ultima_postagem: String(r.ultima_postagem),
        ultimo_link: r.ultimo_link ? String(r.ultimo_link) : undefined,
        imagem_url: r.imagem_url ? String(r.imagem_url) : undefined,
        grupo_recente: r.grupo_recente ? String(r.grupo_recente) : undefined,
        variacao_perc: variacao
      };
    });

    return { itens, total };
  } catch (err: unknown) {
    console.warn('[Database] Erro ao buscar histórico consolidado:', err);
    return { itens: [], total: 0 };
  }
}

/**
 * Retorna o extrato detalhado de postagens de um produto específico (por chave canônica ou nome)
 */
export function getExtratoProdutoValores(produtoLimpoOuChave: string, limite = 100): RegistroHistoricoProduto[] {
  try {
    const termo = (produtoLimpoOuChave || '').trim();
    if (!termo) return [];

    const limpo = normalizarNomeProduto(termo);

    const rows = db.prepare(`
      SELECT id, produto, produto_limpo, chave_canonica, preco_por, preco_de, preco_unitario, link, grupo, origem, criado_em
      FROM historico_produtos_valores
      WHERE chave_canonica = ? 
         OR chave_canonica LIKE ? 
         OR produto_limpo = ? 
         OR produto_limpo LIKE ?
         OR produto LIKE ?
      ORDER BY criado_em DESC, id DESC
      LIMIT ?
    `).all(termo, `%${termo}%`, limpo, `%${limpo}%`, `%${termo}%`, limite) as any[];

    return rows.map((r) => ({
      id: Number(r.id),
      produto: String(r.produto),
      produto_limpo: String(r.produto_limpo),
      chave_canonica: r.chave_canonica ? String(r.chave_canonica) : undefined,
      preco_por: Number(r.preco_por),
      preco_de: r.preco_de ? Number(r.preco_de) : undefined,
      preco_unitario: r.preco_unitario ? Number(r.preco_unitario) : undefined,
      link: r.link ? String(r.link) : undefined,
      grupo: r.grupo ? String(r.grupo) : undefined,
      origem: r.origem ? String(r.origem) : undefined,
      criado_em: String(r.criado_em)
    }));
  } catch (err: unknown) {
    console.warn('[Database] Erro ao buscar extrato de produto:', err);
    return [];
  }
}

/**
 * Busca o benchmark de preços de um produto para balizar a criação de novos anúncios
 * Utiliza busca Canônica TCG inteligente em primeiro lugar
 */
export function buscarBenchmarkPreco(termoOuTitulo: string): BenchmarkPrecoProduto {
  try {
    const limpo = normalizarNomeProduto(termoOuTitulo);
    if (!limpo || limpo.length < 2) {
      return { encontrado: false };
    }

    const canonico = extrairIdentidadeCanonicaTCG(termoOuTitulo);

    // 1. Tentar correspondência direta por chave canônica
    let row: any = null;
    if (canonico && canonico.chaveCanonica && !canonico.chaveCanonica.startsWith('gen__')) {
      row = db.prepare(`
        SELECT 
          (SELECT h2.produto FROM historico_produtos_valores h2 WHERE h2.chave_canonica = h.chave_canonica ORDER BY h2.criado_em DESC LIMIT 1) as produto,
          h.produto_limpo,
          h.chave_canonica,
          MIN(h.preco_por) as menor_preco,
          MAX(h.preco_por) as maior_preco,
          ROUND(AVG(h.preco_por), 2) as preco_medio,
          COUNT(*) as total_postagens,
          MAX(h.criado_em) as ultima_postagem,
          (SELECT h3.preco_por FROM historico_produtos_valores h3 WHERE h3.chave_canonica = h.chave_canonica ORDER BY h3.criado_em DESC LIMIT 1) as ultimo_preco,
          (SELECT h4.link FROM historico_produtos_valores h4 WHERE h4.chave_canonica = h.chave_canonica ORDER BY h4.criado_em DESC LIMIT 1) as ultimo_link
        FROM historico_produtos_valores h
        WHERE h.chave_canonica = ?
        GROUP BY h.chave_canonica
      `).get(canonico.chaveCanonica) as any;
    }

    // 2. Se não encontrar canônico, tentar correspondência exata de produto_limpo
    if (!row) {
      row = db.prepare(`
        SELECT 
          (SELECT h2.produto FROM historico_produtos_valores h2 WHERE h2.produto_limpo = h.produto_limpo ORDER BY h2.criado_em DESC LIMIT 1) as produto,
          h.produto_limpo,
          h.chave_canonica,
          MIN(h.preco_por) as menor_preco,
          MAX(h.preco_por) as maior_preco,
          ROUND(AVG(h.preco_por), 2) as preco_medio,
          COUNT(*) as total_postagens,
          MAX(h.criado_em) as ultima_postagem,
          (SELECT h3.preco_por FROM historico_produtos_valores h3 WHERE h3.produto_limpo = h.produto_limpo ORDER BY h3.criado_em DESC LIMIT 1) as ultimo_preco,
          (SELECT h4.link FROM historico_produtos_valores h4 WHERE h4.produto_limpo = h.produto_limpo ORDER BY h4.criado_em DESC LIMIT 1) as ultimo_link
        FROM historico_produtos_valores h
        WHERE h.produto_limpo = ?
        GROUP BY h.produto_limpo
      `).get(limpo) as any;
    }

    // 3. Fallback: Tentar por palavras-chave principais
    if (!row) {
      const palavras = limpo
        .split(' ')
        .filter((p) => p.length >= 3 && !['pokemon', 'tcg', 'copag', 'original', 'lacrado', 'novo', 'para', 'com', 'kit', 'combo'].includes(p));

      if (palavras.length > 0) {
        const likes = palavras.map(() => 'h.produto_limpo LIKE ?').join(' AND ');
        const likeParams = palavras.map((p) => `%${p}%`);

        row = db.prepare(`
          SELECT 
            (SELECT h2.produto FROM historico_produtos_valores h2 WHERE h2.produto_limpo = h.produto_limpo ORDER BY h2.criado_em DESC LIMIT 1) as produto,
            h.produto_limpo,
            h.chave_canonica,
            MIN(h.preco_por) as menor_preco,
            MAX(h.preco_por) as maior_preco,
            ROUND(AVG(h.preco_por), 2) as preco_medio,
            COUNT(*) as total_postagens,
            MAX(h.criado_em) as ultima_postagem,
            (SELECT h3.preco_por FROM historico_produtos_valores h3 WHERE h3.produto_limpo = h.produto_limpo ORDER BY h3.criado_em DESC LIMIT 1) as ultimo_preco,
            (SELECT h4.link FROM historico_produtos_valores h4 WHERE h4.produto_limpo = h.produto_limpo ORDER BY h4.criado_em DESC LIMIT 1) as ultimo_link
          FROM historico_produtos_valores h
          WHERE ${likes}
          GROUP BY COALESCE(h.chave_canonica, h.produto_limpo)
          ORDER BY total_postagens DESC, ultima_postagem DESC
          LIMIT 1
        `).get(...likeParams) as any;
      }
    }

    if (!row || !row.menor_preco) {
      return { encontrado: false, termoBuscado: termoOuTitulo };
    }

    const nomeExibido = canonico?.nomePadronizado || String(row.produto || row.produto_limpo);

    return {
      encontrado: true,
      termoBuscado: termoOuTitulo,
      chaveCanonica: row.chave_canonica || canonico?.chaveCanonica,
      produto: nomeExibido,
      produto_limpo: String(row.produto_limpo),
      menorPreco: Number(row.menor_preco),
      maiorPreco: Number(row.maior_preco),
      ultimoPreco: Number(row.ultimo_preco) || Number(row.menor_preco),
      precoMedio: Number(row.preco_medio) || Number(row.menor_preco),
      totalPostagens: Number(row.total_postagens) || 1,
      ultimaPostagem: String(row.ultima_postagem),
      ultimoLink: row.ultimo_link ? String(row.ultimo_link) : undefined
    };
  } catch (err: unknown) {
    console.warn('[Database] Erro ao buscar benchmark de preço:', err);
    return { encontrado: false, termoBuscado: termoOuTitulo };
  }
}

/**
 * Reprocessa retroativamente todas as chaves canônicas dos registros existentes no histórico
 */
export function reprocessarChavesCanonicasHistorico(): number {
  try {
    const itens = db.prepare(`
      SELECT id, produto 
      FROM historico_produtos_valores 
      WHERE chave_canonica IS NULL OR chave_canonica = ''
    `).all() as { id: number; produto: string }[];

    if (!itens || itens.length === 0) {
      return 0;
    }

    const updateStmt = db.prepare(`
      UPDATE historico_produtos_valores 
      SET chave_canonica = ? 
      WHERE id = ?
    `);

    let atualizados = 0;
    db.transaction(() => {
      for (const item of itens) {
        const canonico = extrairIdentidadeCanonicaTCG(item.produto);
        if (canonico && canonico.chaveCanonica) {
          updateStmt.run(canonico.chaveCanonica, item.id);
          atualizados++;
        }
      }
    })();

    if (atualizados > 0) {
      console.log(`[Database] Canonicalização: ${atualizados} produtos TCG reprocessados com chave canônica.`);
    }
    return atualizados;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao reprocessar chaves canônicas:', err);
    return 0;
  }
}

/**
 * Migra retroativamente os produtos postados nos logs para a tabela de histórico de valores
 */
export function migrarLogsParaHistoricoProdutos(): number {
  try {
    const totalExistente = db.prepare('SELECT COUNT(*) as total FROM historico_produtos_valores').get() as { total?: number };
    const logsEnviados = db.prepare(`
      SELECT id, texto_publicado, texto_original, criado_em 
      FROM logs 
      WHERE status = 'enviado' AND (texto_publicado IS NOT NULL OR texto_original IS NOT NULL)
      ORDER BY criado_em ASC
    `).all() as any[];

    if (!logsEnviados || logsEnviados.length === 0) {
      return 0;
    }

    // Se já tiver quantidade igual ou superior e todos tiverem chave_canonica, reprocessa só chaves
    if (totalExistente && (totalExistente.total || 0) >= logsEnviados.length) {
      reprocessarChavesCanonicasHistorico();
      return 0;
    }

    let inseridos = 0;
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO historico_produtos_valores (
        produto, produto_limpo, chave_canonica, preco_por, preco_de, link, grupo, origem, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'migracao_logs', ?)
    `);

    db.transaction(() => {
      for (const log of logsEnviados) {
        const texto = log.texto_publicado || log.texto_original || '';
        if (!texto) continue;

        const linhas = texto.split('\n').map((l: string) => l.trim()).filter(Boolean);
        let produto = '';
        let precoPor = 0;
        let precoDe: number | undefined;
        let link = '';

        for (const linha of linhas) {
          const matchLink = linha.match(/(https?:\/\/[^\s]+)/i);
          if (matchLink && !link) {
            link = matchLink[1];
          }

          const matchPor = linha.match(/(?:👉🏼|👉|\*|)\s*(?:POR:?|APENAS:?|)\s*R?\$?\s*([\d\.,]+)/i);
          if (linha.toLowerCase().includes('por') || linha.toLowerCase().includes('apenas')) {
            if (matchPor && !precoPor) {
              precoPor = parseMoedaParaNumero(matchPor[1]);
            }
          }

          const matchDe = linha.match(/(?:❌|~|)\s*DE:?\s*R?\$?\s*([\d\.,]+)/i);
          if (matchDe && !precoDe) {
            precoDe = parseMoedaParaNumero(matchDe[1]);
          }

          if (!produto && !linha.startsWith('http') && !linha.startsWith('🔗') && !linha.startsWith('👉') && !linha.startsWith('❌') && !linha.startsWith('@') && !linha.toLowerCase().includes('cupom')) {
            const linhaLimpa = linha.replace(/[\*_~]/g, '').trim();
            if (linhaLimpa.length >= 5) {
              produto = linhaLimpa;
            }
          }
        }

        if (produto && precoPor > 0) {
          const produtoLimpo = normalizarNomeProduto(produto);
          if (produtoLimpo.length >= 3) {
            const canonico = extrairIdentidadeCanonicaTCG(produto);
            insertStmt.run(
              produto,
              produtoLimpo,
              canonico.chaveCanonica,
              precoPor,
              precoDe || null,
              link || null,
              'Grupo Pokémon TCG',
              log.criado_em
            );
            inseridos++;
          }
        }
      }
    })();

    if (inseridos > 0) {
      console.log(`[Database] Migração concluída: ${inseridos} produtos inseridos na base histórica de preços.`);
    }

    reprocessarChavesCanonicasHistorico();
    return inseridos;
  } catch (err: unknown) {
    console.warn('[Database] Erro na migração retroativa de logs:', err);
    return 0;
  }
}

/**
 * Remove registros corrompidos e falsos positivos de preços no histórico
 * (ex: Box com precoPor de R$ 8 capturado de "8 boosters", "30 anos" virando R$ 30, Display por R$ 36 de "36 boosters", etc.)
 */
export function limparRegistrosPrecosInvalidos(): number {
  try {
    // 1. Remove qualquer produto com preco_por < 12.00 (nenhum produto TCG oficial lacrado custa isso)
    const res1 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_por < 12.0
    `).run();

    // 2. Remove "30 anos por 30 reais" e similares (<= 45)
    const res2 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_por <= 45 
        AND (
          LOWER(produto) LIKE '%30%' 
          OR LOWER(produto) LIKE '%anos%'
          OR LOWER(produto) LIKE '%poster%'
          OR LOWER(produto) LIKE '%fichario%'
          OR LOWER(produto) LIKE '%fichário%'
          OR LOWER(produto) LIKE '%album%'
          OR LOWER(produto) LIKE '%álbum%'
        )
    `).run();

    // 3. Remove Boxes e coleções com preços truncados (< 55) como "8 boosters" virando R$ 8
    const res3 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_por < 55 
        AND (
          LOWER(produto) LIKE '%box%' 
          OR LOWER(produto) LIKE '%zeraora%' 
          OR LOWER(produto) LIKE '%lucario%' 
          OR LOWER(produto) LIKE '%zygarde%' 
          OR LOWER(produto) LIKE '%charizard%' 
          OR LOWER(produto) LIKE '%boosters%' 
          OR LOWER(produto) LIKE '%pacotes%'
        )
    `).run();

    // 4. Remove Display / Booster Box / 360 com preco_por < 140
    const res4 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_por < 140 
        AND (
          LOWER(produto) LIKE '%display%' 
          OR LOWER(produto) LIKE '%booster box%' 
          OR LOWER(produto) LIKE '%360%'
        )
    `).run();

    // 5. Remove ETB / Elite Trainer Box com preco_por < 160
    const res5 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_por < 160 
        AND (
          LOWER(produto) LIKE '%etb%' 
          OR LOWER(produto) LIKE '%elite trainer%' 
          OR LOWER(produto) LIKE '%treinador%'
        )
    `).run();

    // 6. Remove produtos onde o desconto é absurdo (> 80%) e preco_por < 50
    const res6 = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE preco_de IS NOT NULL 
        AND preco_de > 60 
        AND preco_por <= (preco_de * 0.20)
    `).run();

    // 7. Limpa também registros em logs para não serem remigrados futuramente
    try {
      db.prepare(`
        DELETE FROM logs 
        WHERE preco_por IS NOT NULL 
          AND (
            preco_por < 12.0
            OR (preco_por <= 45 AND (LOWER(produto) LIKE '%30 anos%' OR LOWER(produto) LIKE '%poster%'))
            OR (preco_por < 55 AND (LOWER(produto) LIKE '%box%' OR LOWER(produto) LIKE '%zeraora%'))
            OR (preco_por < 140 AND (LOWER(produto) LIKE '%display%' OR LOWER(produto) LIKE '%booster box%'))
            OR (preco_por < 160 AND (LOWER(produto) LIKE '%etb%' OR LOWER(produto) LIKE '%treinador%'))
          )
      `).run();
    } catch {}

    const totalLimpos = (res1.changes || 0) + (res2.changes || 0) + (res3.changes || 0) + 
                        (res4.changes || 0) + (res5.changes || 0) + (res6.changes || 0);
    if (totalLimpos > 0) {
      console.log(`[Database] Limpeza profunda de preços TCG: ${totalLimpos} registros corrompidos/falsos positivos removidos.`);
    }
    return totalLimpos;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao limpar registros de preços inválidos:', err);
    return 0;
  }
}

/**
 * Purga logs e registros antigos de duplicação com mais de X dias para manter o SQLite ultraleve
 */
export function purgarLogsAntigos(diasRetencao: number = 90): { logsDeletados: number; produtosDeletados: number } {
  try {
    const resLogs = db.prepare(`
      DELETE FROM logs 
      WHERE criado_em < datetime('now', '-' || ? || ' days')
    `).run(diasRetencao);

    const resProds = db.prepare(`
      DELETE FROM produtos_replicados 
      WHERE criado_em < datetime('now', '-' || ? || ' days')
    `).run(diasRetencao);

    const logsDeletados = resLogs.changes || 0;
    const produtosDeletados = resProds.changes || 0;

    if (logsDeletados > 0 || produtosDeletados > 0) {
      console.log(`[Database Purge] Limpeza automática: ${logsDeletados} logs e ${produtosDeletados} produtos replicados antigos (> ${diasRetencao} dias) purgados.`);
    }

    return { logsDeletados, produtosDeletados };
  } catch (err: unknown) {
    console.warn('[Database Purge] Erro ao purgar registros antigos:', err);
    return { logsDeletados: 0, produtosDeletados: 0 };
  }
}

/**
 * Remove registros legados corrompidos/duplicados da base histórica
 */
export function purgarRegistrosCorrompidosHistorico(): number {
  try {
    // 1. Remover registros oriundos da migração antiga de logs ou com títulos poluídos
    const resLogs = db.prepare(`
      DELETE FROM historico_produtos_valores 
      WHERE origem = 'migracao_logs' 
         OR LOWER(produto) LIKE '%colecionadores de plantão%'
         OR LOWER(produto) LIKE '%olha só essa%'
         OR LOWER(produto) LIKE '%cupom esgotado%'
         OR LOWER(produto) LIKE '%triplo de escuridão%'
    `).run();

    // 2. Limpar preços fora dos limites saudáveis de TCG
    limparRegistrosPrecosInvalidos();

    // 3. Garantir índice único por dia e produto para evitar duplicações
    try {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_hist_prod_canonico_data 
        ON historico_produtos_valores(COALESCE(chave_canonica, produto_limpo), preco_por, date(criado_em));
      `);
    } catch {}

    const totalDeletado = resLogs.changes || 0;
    if (totalDeletado > 0) {
      console.log(`[Database] Purga do histórico concluída: ${totalDeletado} registros defeituosos/duplicados removidos.`);
    }
    return totalDeletado;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao purgar registros corrompidos do histórico:', err);
    return 0;
  }
}

/**
 * Semeia o Catálogo Canônico com os produtos oficiais e referências de Pokémon TCG
 */
export function semearCatalogoCanonicoTCG(): number {
  try {
    const itensCanonicos = [
      {
        produto: 'Display Booster Box Pokémon TCG Escarlate e Violeta 360 (36 Pacotes) Copag',
        precoPor: 279.00,
        precoDe: 339.00,
        link: 'https://lista.mercadolivre.com.br/display-booster-box-pokemon-tcg-360-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_910543-MLB74070433788_012024-F.webp'
      },
      {
        produto: 'Elite Trainer Box (ETB) Pokémon TCG Destinos de Paldea Luxo Copag',
        precoPor: 349.90,
        precoDe: 399.90,
        link: 'https://lista.mercadolivre.com.br/elite-trainer-box-etb-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp'
      },
      {
        produto: 'Pokémon TCG Coleção Especial 30 Anos Poster Box Copag Original Lacrada',
        precoPor: 189.90,
        precoDe: 229.90,
        link: 'https://lista.mercadolivre.com.br/pokemon-tcg-colecao-especial-30-anos-poster-box_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp'
      },
      {
        produto: 'Fichário Álbum 30 Anos Pokémon TCG Oficial para 360 Cartas Copag',
        precoPor: 149.90,
        precoDe: 179.90,
        link: 'https://lista.mercadolivre.com.br/fichario-album-30-anos-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_759132-MLB78550124345_082024-F.webp'
      },
      {
        produto: 'Box Charizard ex Fogo Supremo Pokémon TCG com Carta Gigante Copag',
        precoPor: 169.90,
        precoDe: 219.90,
        link: 'https://lista.mercadolivre.com.br/box-charizard-ex-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp'
      },
      {
        produto: 'Box Pokémon TCG Zeraora ex Mega Forças Lacrada Original Copag (8 Boosters)',
        precoPor: 139.90,
        precoDe: 169.90,
        link: 'https://lista.mercadolivre.com.br/box-zeraora-ex-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_789422-MLB78317765977_082024-F.webp'
      },
      {
        produto: 'Box Especial Pokémon TCG Lucario VSTAR Copag Original Lacrada',
        precoPor: 129.90,
        precoDe: 159.90,
        link: 'https://lista.mercadolivre.com.br/box-lucario-vstar-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_892345-MLB72910482011_112023-F.webp'
      },
      {
        produto: 'Box Coleção Especial Pokémon TCG Zygarde ex Copag Original Lacrada',
        precoPor: 119.90,
        precoDe: 149.90,
        link: 'https://lista.mercadolivre.com.br/box-zygarde-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_616894-MLB74191636259_012024-F.webp'
      },
      {
        produto: 'Booster Bundle Megaevolução Pokémon TCG 6 Pacotes Lacrados',
        precoPor: 89.90,
        precoDe: 109.90,
        link: 'https://lista.mercadolivre.com.br/booster-bundle-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_819234-MLB75192840192_042024-F.webp'
      },
      {
        produto: 'Blister Quádruplo Pokémon TCG Fogo Fantasmagórico 4 Boosters Copag',
        precoPor: 49.90,
        precoDe: 59.90,
        link: 'https://lista.mercadolivre.com.br/blister-quadruplo-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_684123-MLB74891230192_032024-F.webp'
      },
      {
        produto: 'Blister Triplo Pokémon TCG com Adesivo e Carta Promo Especial Copag',
        precoPor: 39.90,
        precoDe: 47.90,
        link: 'https://lista.mercadolivre.com.br/blister-triplo-pokemon-tcg-copag_OrderId_PRICE_ASC',
        imagemUrl: 'https://http2.mlstatic.com/D_NQ_NP_2X_791245-MLB74012948210_012024-F.webp'
      }
    ];

    let inseridos = 0;
    for (const item of itensCanonicos) {
      const ok = inserirOfertaHistorico({
        produto: item.produto,
        precoPor: item.precoPor,
        precoDe: item.precoDe,
        link: item.link,
        imagemUrl: item.imagemUrl,
        grupo: 'Radar TCG Canônico',
        origem: 'radar_canonico'
      });
      if (ok) inseridos++;
    }

    if (inseridos > 0) {
      console.log(`[Database] Catálogo Canônico TCG semeado com ${inseridos} referências oficiais validadas.`);
    }
    return inseridos;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao semear catálogo canônico TCG:', err);
    return 0;
  }
}

export interface ItemOcultoRadarInfo {
  ids: Set<string>;
  chaves: Set<string>;
  produtosLimpos: Set<string>;
}

/**
 * Retorna os identificadores de produtos ocultados/deletados pelo operador
 */
export function getItensOcultosRadar(): ItemOcultoRadarInfo {
  try {
    const rows = db.prepare('SELECT item_id, chave_canonica, produto_limpo FROM radar_itens_ocultos').all() as {
      item_id?: string | null;
      chave_canonica?: string | null;
      produto_limpo: string;
    }[];

    const ids = new Set<string>();
    const chaves = new Set<string>();
    const produtosLimpos = new Set<string>();

    for (const r of rows) {
      if (r.item_id) ids.add(String(r.item_id).toLowerCase());
      if (r.chave_canonica) chaves.add(r.chave_canonica.toLowerCase());
      if (r.produto_limpo) produtosLimpos.add(r.produto_limpo.toLowerCase());
    }

    return { ids, chaves, produtosLimpos };
  } catch (err: unknown) {
    console.warn('[Database] Erro ao buscar itens ocultos do radar:', err);
    return { ids: new Set(), chaves: new Set(), produtosLimpos: new Set() };
  }
}

/**
 * Remove do histórico de preços e adiciona à lista de ocultos para não reaparecer
 */
export function ocultarOuDeletarItemRadar(params: {
  id?: string | number;
  chaveCanonica?: string;
  produto: string;
}): boolean {
  try {
    const nomeOriginal = String(params.produto || '').trim();
    const nomeLimpo = normalizarNomeProduto(nomeOriginal);
    const canonico = extrairIdentidadeCanonicaTCG(nomeOriginal);
    const chave = params.chaveCanonica || canonico.chaveCanonica;
    const itemId = params.id ? String(params.id) : null;

    db.transaction(() => {
      // 1. Remover do histórico de valores se existir
      if (itemId && /^\d+$/.test(itemId)) {
        db.prepare('DELETE FROM historico_produtos_valores WHERE id = ?').run(Number(itemId));
      }
      if (chave && !chave.startsWith('gen__')) {
        db.prepare('DELETE FROM historico_produtos_valores WHERE chave_canonica = ?').run(chave);
      }
      if (nomeLimpo) {
        db.prepare('DELETE FROM historico_produtos_valores WHERE produto_limpo = ?').run(nomeLimpo);
      }
      if (nomeOriginal) {
        db.prepare('DELETE FROM historico_produtos_valores WHERE produto = ?').run(nomeOriginal);
      }

      // 2. Inserir na lista de itens ocultos/bloqueados para não reaparecer em buscas futuras
      const existe = db.prepare(`
        SELECT id FROM radar_itens_ocultos 
        WHERE (chave_canonica = ? AND chave_canonica IS NOT NULL)
           OR produto_limpo = ?
           OR (item_id = ? AND item_id IS NOT NULL)
        LIMIT 1
      `).get(chave, nomeLimpo, itemId);

      if (!existe) {
        db.prepare(`
          INSERT INTO radar_itens_ocultos (item_id, chave_canonica, produto, produto_limpo)
          VALUES (?, ?, ?, ?)
        `).run(itemId, chave || null, nomeOriginal, nomeLimpo);
      }
    })();

    console.log(`[Database] Item do Radar ocultado/excluído com sucesso: "${nomeOriginal}" (${chave})`);
    return true;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao ocultar/deletar item do radar:', err);
    return false;
  }
}

/**
 * Restaura um item previamente ocultado
 */
export function restaurarItemOcultoRadar(chaveOuProduto: string): boolean {
  try {
    const limpo = normalizarNomeProduto(chaveOuProduto);
    const res = db.prepare(`
      DELETE FROM radar_itens_ocultos 
      WHERE chave_canonica = ? OR produto_limpo = ? OR produto = ? OR item_id = ?
    `).run(chaveOuProduto, limpo, chaveOuProduto, chaveOuProduto);
    return (res.changes || 0) > 0;
  } catch (err: unknown) {
    console.warn('[Database] Erro ao restaurar item oculto do radar:', err);
    return false;
  }
}






