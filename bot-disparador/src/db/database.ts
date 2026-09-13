import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data');
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
  deepseek_base_url: 'https://opencode.ai/zen/go/v1',
  deepseek_model: 'deepseek-flash',
  deepseek_ativo: 'true',
  deepseek_prompt_sistema: `Você é o assistente oficial do Eduardo, especialista e apaixonado por colecionáveis de Pokémon TCG e promoções exclusivas.
Seu objetivo é responder aos clientes e membros no WhatsApp de forma amigável, educada, descontraída e com conhecimento sobre Pokémon TCG.

Regras de atendimento:
1. Use um tom caloroso, prestativo e natural (como uma pessoa de verdade conversando no WhatsApp).
2. Esclareça dúvidas sobre cartas, decks, fichários, pastas, blisters e coleções de Pokémon TCG.
3. Se perguntarem sobre frete ou compras, explique que os envios são feitos com segurança e rapidez (a maioria com frete Full no Mercado Livre).
4. LINK DO GRUPO OFICIAL: Se a pessoa responder dizendo que quer entrar, aceitar o convite, responder "sim", "quero", "manda o link", "pode mandar", ou pedir o link do grupo, seja super caloroso, agradeça a resposta e envie OBRIGATORIAMENTE este link oficial do grupo da nossa comunidade no WhatsApp:
👉 https://chat.whatsapp.com/IFxkHX9ADT29EIUHRkCHVo
Explique que o grupo é feito de fã para fãs, sem spam, só com a galera reunida trocando dicas e pegando ofertas com preços justos de verdade.
5. Nunca invente preços ou prazos que você não sabe; se não souber um detalhe exato, diga gentilmente que vai verificar com o Eduardo e retornar logo em seguida.
6. Mantenha as mensagens objetivas, evitando parágrafos gigantes para fluir bem no WhatsApp.`,
  deepseek_delay_min: '3',
  deepseek_delay_max: '6',
  disparo_delay_min: '15',
  disparo_delay_max: '45',
  disparo_pausa_a_cada: '50',
  disparo_pausa_minutos_min: '30',
  disparo_pausa_minutos_max: '60',
  disparo_pausa_tempo_minutos: '30',
  disparo_simular_digitacao: 'true',
  disparo_digitacao_min: '3',
  disparo_digitacao_max: '10',
  disparo_presenca_tipo: 'auto',
  aquecimento_ativo: 'true',
  aquecimento_inicio_diario: '20',
  aquecimento_incremento_diario: '5',
  aquecimento_limite_maximo: '100',
  aquecimento_data_inicio: new Date().toISOString().split('T')[0],
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

// Garantir atualização automática do prompt do sistema com o link oficial do grupo se ainda não configurado
const currentPrompt = getConfig('deepseek_prompt_sistema', '');
if (!currentPrompt.includes('IFxkHX9ADT29EIUHRkCHVo')) {
  setConfig('deepseek_prompt_sistema', DEFAULTS['deepseek_prompt_sistema']);
}

// Migrar automaticamente URL e modelo legados para OpenCode Zen Go e deepseek-flash
const currentUrl = getConfig('deepseek_base_url', '');
if (!currentUrl || currentUrl === 'https://api.deepseek.com/v1' || currentUrl.includes('api.deepseek.com')) {
  setConfig('deepseek_base_url', 'https://opencode.ai/zen/go/v1');
}
const currentModel = getConfig('deepseek_model', '');
if (!currentModel || currentModel === 'deepseek-chat') {
  setConfig('deepseek_model', 'deepseek-flash');
}

