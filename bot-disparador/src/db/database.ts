import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.resolve('data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'disparador.db');
const db = new Database(DB_PATH);

// Ativar WAL mode para alta performance e concorrência
db.pragma('journal_mode = WAL');

// Inicializar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT UNIQUE NOT NULL,
    numero TEXT NOT NULL,
    nome TEXT,
    origem_grupo TEXT,
    grupo_nome TEXT,
    origem_tipo TEXT DEFAULT 'extracao',
    ativo INTEGER DEFAULT 1,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    total_membros INTEGER DEFAULT 0,
    foto_url TEXT,
    sincronizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campanhas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    mensagem_template TEXT NOT NULL,
    midia_tipo TEXT,
    midia_url TEXT,
    midia_path TEXT,
    status TEXT DEFAULT 'criada', -- criada, executando, pausada, concluida, cancelada
    total_destinatarios INTEGER DEFAULT 0,
    enviados INTEGER DEFAULT 0,
    falhas INTEGER DEFAULT 0,
    criado_em TEXT NOT NULL,
    iniciado_em TEXT,
    concluido_em TEXT
  );

  CREATE TABLE IF NOT EXISTS fila_envios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campanha_id INTEGER NOT NULL,
    destinatario_jid TEXT NOT NULL,
    destinatario_nome TEXT,
    mensagem_gerada TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- pendente, enviando, enviado, falha
    erro TEXT,
    enviado_em TEXT,
    criado_em TEXT NOT NULL,
    FOREIGN KEY(campanha_id) REFERENCES campanhas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS historico_ia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_jid TEXT NOT NULL,
    remetente TEXT NOT NULL, -- 'lead' ou 'bot'
    mensagem TEXT NOT NULL,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs_sistema (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nivel TEXT NOT NULL, -- 'info', 'warn', 'error', 'ia', 'disparo'
    categoria TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    criado_em TEXT NOT NULL
  );
`);

// Configurações padrão
const DEFAULTS: Record<string, string> = {
  porta: '3333',
  deepseek_api_key: '',
  deepseek_base_url: 'https://api.deepseek.com/v1',
  deepseek_model: 'deepseek-chat',
  deepseek_ativo: 'true',
  deepseek_prompt_sistema: `Você é o assistente oficial do Eduardo, especialista e apaixonado por colecionáveis de Pokémon TCG e promoções exclusivas.
Seu objetivo é responder aos clientes e membros no WhatsApp de forma amigável, educada, descontraída e com conhecimento sobre Pokémon TCG.
Regras de atendimento:
1. Use um tom caloroso, prestativo e natural (como uma pessoa de verdade conversando no WhatsApp).
2. Esclareça dúvidas sobre cartas, decks, fichários, pastas, blisters e coleções de Pokémon.
3. Se perguntarem sobre frete ou compras, explique que os envios são feitos com segurança e rapidez (muitos com frete Full no Mercado Livre).
4. Indique sempre que temos o nosso grupo VIP de ofertas e promoções com os melhores preços.
5. Nunca invente preços ou prazos que você não sabe; se não souber um detalhe exato, diga gentilmente que vai verificar com o Eduardo e retornar logo em seguida.
6. Mantenha as mensagens objetivas, evitando parágrafos gigantes para fluir bem no WhatsApp.`,
  deepseek_delay_min: '3',
  deepseek_delay_max: '6',
  disparo_delay_min: '30',
  disparo_delay_max: '65',
  disparo_pausa_a_cada: '20',
  disparo_pausa_tempo_minutos: '5',
  disparo_horario_inicio: '08:00',
  disparo_horario_fim: '21:30',
  disparo_limite_diario: '100'
};

const insertConfigStmt = db.prepare(`
  INSERT OR IGNORE INTO configuracoes (chave, valor, atualizado_em)
  VALUES (?, ?, datetime('now', 'localtime'))
