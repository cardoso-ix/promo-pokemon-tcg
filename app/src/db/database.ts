import Database from 'better-sqlite3';
import { DB_PATH, CONFIG } from '../config.js';
import { getBrazilToday } from '../utils/date.js';

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
O nosso grupo oficial de ofertas de Pokémon TCG está oficialmente *ABERTO* para o dia de hoje!

Quero agradecer de coração a cada um de vocês por fazer parte da nossa comunidade. É muito gratificante ver a nossa família de colecionadores crescendo todos os dias! 🙏✨

🔎 Passo boa parte do meu dia garimpando pessoalmente lojas oficiais, distribuidores e estoques confiáveis para encontrar ofertas reais, cupons que funcionam de verdade e oportunidades selecionadas a dedo em boosters, boxes, latas, ETBs e produtos lacrados. Aqui dedico meu tempo para que você não pague preços abusivos e consiga colecionar gastando o justo.

👥 *Dica especial:* Se você tem amigos ou conhecidos que também amam Pokémon TCG e querem economizar com segurança, fique 100% à vontade para adicioná-los ou mandar o link do nosso grupo. Quanto mais gente junta, mais forte fica a nossa comunidade! 🚀

Tenham todos uma excelente {dia_semana} e um dia cheio de bons pulls! 🔥`
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

    CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash_conteudo);
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs(criado_em);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
    CREATE INDEX IF NOT EXISTS idx_prod_rec ON produtos_replicados(produto_id, criado_em);
    CREATE INDEX IF NOT EXISTS idx_meta_insights_date ON meta_ad_insights(date);
    CREATE INDEX IF NOT EXISTS idx_meli_orders_date ON meli_orders(date_created);
    CREATE INDEX IF NOT EXISTS idx_meli_orders_status ON meli_orders(status);
  `);

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
    msg_abertura_ultimo_envio: ''
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
}

// Helpers para ler e gravar configs
export function getConfig(chave: string, padrao: string = ''): string {
  const row = db.prepare('SELECT valor FROM configs WHERE chave = ?').get(chave) as { valor: string } | undefined;
  return row ? row.valor : padrao;
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
  links_convertidos: number;
  status: 'enviado' | 'ignorado' | 'descartado' | 'erro';
  motivo: string;
  criado_em: string;
}

export function insertLog(log: Omit<LogEntry, 'id' | 'criado_em' | 'tem_foto'> & { tem_foto: boolean }): boolean {
  try {
    db.prepare(`
      INSERT INTO logs (
        origem_chat_id, origem_nome, destino_chat_id, hash_conteudo,
        texto_original, texto_publicado, tem_foto, links_convertidos,
        status, motivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.origem_chat_id,
      log.origem_nome,
      log.destino_chat_id,
      log.hash_conteudo,
      log.texto_original,
      log.texto_publicado,
      log.tem_foto ? 1 : 0,
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
           texto_original, texto_publicado, tem_foto, links_convertidos,
           status, motivo, criado_em
    FROM logs
    ORDER BY id DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((r) => ({
    ...r,
    tem_foto: Boolean(r.tem_foto)
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
  leads: number;
}

export function getFluxoHorarioHoje(leadsPorHora: Record<string, number> = {}): FluxoHorarioItem[] {
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
      const leads = leadsPorHora[h] || 0;

      return {
        hora: label,
        ofertas,
        cliques,
        leads
      };
    });
  } catch (err: unknown) {
    console.warn('[Database] Erro ao calcular fluxo horário:', err);
    const fallbackFaixas = [
      '06h', '07h', '08h', '09h', '10h', '11h',
      '12h', '13h', '14h', '15h', '16h', '17h',
      '18h', '19h', '20h', '21h', '22h', '23h'
    ];
    return fallbackFaixas.map(h => ({ hora: h, ofertas: 0, cliques: 0, leads: 0 }));
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



