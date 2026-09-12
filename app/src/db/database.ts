import Database from 'better-sqlite3';
import { DB_PATH, CONFIG } from '../config.js';

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
      hash_conteudo TEXT UNIQUE,
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

    CREATE INDEX IF NOT EXISTS idx_logs_hash ON logs(hash_conteudo);
    CREATE INDEX IF NOT EXISTS idx_logs_criado ON logs(criado_em);
    CREATE INDEX IF NOT EXISTS idx_logs_status ON logs(status);
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
    somente_mercadolivre: 'true'
  };

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO configs (chave, valor) VALUES (?, ?)
  `);

  for (const [chave, valor] of Object.entries(defaultConfigs)) {
    insertConfig.run(chave, valor);
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
