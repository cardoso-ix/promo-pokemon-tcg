import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve('data');
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

  CREATE TABLE IF NOT EXISTS meta_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meta_id TEXT UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL, -- UTILITY, MARKETING
    idioma TEXT DEFAULT 'pt_BR',
    status TEXT NOT NULL, -- APPROVED, PENDING, REJECTED, PAUSED
    motivo_rejeicao TEXT,
    corpo_texto TEXT NOT NULL,
    exemplo_variaveis TEXT,
    sincronizado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ofertas_recebidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    link_afiliado TEXT NOT NULL,
    link_original TEXT,
    preco_de REAL,
    preco_por REAL,
    desconto REAL,
    cupom TEXT,
    parcelamento TEXT,
    imagem_url TEXT,
    mensagem_formatada TEXT,
    origem TEXT DEFAULT 'replicador',
    status TEXT DEFAULT 'nova',
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financas_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_arquivo TEXT NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    mes_referencia TEXT NOT NULL,
    semana_rotulo TEXT NOT NULL,
    periodo_inicio TEXT,
    periodo_fim TEXT,
    total_linhas INTEGER NOT NULL DEFAULT 0,
    valor_total_gasto REAL NOT NULL DEFAULT 0,
    total_resultados INTEGER NOT NULL DEFAULT 0,
    impressoes_total INTEGER NOT NULL DEFAULT 0,
    cliques_total INTEGER NOT NULL DEFAULT 0,
    ctr_medio REAL NOT NULL DEFAULT 0,
    cpc_medio REAL NOT NULL DEFAULT 0,
    cpm_medio REAL NOT NULL DEFAULT 0,
    custo_por_lead_medio REAL NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS financas_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER NOT NULL,
    mes_referencia TEXT NOT NULL,
    semana_rotulo TEXT NOT NULL,
    nome_campanha TEXT NOT NULL,
    status_veiculacao TEXT,
    orcamento REAL,
    tipo_orcamento TEXT,
    valor_gasto REAL NOT NULL DEFAULT 0,
    resultados INTEGER NOT NULL DEFAULT 0,
    custo_por_resultado REAL,
    impressoes INTEGER NOT NULL DEFAULT 0,
    cpm REAL,
    cliques INTEGER NOT NULL DEFAULT 0,
    ctr REAL,
    cpc REAL,
    inicio_relatorio TEXT,
    fim_relatorio TEXT,
    criado_em TEXT NOT NULL,
    FOREIGN KEY(upload_id) REFERENCES financas_uploads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS financas_despesas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_arquivo TEXT NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    data_despesa TEXT NOT NULL,
    valor REAL NOT NULL,
    descricao TEXT NOT NULL,
    conta_anuncio TEXT,
    metodo_pagamento TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_financas_uploads_mes ON financas_uploads(mes_referencia);
  CREATE INDEX IF NOT EXISTS idx_financas_itens_mes ON financas_itens(mes_referencia);
  CREATE INDEX IF NOT EXISTS idx_financas_itens_upload ON financas_itens(upload_id);
  CREATE INDEX IF NOT EXISTS idx_financas_despesas_data ON financas_despesas(data_despesa);