// Sanitização e limpeza automática de registros com @lid (números ocultos de comunidades)
try {
  db.exec(`
    DELETE FROM contatos WHERE jid LIKE '%@lid' OR numero LIKE '%@lid';
    UPDATE fila_envios 
    SET status = 'falha', erro = 'Número oculto de comunidade (@lid) não suporta envio direto' 
    WHERE destinatario_jid LIKE '%@lid' AND status IN ('pendente', 'enviando', 'enviado');

    UPDATE campanhas SET 
      enviados = (SELECT COUNT(1) FROM fila_envios WHERE fila_envios.campanha_id = campanhas.id AND fila_envios.status = 'enviado'),
      falhas = (SELECT COUNT(1) FROM fila_envios WHERE fila_envios.campanha_id = campanhas.id AND fila_envios.status = 'falha')
    WHERE id IN (SELECT DISTINCT campanha_id FROM fila_envios);
  `);
} catch (err) {
  console.warn('Aviso ao sanitizar registros @lid no banco:', err);
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
  if (!contato.jid || contato.jid.includes('@lid') || (contato.numero && contato.numero.includes('@lid'))) {
    return false;
  }

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

export interface PastaLeads {
  nome: string;
  total: number;
  origem_tipo: string;
  criado_em: string;
}

export function getPastasLeads(): PastaLeads[] {
  const query = `
    SELECT 
      COALESCE(NULLIF(TRIM(grupo_nome), ''), 'Geral') as nome,
      COUNT(*) as total,
      COALESCE(origem_tipo, 'extracao') as origem_tipo,
      MAX(criado_em) as criado_em
    FROM contatos
    WHERE ativo = 1
    GROUP BY COALESCE(NULLIF(TRIM(grupo_nome), ''), 'Geral')
    ORDER BY MAX(criado_em) DESC, total DESC
  `;
  return db.prepare(query).all() as PastaLeads[];
}

export function getContatos(limit = 500, offset = 0, busca = '', pasta = ''): { contatos: Contato[]; total: number } {
  let query = 'SELECT * FROM contatos WHERE ativo = 1';
  let countQuery = 'SELECT COUNT(*) as total FROM contatos WHERE ativo = 1';
  const params: any[] = [];

  if (pasta && pasta !== 'todos') {
    if (pasta === 'Geral') {
      query += " AND (grupo_nome IS NULL OR TRIM(grupo_nome) = '' OR grupo_nome = 'Geral')";
      countQuery += " AND (grupo_nome IS NULL OR TRIM(grupo_nome) = '' OR grupo_nome = 'Geral')";
    } else {
      query += ' AND grupo_nome = ?';
      countQuery += ' AND grupo_nome = ?';
      params.push(pasta);
    }
  }

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

export function getAllContatosParaExportar(pasta = ''): Contato[] {
  let query = 'SELECT * FROM contatos WHERE ativo = 1';
  const params: any[] = [];

  if (pasta && pasta !== 'todos') {
    if (pasta === 'Geral') {
      query += " AND (grupo_nome IS NULL OR TRIM(grupo_nome) = '' OR grupo_nome = 'Geral')";
    } else {
      query += ' AND grupo_nome = ?';
      params.push(pasta);
    }
  }

  query += ' ORDER BY id ASC';
  return db.prepare(query).all(...params) as Contato[];
}

export function deleteContato(id: number): void {
  db.prepare('DELETE FROM contatos WHERE id = ?').run(id);
}

export function deletePastaLeads(pastaNome: string): number {
  if (!pastaNome) return 0;
  let info: any;
  if (pastaNome === 'Geral') {
    info = db.prepare("DELETE FROM contatos WHERE grupo_nome IS NULL OR TRIM(grupo_nome) = '' OR grupo_nome = 'Geral'").run();
  } else {
    info = db.prepare('DELETE FROM contatos WHERE grupo_nome = ?').run(pastaNome);
  }
  return info.changes;
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

// Funções de Aquecimento de Chip (Warm Up)
export interface WarmupStatus {
  ativo: boolean;
  diaAtual: number;
  limiteHoje: number;
  enviosHoje: number;
  restantesHoje: number;
  dataInicio: string;
  volumeInicial: number;
  incrementoDiario: number;
  limiteMaximo: number;
  concluido: boolean;
}

export function getWarmupStatus(): WarmupStatus {
  const ativo = getConfig('aquecimento_ativo', 'true') === 'true';
  const volumeInicial = parseInt(getConfig('aquecimento_inicio_diario', '20'), 10) || 20;
  const incrementoDiario = parseInt(getConfig('aquecimento_incremento_diario', '5'), 10) || 5;
  const limiteMaximo = parseInt(getConfig('aquecimento_limite_maximo', '100'), 10) || 100;

  let dataInicioStr = getConfig('aquecimento_data_inicio');
  if (!dataInicioStr) {
    dataInicioStr = new Date().toISOString().split('T')[0];
    setConfig('aquecimento_data_inicio', dataInicioStr);
  }

  // Calcular dias transcorridos
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [ano, mes, dia] = dataInicioStr.split('-').map(Number);
  const inicio = new Date(ano, (mes || 1) - 1, dia || 1);
  inicio.setHours(0, 0, 0, 0);

  const diffTime = Math.max(0, hoje.getTime() - inicio.getTime());
  const diasPassados = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diaAtual = diasPassados + 1; // Dia 1, Dia 2, etc.

  // Volume do dia = volumeInicial + (diasPassados * incrementoDiario)
  const limiteCalculado = volumeInicial + (diasPassados * incrementoDiario);
  const limiteHoje = ativo
    ? Math.min(limiteMaximo, limiteCalculado)
    : parseInt(getConfig('disparo_limite_diario', '100'), 10);

  const enviosHoje = (
    db.prepare(`
      SELECT COUNT(*) as c FROM fila_envios
      WHERE status = 'enviado' AND date(enviado_em) = date('now', 'localtime')
    `).get() as any
  )?.c || 0;

  const restantesHoje = Math.max(0, limiteHoje - enviosHoje);
  const concluido = limiteCalculado >= limiteMaximo;

  return {
    ativo,
    diaAtual,
    limiteHoje,
    enviosHoje,
    restantesHoje,
    dataInicio: dataInicioStr,
    volumeInicial,
    incrementoDiario,
    limiteMaximo,
    concluido
  };
}

export function resetWarmupStartDate(): void {
  const hoje = new Date().toISOString().split('T')[0];
  setConfig('aquecimento_data_inicio', hoje);
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
  const warmup = getWarmupStatus();

  return {
    totalContatos,
    totalGrupos,
    enviosHoje,
    falhasHoje,
    respostasIaHoje,
    warmup
  };
}

export { db };
export default db;
