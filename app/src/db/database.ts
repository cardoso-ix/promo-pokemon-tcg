import Database from 'better-sqlite3';
import { DB_PATH, CONFIG } from '../config.js';

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

    CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash_conteudo);
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs(criado_em);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
    CREATE INDEX IF NOT EXISTS idx_prod_rec ON produtos_replicados(produto_id, criado_em);
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