`);

// Migração suave de colunas na tabela campanhas
try {
  const pragmaCampanhas = db.prepare("PRAGMA table_info('campanhas')").all() as { name: string }[];
  const colNames = pragmaCampanhas.map((c) => c.name);
  if (!colNames.includes('canal_envio')) {
    db.exec("ALTER TABLE campanhas ADD COLUMN canal_envio TEXT DEFAULT 'baileys'");
  }
  if (!colNames.includes('meta_template_nome')) {
    db.exec('ALTER TABLE campanhas ADD COLUMN meta_template_nome TEXT');
  }
} catch (errCol: any) {
  console.warn('Aviso de migração de colunas em campanhas:', errCol?.message || errCol);
}

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
  disparo_limite_diario: '100',
  meta_cloud_ativo: 'false',
  meta_cloud_token: '',
  meta_waba_id: '',
  meta_phone_number_id: '',
  meta_api_version: 'v21.0'
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
  canal_envio?: 'baileys' | 'meta_cloud';
  meta_template_nome?: string;
  criado_em?: string;
  iniciado_em?: string;
  concluido_em?: string;
}

export function createCampanha(campanha: Campanha): number {
  const result = db.prepare(`
    INSERT INTO campanhas (nome, mensagem_template, midia_tipo, midia_url, midia_path, status, total_destinatarios, canal_envio, meta_template_nome, criado_em)
    VALUES (?, ?, ?, ?, ?, 'criada', ?, ?, ?, datetime('now', 'localtime'))
  `).run(
    campanha.nome,
    campanha.mensagem_template,
    campanha.midia_tipo || null,
    campanha.midia_url || null,
    campanha.midia_path || null,
    campanha.total_destinatarios || 0,
    campanha.canal_envio || 'baileys',
    campanha.meta_template_nome || null
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

// Funções de Templates Oficiais da Meta (Cloud API)
export interface MetaTemplate {
  id?: number;
  meta_id?: string;
  nome: string;
  categoria: 'UTILITY' | 'MARKETING';
  idioma: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  motivo_rejeicao?: string;
  corpo_texto: string;
  exemplo_variaveis?: string;
  sincronizado_em: string;
}

export function getMetaTemplates(): MetaTemplate[] {
  return db.prepare('SELECT * FROM meta_templates ORDER BY id DESC').all() as MetaTemplate[];
}

export function getMetaTemplateByNome(nome: string): MetaTemplate | undefined {
  return db.prepare('SELECT * FROM meta_templates WHERE nome = ?').get(nome) as MetaTemplate | undefined;
}

export function saveMetaTemplate(tpl: Omit<MetaTemplate, 'id'>): void {
  const existing = tpl.meta_id
    ? (db.prepare('SELECT id FROM meta_templates WHERE meta_id = ?').get(tpl.meta_id) as any)
    : (db.prepare('SELECT id FROM meta_templates WHERE nome = ?').get(tpl.nome) as any);

  const sincronizadoEm = tpl.sincronizado_em || new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE meta_templates SET
        meta_id = COALESCE(?, meta_id),
        nome = ?,
        categoria = ?,
        idioma = ?,
        status = ?,
        motivo_rejeicao = ?,
        corpo_texto = ?,
        exemplo_variaveis = ?,
        sincronizado_em = ?
      WHERE id = ?
    `).run(
      tpl.meta_id || null,
      tpl.nome,
      tpl.categoria,
      tpl.idioma || 'pt_BR',
      tpl.status,
      tpl.motivo_rejeicao || null,
      tpl.corpo_texto,
      tpl.exemplo_variaveis || null,
      sincronizadoEm,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO meta_templates (meta_id, nome, categoria, idioma, status, motivo_rejeicao, corpo_texto, exemplo_variaveis, sincronizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tpl.meta_id || null,
      tpl.nome,
      tpl.categoria,
      tpl.idioma || 'pt_BR',
      tpl.status,
      tpl.motivo_rejeicao || null,
      tpl.corpo_texto,
      tpl.exemplo_variaveis || null,
      sincronizadoEm
    );
  }
}

