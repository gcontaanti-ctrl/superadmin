/**
 * sync_db2_config.cjs
 * Sincroniza a configuracao de conexao DB2 do Supabase para o arquivo local .runtime/db-config.json
 */

const fs = require('fs');
const path = require('path');

function loadLocalEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (key && process.env[key] == null) {
      process.env[key] = value;
    }
  }
}

loadLocalEnvFile();

const CONFIG_DIR = path.join(__dirname, '.runtime');
const DB_CONFIG_PATH = process.env.DB_CONFIG_PATH || path.join(CONFIG_DIR, 'db-config.json');
const SUPABASE_CONFIG_TABLE = process.env.SUPABASE_CONFIG_TABLE || 'erp_db_config';
const SUPABASE_CONFIG_ID = process.env.SUPABASE_CONFIG_ID || 'default';

const DEFAULT_DB_CONFIG = {
  database: process.env.DB2_DATABASE || 'cisserp',
  hostname: process.env.DB2_HOSTNAME || '192.168.20.20',
  port: process.env.DB2_PORT || '30231',
  protocol: process.env.DB2_PROTOCOL || 'TCPIP',
  uid: process.env.DB2_UID || 'contabilidade',
  pwd: process.env.DB2_PWD || '',
  connectTimeout: process.env.DB2_CONNECT_TIMEOUT || '30',
  useExternalHost: process.env.DB2_USE_EXTERNAL_HOST === 'true',
  externalHost: process.env.DB2_EXTERNAL_HOST || '',
  externalPort: process.env.DB2_EXTERNAL_PORT || '',
  updatedAt: null,
};

function getSupabaseConfigEnv() {
  return {
    url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    serviceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || ''),
  };
}

function hasSupabaseConfigStore() {
  const env = getSupabaseConfigEnv();
  return Boolean(env.url && env.serviceRoleKey);
}

function supabaseHeaders(extra = {}) {
  const env = getSupabaseConfigEnv();
  return {
    apikey: env.serviceRoleKey,
    authorization: `Bearer ${env.serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

function normalizeDbConfig(input = {}, base = DEFAULT_DB_CONFIG) {
  const next = {
    ...base,
    database: String(input.database ?? base.database ?? '').trim(),
    hostname: String(input.hostname ?? base.hostname ?? '').trim(),
    port: String(input.port ?? base.port ?? '').trim(),
    protocol: String(input.protocol ?? base.protocol ?? 'TCPIP').trim().toUpperCase(),
    uid: String(input.uid ?? base.uid ?? '').trim(),
    connectTimeout: String(input.connectTimeout ?? base.connectTimeout ?? '30').trim(),
    useExternalHost: Boolean(input.useExternalHost ?? base.useExternalHost),
    externalHost: String(input.externalHost ?? base.externalHost ?? '').trim(),
    externalPort: String(input.externalPort ?? base.externalPort ?? '').trim(),
    updatedAt: input.updatedAt ?? base.updatedAt ?? null,
  };

  if (input.clearPassword === true) {
    next.pwd = '';
  } else if (typeof input.password === 'string' && input.password.length > 0) {
    next.pwd = input.password;
  } else if (typeof input.pwd === 'string' && input.pwd.length > 0) {
    next.pwd = input.pwd;
  } else {
    next.pwd = base.pwd ?? '';
  }

  return next;
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function writeLocalDbConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(DB_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function fetchSupabaseDbConfig() {
  const env = getSupabaseConfigEnv();
  const url = `${env.url}/rest/v1/${SUPABASE_CONFIG_TABLE}?id=eq.${encodeURIComponent(SUPABASE_CONFIG_ID)}&select=config&limit=1`;

  const response = await fetch(url, {
    headers: supabaseHeaders({ accept: 'application/json' }),
  });

  if (!response.ok) {
    throw new Error(`Supabase config read failed: ${response.status} ${await response.text()}`);
  }

  const rows = await response.json();
  return rows?.[0]?.config || null;
}

async function main() {
  console.log('=== Sincronizacao de Configuracao DB2 ===\n');

  if (!hasSupabaseConfigStore()) {
    console.error('[ERRO] Variaveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configuradas.');
    console.error('Verifique o arquivo .env na raiz do projeto.');
    process.exit(1);
  }

  const env = getSupabaseConfigEnv();
  console.log(`[INFO] Supabase URL: ${env.url}`);
  console.log(`[INFO] Tabela: ${SUPABASE_CONFIG_TABLE}, ID: ${SUPABASE_CONFIG_ID}`);
  console.log(`[INFO] Destino local: ${DB_CONFIG_PATH}\n`);

  try {
    console.log('[...] Buscando configuracao no Supabase...');
    const remoteConfig = await fetchSupabaseDbConfig();

    if (!remoteConfig) {
      console.warn('[AVISO] Nenhuma configuracao encontrada no Supabase (tabela vazia ou ID nao existe).');
      console.log('[INFO] Configuracao local nao foi alterada.');
      process.exit(0);
    }

    const normalized = normalizeDbConfig(remoteConfig, DEFAULT_DB_CONFIG);
    writeLocalDbConfig(normalized);

    console.log('[OK] Configuracao sincronizada com sucesso!\n');
    console.log('[RESULTADO]');
    console.log(`  Host:        ${normalized.hostname}:${normalized.port}`);
    console.log(`  Database:    ${normalized.database}`);
    console.log(`  User:        ${normalized.uid}`);
    console.log(`  Protocol:    ${normalized.protocol}`);
    console.log(`  Timeout:     ${normalized.connectTimeout}s`);
    if (normalized.useExternalHost) {
      console.log(`  ExtHost:     ${normalized.externalHost}:${normalized.externalPort}`);
    }
    console.log(`  Senha:       ${normalized.pwd ? '(configurada)' : '(vazia)'}`);
    console.log(`  Atualizado:  ${normalized.updatedAt || 'N/A'}`);
    console.log(`\n[OK] Arquivo salvo em: ${DB_CONFIG_PATH}`);

  } catch (err) {
    console.error('[ERRO] Falha ao sincronizar:', err.message);
    process.exit(1);
  }
}

main();