`);

for (const [chave, valor] of Object.entries(DEFAULTS)) {
  insertConfigStmt.run(chave, valor);
}

// Funções de Acesso a Configurações
export function getConfig(chave: string, defaultValue = ''): string {
  const row = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(chave) as { valor: string } | undefined;
  return row ? row.valor : defaultValue;
}

export function setConfig(chave: string, valor: string): void {
  db.prepare(`
    INSERT INTO configuracoes (chave, valor, atualizado_em)
    VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = excluded.atualizado_em
  `).run(chave, valor);
}

export function getAllConfigs(): Record<string, string> {
  const rows = db.prepare('SELECT chave, valor FROM configuracoes').all() as { chave: string; valor: string }[];
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.chave] = r.valor;
  }
  return result;
}

// Funções de Contatos / Leads
export interface Contato {
  id?: number;
  jid: string;
  numero: string;
  nome?: string;
  origem_grupo?: string;
  grupo_nome?: string;
  origem_tipo?: string;
  ativo?: number;
  criado_em?: string;
  atualizado_em?: string;
}

export function upsertContato(contato: Contato): boolean {
  try {
    db.prepare(`
      INSERT INTO contatos (jid, numero, nome, origem_grupo, grupo_nome, origem_tipo, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
      ON CONFLICT(jid) DO UPDATE SET
        nome = COALESCE(excluded.nome, contatos.nome),
        origem_grupo = COALESCE(excluded.origem_grupo, contatos.origem_grupo),
        grupo_nome = COALESCE(excluded.grupo_nome, contatos.grupo_nome),
        atualizado_em = datetime('now', 'localtime')
    `).run(
      contato.jid,
      contato.numero,
      contato.nome || null,
      contato.origem_grupo || null,
      contato.grupo_nome || null,
      contato.origem_tipo || 'extracao'
    );
    return true;
  } catch (err) {
    return false;
  }
}

export function getContatos(limit = 500, offset = 0, busca = ''): { contatos: Contato[]; total: number } {
  let query = 'SELECT * FROM contatos WHERE ativo = 1';
  let countQuery = 'SELECT COUNT(*) as total FROM contatos WHERE ativo = 1';
  const params: any[] = [];

  if (busca) {
    query += ' AND (nome LIKE ? OR numero LIKE ? OR grupo_nome LIKE ?)';
    countQuery += ' AND (nome LIKE ? OR numero LIKE ? OR grupo_nome LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const countRow = db.prepare(countQuery).get(...params) as { total: number };
  const contatos = db.prepare(query).all(...params, limit, offset) as Contato[];

  return { contatos, total: countRow ? countRow.total : 0 };
}

export function deleteContato(id: number): void {
  db.prepare('DELETE FROM contatos WHERE id = ?').run(id);
}

export function clearContatos(): void {
  db.prepare('DELETE FROM contatos').run();
}

// Funções de Grupos
export interface Grupo {
  id?: number;
  jid: string;
  nome: string;
  total_membros?: number;
  foto_url?: string;
  sincronizado_em?: string;
}

export function upsertGrupo(grupo: Grupo): void {
  db.prepare(`
    INSERT INTO grupos (jid, nome, total_membros, foto_url, sincronizado_em)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(jid) DO UPDATE SET
      nome = excluded.nome,
      total_membros = excluded.total_membros,
      foto_url = excluded.foto_url,
      sincronizado_em = datetime('now', 'localtime')
  `).run(grupo.jid, grupo.nome, grupo.total_membros || 0, grupo.foto_url || null);
}

export function getAllGrupos(): Grupo[] {
  return db.prepare('SELECT * FROM grupos ORDER BY nome ASC').all() as Grupo[];
}

// Funções de Campanhas
export interface Campanha {
  id?: number;
  nome: string;
  mensagem_template: string;
  midia_tipo?: string;
  midia_url?: string;
  midia_path?: string;
  status?: string;
  total_destinatarios?: number;
  enviados?: number;
  falhas?: number;
  criado_em?: string;
  iniciado_em?: string;
  concluido_em?: string;
}

export function createCampanha(campanha: Campanha): number {
  const result = db.prepare(`
    INSERT INTO campanhas (nome, mensagem_template, midia_tipo, midia_url, midia_path, status, total_destinatarios, criado_em)
    VALUES (?, ?, ?, ?, ?, 'criada', ?, datetime('now', 'localtime'))
  `).run(
    campanha.nome,
    campanha.mensagem_template,
    campanha.midia_tipo || null,
    campanha.midia_url || null,
    campanha.midia_path || null,
    campanha.total_destinatarios || 0
  );
  return Number(result.lastInsertRowid);
}

export function getCampanhas(): Campanha[] {
  return db.prepare('SELECT * FROM campanhas ORDER BY id DESC').all() as Campanha[];
}

export function getCampanhaById(id: number): Campanha | undefined {
  return db.prepare('SELECT * FROM campanhas WHERE id = ?').get(id) as Campanha | undefined;
}

export function updateCampanhaStatus(id: number, status: string): void {
  db.prepare(`
    UPDATE campanhas SET
      status = ?,
      iniciado_em = CASE WHEN ? = 'executando' AND iniciado_em IS NULL THEN datetime('now', 'localtime') ELSE iniciado_em END,
      concluido_em = CASE WHEN ? IN ('concluida', 'cancelada') THEN datetime('now', 'localtime') ELSE concluido_em END
    WHERE id = ?
  `).run(status, status, status, id);
}

export function incrementCampanhaCounter(id: number, field: 'enviados' | 'falhas'): void {
  db.prepare(`UPDATE campanhas SET ${field} = ${field} + 1 WHERE id = ?`).run(id);
}

export function deleteCampanha(id: number): void {
  db.prepare('DELETE FROM fila_envios WHERE campanha_id = ?').run(id);
  db.prepare('DELETE FROM campanhas WHERE id = ?').run(id);
}

// Funções da Fila de Envios
export interface ItemFila {
  id?: number;
  campanha_id: number;
  destinatario_jid: string;
  destinatario_nome?: string;
  mensagem_gerada: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'falha';
  erro?: string;
  enviado_em?: string;
  criado_em?: string;
}

export function addItensFila(itens: ItemFila[]): void {
  const insertStmt = db.prepare(`
    INSERT INTO fila_envios (campanha_id, destinatario_jid, destinatario_nome, mensagem_gerada, status, criado_em)
    VALUES (?, ?, ?, ?, 'pendente', datetime('now', 'localtime'))
  `);

  const runMany = db.transaction((list: ItemFila[]) => {
    for (const item of list) {
      insertStmt.run(item.campanha_id, item.destinatario_jid, item.destinatario_nome || null, item.mensagem_gerada);
    }
  });

  runMany(itens);
}

export function getNextItemFila(campanhaId?: number): ItemFila | undefined {
  if (campanhaId) {
    return db.prepare(`
      SELECT * FROM fila_envios
      WHERE campanha_id = ? AND status = 'pendente'
      ORDER BY id ASC LIMIT 1
    `).get(campanhaId) as ItemFila | undefined;
  }

  return db.prepare(`
    SELECT f.* FROM fila_envios f
    INNER JOIN campanhas c ON c.id = f.campanha_id
    WHERE c.status = 'executando' AND f.status = 'pendente'
    ORDER BY f.id ASC LIMIT 1
  `).get() as ItemFila | undefined;
}

export function updateItemFilaStatus(id: number, status: 'enviando' | 'enviado' | 'falha', erro?: string): void {
  db.prepare(`
    UPDATE fila_envios SET
      status = ?,
      erro = ?,
      enviado_em = CASE WHEN ? = 'enviado' THEN datetime('now', 'localtime') ELSE enviado_em END
    WHERE id = ?
  `).run(status, erro || null, status, id);
}

export function getFilaCampanha(campanhaId: number, limit = 100): ItemFila[] {
  return db.prepare(`
    SELECT * FROM fila_envios WHERE campanha_id = ? ORDER BY id ASC LIMIT ?
  `).all(campanhaId, limit) as ItemFila[];
}

// Funções de Histórico de IA
export function addHistoricoIA(chatJid: string, remetente: 'lead' | 'bot', mensagem: string): void {
  db.prepare(`
    INSERT INTO historico_ia (chat_jid, remetente, mensagem, criado_em)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
  `).run(chatJid, remetente, mensagem);
}

export function getHistoricoIA(chatJid: string, limit = 10): { remetente: string; mensagem: string }[] {
  return db.prepare(`
    SELECT remetente, mensagem FROM historico_ia
    WHERE chat_jid = ?
    ORDER BY id DESC LIMIT ?
  `).all(chatJid, limit).reverse() as { remetente: string; mensagem: string }[];
}

// Funções de Logs do Sistema
export function logSistema(nivel: 'info' | 'warn' | 'error' | 'ia' | 'disparo', categoria: string, mensagem: string): void {
  db.prepare(`
    INSERT INTO logs_sistema (nivel, categoria, mensagem, criado_em)
    VALUES (?, ?, ?, datetime('now', 'localtime'))
  `).run(nivel, categoria, mensagem);
}

export function getLogsSistema(limit = 100): any[] {
  return db.prepare(`SELECT * FROM logs_sistema ORDER BY id DESC LIMIT ?`).all(limit);
}

// Métricas do Dashboard
export function getMetricasDashboard() {
  const totalContatos = (db.prepare('SELECT COUNT(*) as c FROM contatos WHERE ativo = 1').get() as any).c;
  const totalGrupos = (db.prepare('SELECT COUNT(*) as c FROM grupos').get() as any).c;
  const enviosHoje = (db.prepare(`
    SELECT COUNT(*) as c FROM fila_envios
    WHERE status = 'enviado' AND date(enviado_em) = date('now', 'localtime')
  `).get() as any).c;
  const falhasHoje = (db.prepare(`
    SELECT COUNT(*) as c FROM fila_envios
    WHERE status = 'falha' AND date(criado_em) = date('now', 'localtime')
  `).get() as any).c;
  const respostasIaHoje = (db.prepare(`
    SELECT COUNT(*) as c FROM historico_ia
    WHERE remetente = 'bot' AND date(criado_em) = date('now', 'localtime')
  `).get() as any).c;

  return {
    totalContatos,
    totalGrupos,
    enviosHoje,
    falhasHoje,
    respostasIaHoje
  };
}

export { db };
export default db;