export function deleteMetaTemplateFromDb(nome: string): void {
  db.prepare('DELETE FROM meta_templates WHERE nome = ?').run(nome);
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

// ==========================================
// OFERTAS RECEBIDAS (Ponte Interna com Replicador)
// ==========================================

export interface OfertaRecebidaInput {
  titulo: string;
  linkAfiliado: string;
  linkOriginal?: string;
  precoDe?: number;
  precoPor?: number;
  desconto?: number;
  cupom?: string;
  parcelamento?: string;
  imagemUrl?: string;
  mensagemFormatada?: string;
  origem?: string;
}

export function salvarOfertaRecebida(oferta: OfertaRecebidaInput): number {
  const agora = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO ofertas_recebidas (
      titulo, link_afiliado, link_original, preco_de, preco_por,
      desconto, cupom, parcelamento, imagem_url, mensagem_formatada,
      origem, status, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nova', ?)
  `);

  const info = stmt.run(
    oferta.titulo,
    oferta.linkAfiliado,
    oferta.linkOriginal || null,
    oferta.precoDe ?? null,
    oferta.precoPor ?? null,
    oferta.desconto ?? null,
    oferta.cupom || null,
    oferta.parcelamento || null,
    oferta.imagemUrl || null,
    oferta.mensagemFormatada || null,
    oferta.origem || 'replicador',
    agora
  );

  return Number(info.lastInsertRowid);
}

export function getOfertasRecebidas(limit = 50, status?: string): any[] {
  if (status) {
    return db.prepare('SELECT * FROM ofertas_recebidas WHERE status = ? ORDER BY id DESC LIMIT ?').all(status, limit);
  }
  return db.prepare('SELECT * FROM ofertas_recebidas ORDER BY id DESC LIMIT ?').all(limit);
}

export function marcarOfertaStatus(id: number, status: string): void {
  db.prepare('UPDATE ofertas_recebidas SET status = ? WHERE id = ?').run(status, id);
}

export function deleteOfertaRecebida(id: number): void {
  db.prepare('DELETE FROM ofertas_recebidas WHERE id = ?').run(id);
}

// ==========================================
// MÓDULO DE FINANÇAS & CONTROLE META ADS
// ==========================================

export interface FinancasUploadInput {
  nomeArquivo: string;
  caminhoArquivo: string;
  tamanhoBytes: number;
  semanaRotulo: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  mesReferencia: string;
  gastoTotal: number;
  impressoesTotal: number;
  cliquesTotal: number;
  leadsTotal: number;
  ctrMedio: number;
  cpcMedio: number;
  cpmMedio: number;
  custoPorLeadMedio: number;
  qtdCampanhas: number;
}

export interface FinancasItemInput {
  nomeCampanha: string;
  statusVeiculacao?: string;
  orcamento?: number;
  tipoOrcamento?: string;
  valorGasto: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  custoPorLead: number;
  dataInicio?: string | null;
  dataFim?: string | null;
  mesReferencia: string;
}

export interface FinancasConsolidadoMensal {
  mesReferencia: string;
  kpis: {
    gastoTotal: number;
    leadsTotal: number;
    custoPorLeadMedio: number;
    impressoesTotal: number;
    cliquesTotal: number;
    ctrMedio: number;
    cpcMedio: number;
    cpmMedio: number;
    qtdUploads: number;
    qtdCampanhasDistintas: number;
  };
  semanas: Array<{
    uploadId: number;
    nomeArquivo: string;
    semanaRotulo: string;
    periodoInicio: string | null;
    periodoFim: string | null;
    gastoTotal: number;
    leadsTotal: number;
    custoPorLeadMedio: number;
    impressoesTotal: number;
    cliquesTotal: number;
    ctrMedio: number;
    cpcMedio: number;
    cpmMedio: number;
    criadoEm: string;
  }>;
  topCampanhas: Array<{
    nomeCampanha: string;
    valorGasto: number;
    leads: number;
    custoPorLead: number;
    impressoes: number;
    cliques: number;
    shareGasto: number;
  }>;
}

export function salvarFinancasUpload(upload: FinancasUploadInput, itens: FinancasItemInput[]): number {
  const agora = new Date().toISOString();

  const insertUpload = db.prepare(`
    INSERT INTO financas_uploads (
      nome_arquivo, caminho_arquivo, tamanho_bytes, mes_referencia, semana_rotulo,
      periodo_inicio, periodo_fim, total_linhas, valor_total_gasto, total_resultados,
      impressoes_total, cliques_total, ctr_medio, cpc_medio, cpm_medio, custo_por_lead_medio,
      criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO financas_itens (
      upload_id, mes_referencia, semana_rotulo, nome_campanha, status_veiculacao,
      orcamento, tipo_orcamento, valor_gasto, resultados, custo_por_resultado,
      impressoes, cpm, cliques, ctr, cpc, inicio_relatorio, fim_relatorio, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transacao = db.transaction(() => {
    const resUpload = insertUpload.run(
      upload.nomeArquivo,
      upload.caminhoArquivo,
      upload.tamanhoBytes,
      upload.mesReferencia,
      upload.semanaRotulo,
      upload.periodoInicio,
      upload.periodoFim,
      itens.length,
      upload.gastoTotal,
      upload.leadsTotal,
      upload.impressoesTotal,
      upload.cliquesTotal,
      upload.ctrMedio,
      upload.cpcMedio,
      upload.cpmMedio,
      upload.custoPorLeadMedio,
      agora
    );

    const uploadId = Number(resUpload.lastInsertRowid);

    for (const it of itens) {
      insertItem.run(
        uploadId,
        upload.mesReferencia,
        upload.semanaRotulo,
        it.nomeCampanha,
        it.statusVeiculacao || 'ativa',
        it.orcamento ?? null,
        it.tipoOrcamento || null,
        it.valorGasto,
        it.leads,
        it.custoPorLead,
        it.impressoes,
        it.cpm,
        it.cliques,
        it.ctr,
        it.cpc,
        it.dataInicio || null,
        it.dataFim || null,
        agora
      );
    }

    return uploadId;
  });

  return transacao();
}

export function listarFinancasUploads(mesReferencia?: string): any[] {
  if (mesReferencia && mesReferencia.trim()) {
    return db
      .prepare('SELECT * FROM financas_uploads WHERE mes_referencia = ? ORDER BY id DESC')
      .all(mesReferencia.trim());
  }
  return db.prepare('SELECT * FROM financas_uploads ORDER BY id DESC').all();
}

export function getFinancasUploadById(id: number): any {
  return db.prepare('SELECT * FROM financas_uploads WHERE id = ?').get(id);
}

export function deleteFinancasUpload(id: number): { id: number; caminhoArquivo: string } | null {
  const registro: any = db.prepare('SELECT id, caminho_arquivo FROM financas_uploads WHERE id = ?').get(id);
  if (!registro) return null;

  const transacao = db.transaction(() => {
    db.prepare('DELETE FROM financas_itens WHERE upload_id = ?').run(id);
    db.prepare('DELETE FROM financas_uploads WHERE id = ?').run(id);
  });

  transacao();

  return {
    id: registro.id,
    caminhoArquivo: registro.caminho_arquivo
  };
}

export function listarMesesDisponiveisFinancas(): string[] {
  const rows: any[] = db
    .prepare('SELECT DISTINCT mes_referencia FROM financas_uploads ORDER BY mes_referencia DESC')
    .all();
  return rows.map((r) => r.mes_referencia).filter(Boolean);
}

export function obterConsolidadoMensalFinancas(mesReferencia: string): FinancasConsolidadoMensal {
  const mes = (mesReferencia || '').trim();

  const uploads: any[] = db
    .prepare('SELECT * FROM financas_uploads WHERE mes_referencia = ? ORDER BY id ASC')
    .all(mes);

  const kpisPadrao = {
    gastoTotal: 0,
    leadsTotal: 0,
    custoPorLeadMedio: 0,
    impressoesTotal: 0,
    cliquesTotal: 0,
    ctrMedio: 0,
    cpcMedio: 0,
    cpmMedio: 0,
    qtdUploads: 0,
    qtdCampanhasDistintas: 0
  };

  if (!uploads || uploads.length === 0) {
    return {
      mesReferencia: mes,
      kpis: kpisPadrao,
      semanas: [],
      topCampanhas: []
    };
  }

  // Agregações de Totais a partir dos itens do mês
  const aggGeral: any = db
    .prepare(`
      SELECT 
        COALESCE(SUM(valor_gasto), 0) AS gasto_total,
        COALESCE(SUM(resultados), 0) AS leads_total,
        COALESCE(SUM(impressoes), 0) AS impressoes_total,
        COALESCE(SUM(cliques), 0) AS cliques_total,
        COUNT(DISTINCT nome_campanha) AS qtd_campanhas_distintas
      FROM financas_itens
      WHERE mes_referencia = ?
    `)
    .get(mes);

  const gastoTotal = Number((aggGeral?.gasto_total || 0).toFixed(2));
  const leadsTotal = Number(aggGeral?.leads_total || 0);
  const impressoesTotal = Number(aggGeral?.impressoes_total || 0);
  const cliquesTotal = Number(aggGeral?.cliques_total || 0);
  const qtdCampanhasDistintas = Number(aggGeral?.qtd_campanhas_distintas || 0);

  const custoPorLeadMedio = leadsTotal > 0 ? Number((gastoTotal / leadsTotal).toFixed(2)) : 0;
  const ctrMedio = impressoesTotal > 0 ? Number(((cliquesTotal / impressoesTotal) * 100).toFixed(2)) : 0;
  const cpcMedio = cliquesTotal > 0 ? Number((gastoTotal / cliquesTotal).toFixed(2)) : 0;
  const cpmMedio = impressoesTotal > 0 ? Number(((gastoTotal / impressoesTotal) * 1000).toFixed(2)) : 0;

  const semanas = uploads.map((u) => ({
    uploadId: u.id,
    nomeArquivo: u.nome_arquivo,
    semanaRotulo: u.semana_rotulo,
    periodoInicio: u.periodo_inicio,
    periodoFim: u.periodo_fim,
    gastoTotal: Number(u.valor_total_gasto || 0),
    leadsTotal: Number(u.total_resultados || 0),
    custoPorLeadMedio: Number(u.custo_por_lead_medio || 0),
    impressoesTotal: Number(u.impressoes_total || 0),
    cliquesTotal: Number(u.cliques_total || 0),
    ctrMedio: Number(u.ctr_medio || 0),
    cpcMedio: Number(u.cpc_medio || 0),
    cpmMedio: Number(u.cpm_medio || 0),
    criadoEm: u.criado_em
  }));

  // Agrupar por campanha no mês para ranking e distribuição de verba
  const campanhasRows: any[] = db
    .prepare(`
      SELECT 
        nome_campanha,
        COALESCE(SUM(valor_gasto), 0) AS valor_gasto,
        COALESCE(SUM(resultados), 0) AS leads,
        COALESCE(SUM(impressoes), 0) AS impressoes,
        COALESCE(SUM(cliques), 0) AS cliques
      FROM financas_itens
      WHERE mes_referencia = ?
      GROUP BY nome_campanha
      ORDER BY valor_gasto DESC
    `)
    .all(mes);

  const topCampanhas = campanhasRows.map((c) => {
    const vg = Number((c.valor_gasto || 0).toFixed(2));
    const ld = Number(c.leads || 0);
    const cpl = ld > 0 ? Number((vg / ld).toFixed(2)) : 0;
    const share = gastoTotal > 0 ? Number(((vg / gastoTotal) * 100).toFixed(1)) : 0;

    return {
      nomeCampanha: c.nome_campanha,
      valorGasto: vg,
      leads: ld,
      custoPorLead: cpl,
      impressoes: Number(c.impressoes || 0),
      cliques: Number(c.cliques || 0),
      shareGasto: share
    };
  });

  return {
    mesReferencia: mes,
    kpis: {
      gastoTotal,
      leadsTotal,
      custoPorLeadMedio,
      impressoesTotal,
      cliquesTotal,
      ctrMedio,
      cpcMedio,
      cpmMedio,
      qtdUploads: uploads.length,
      qtdCampanhasDistintas
    },
    semanas,
    topCampanhas
  };
}

// ==========================================
// DESPESAS E FATURAS EM PDF (Meta Ads)
// ==========================================

export interface FinancasDespesaInput {
  nomeArquivo: string;
  caminhoArquivo: string;
  tamanhoBytes: number;
  dataDespesa: string; // YYYY-MM-DD
  valor: number;
  descricao: string;
  contaAnuncio?: string | null;
  metodoPagamento?: string | null;
  observacoes?: string | null;
}

export interface FinancasDespesaRow {
  id: number;
  nome_arquivo: string;
  caminho_arquivo: string;
  tamanho_bytes: number;
  data_despesa: string;
  valor: number;
  descricao: string;
  conta_anuncio: string | null;
  metodo_pagamento: string | null;
  observacoes: string | null;
  criado_em: string;
}

export interface FinancasResumoPeriodo {
  dataInicio: string | null;
  dataFim: string | null;
  totalGasto: number;
  totalFaturas: number;
  maiorDespesa: number;
  mediaPorFatura: number;
  itens: FinancasDespesaRow[];
}

export function salvarDespesaPdf(despesa: FinancasDespesaInput): number {
  const agora = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO financas_despesas (
      nome_arquivo, caminho_arquivo, tamanho_bytes, data_despesa,
      valor, descricao, conta_anuncio, metodo_pagamento, observacoes, criado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res = stmt.run(
    despesa.nomeArquivo,
    despesa.caminhoArquivo,
    despesa.tamanhoBytes,
    despesa.dataDespesa,
    Number(despesa.valor) || 0,
    despesa.descricao,
    despesa.contaAnuncio || null,
    despesa.metodoPagamento || null,
    despesa.observacoes || null,
    agora
  );

  return Number(res.lastInsertRowid);
}

export function listarDespesasPeriodo(dataInicio?: string, dataFim?: string): FinancasDespesaRow[] {
  let query = 'SELECT * FROM financas_despesas';
  const params: any[] = [];

  const condicoes: string[] = [];
  if (dataInicio && dataInicio.trim()) {
    condicoes.push('data_despesa >= ?');
    params.push(dataInicio.trim());
  }
  if (dataFim && dataFim.trim()) {
    condicoes.push('data_despesa <= ?');
    params.push(dataFim.trim());
  }

  if (condicoes.length > 0) {
    query += ' WHERE ' + condicoes.join(' AND ');
  }

  query += ' ORDER BY data_despesa DESC, id DESC';

  return db.prepare(query).all(...params) as FinancasDespesaRow[];
}

export function obterResumoDespesasPeriodo(dataInicio?: string, dataFim?: string): FinancasResumoPeriodo {
  const itens = listarDespesasPeriodo(dataInicio, dataFim);

  let totalGasto = 0;
  let maiorDespesa = 0;

  for (const it of itens) {
    const val = Number(it.valor) || 0;
    totalGasto += val;
    if (val > maiorDespesa) {
      maiorDespesa = val;
    }
  }

  totalGasto = Number(totalGasto.toFixed(2));
  maiorDespesa = Number(maiorDespesa.toFixed(2));
  const totalFaturas = itens.length;
  const mediaPorFatura = totalFaturas > 0 ? Number((totalGasto / totalFaturas).toFixed(2)) : 0;

  return {
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
    totalGasto,
    totalFaturas,
    maiorDespesa,
    mediaPorFatura,
    itens
  };
}

export function getDespesaPdfById(id: number): FinancasDespesaRow | null {
  const row = db.prepare('SELECT * FROM financas_despesas WHERE id = ?').get(id) as FinancasDespesaRow | undefined;
  return row || null;
}

export function deleteDespesaPdf(id: number): { id: number; caminhoArquivo: string } | null {
  const registro = getDespesaPdfById(id);
  if (!registro) return null;

  db.prepare('DELETE FROM financas_despesas WHERE id = ?').run(id);

  return {
    id: registro.id,
    caminhoArquivo: registro.caminho_arquivo
  };
}

export { db };
export default db;
