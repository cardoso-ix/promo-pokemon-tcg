import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Diretório de dados persistentes (SQLite, sessão do WhatsApp)
export const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');

// Garantir que a pasta de dados existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const AUTH_DIR = path.join(DATA_DIR, 'auth_baileys');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'replica.db');

export const CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  defaultMattWord: process.env.MATT_WORD || 'caed1312314',
  defaultMattTool: process.env.MATT_TOOL || '96097202',
  defaultDelaySeconds: 5,
  defaultHourlyCap: 40,
  defaultMaxDelaySeconds: 600, // 10 minutos
  dashboardSecret: process.env.DASHBOARD_SECRET || 'promo-secret-2026'
};
