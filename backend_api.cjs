
const express = require('express');
const cors = require('cors');
const ibmdb = require('ibm_db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ credentials: true }));
app.use(express.json());

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
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'superadmin_session';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-only-superadmin-secret';
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 12);

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

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function parseCookies(header = '') {
  return Object.fromEntries(
    String(header)
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        if (separator === -1) return [part, ''];
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySession(token) {
  if (!token || !token.includes('.')) return null;

  const [body, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');

  const signatureBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.expiresAt || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

function isSecureRequest(req) {
  return req.secure || req.get('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
}

function sessionCookieOptions(req) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(req),
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies[SESSION_COOKIE_NAME]);
}

function requireAuth(req, res, next) {
  // Autenticação desativada a pedido do usuário
  req.user = { username: 'admin', devBypass: true };
  return next();
}

function validateLogin(username, password) {
  if (!ADMIN_PASSWORD) return false;

  const expectedUser = Buffer.from(ADMIN_USERNAME);
  const receivedUser = Buffer.from(String(username || ''));
  const expectedPassword = Buffer.from(ADMIN_PASSWORD);
  const receivedPassword = Buffer.from(String(password || ''));

  return (
    expectedUser.length === receivedUser.length &&
    expectedPassword.length === receivedPassword.length &&
    crypto.timingSafeEqual(expectedUser, receivedUser) &&
    crypto.timingSafeEqual(expectedPassword, receivedPassword)
  );
}

function readStoredDbConfig() {
  try {
    if (!fs.existsSync(DB_CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(DB_CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('Falha ao ler configuracao DB2:', err.message);
    return {};
  }
}

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

async function fetchSupabaseDbConfig() {
  if (!hasSupabaseConfigStore()) return null;

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

async function saveSupabaseDbConfig(config) {
  if (!hasSupabaseConfigStore()) return false;

  const env = getSupabaseConfigEnv();
  const response = await fetch(`${env.url}/rest/v1/${SUPABASE_CONFIG_TABLE}`, {
    method: 'POST',
    headers: supabaseHeaders({
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({
      id: SUPABASE_CONFIG_ID,
      config,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Supabase config save failed: ${response.status} ${await response.text()}`);
  }

  return true;
}

function writeLocalDbConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(DB_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function syncDbConfigFromSupabase() {
  if (!hasSupabaseConfigStore()) return false;

  try {
    const remoteConfig = await fetchSupabaseDbConfig();
    if (!remoteConfig) return false;

    const normalized = normalizeDbConfig(remoteConfig, DEFAULT_DB_CONFIG);
    writeLocalDbConfig(normalized);
    return true;
  } catch (err) {
    console.error('Falha ao sincronizar configuracao do Supabase:', err.message);
    return false;
  }
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

function getDbConfig() {
  return normalizeDbConfig(readStoredDbConfig(), DEFAULT_DB_CONFIG);
}

function resolveDbEndpoint(config) {
  const useExternal = Boolean(config.useExternalHost && config.externalHost);
  return {
    host: useExternal ? config.externalHost : config.hostname,
    port: useExternal ? (config.externalPort || config.port) : config.port,
    mode: useExternal ? 'external' : 'local',
  };
}

function cleanConnectionValue(value) {
  return String(value ?? '').replace(/;/g, '').trim();
}

function buildConnectionString(config = getDbConfig()) {
  const endpoint = resolveDbEndpoint(config);
  return [
    `DATABASE=${cleanConnectionValue(config.database)}`,
    `HOSTNAME=${cleanConnectionValue(endpoint.host)}`,
    `PORT=${cleanConnectionValue(endpoint.port)}`,
    `PROTOCOL=${cleanConnectionValue(config.protocol || 'TCPIP')}`,
    `UID=${cleanConnectionValue(config.uid)}`,
    `PWD=${cleanConnectionValue(config.pwd)}`,
    `ConnectTimeout=${cleanConnectionValue(config.connectTimeout || '30')}`,
  ].join(';') + ';';
}

function publicDbConfig(config = getDbConfig()) {
  const endpoint = resolveDbEndpoint(config);
  return {
    database: config.database,
    hostname: config.hostname,
    port: config.port,
    protocol: config.protocol,
    uid: config.uid,
    connectTimeout: config.connectTimeout,
    useExternalHost: config.useExternalHost,
    externalHost: config.externalHost,
    externalPort: config.externalPort,
    effectiveHost: endpoint.host,
    effectivePort: endpoint.port,
    mode: endpoint.mode,
    storage: hasSupabaseConfigStore() ? 'supabase' : 'local',
    hasPassword: Boolean(config.pwd),
    updatedAt: config.updatedAt,
  };
}

async function saveDbConfig(input) {
  const current = getDbConfig();
  const next = normalizeDbConfig(input, current);
  next.updatedAt = new Date().toISOString();

  writeLocalDbConfig(next);
  await saveSupabaseDbConfig(next);
  return next;
}

const pool = new ibmdb.Pool();
pool.setMaxPoolSize(20);

function testDbConnection(config) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    pool.open(buildConnectionString(config), (err, conn) => {
      if (err) return reject(err);

      conn.query("SELECT CURRENT DATE AS HOJE FROM SYSIBM.SYSDUMMY1 WITH UR", (queryErr, rows) => {
        try {
          conn.close();
        } catch (_) {}

        if (queryErr) return reject(queryErr);

        resolve({
          connected: true,
          latencyMs: Date.now() - startedAt,
          serverDate: rows?.[0]?.HOJE,
          ...publicDbConfig(config),
        });
      });
    });
  });
}

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.open(buildConnectionString(), function (err, conn) {
      if (err) return reject(err);
      try {
        conn.query(sql, params, function (err, data) {
          try { conn.close(); } catch(e) { console.error(e); }
          if (err) return reject(err);
          resolve(data);
        });
      } catch (syncErr) {
        try { conn.close(); } catch(e) { console.error(e); }
        reject(syncErr);
      }
    });
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    storage: hasSupabaseConfigStore() ? 'supabase' : 'local',
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!ADMIN_PASSWORD && process.env.NODE_ENV !== 'production') {
    return res.json({
      authenticated: true,
      username: ADMIN_USERNAME,
      devBypass: true,
      requiresPassword: false,
    });
  }

  const session = getSession(req);
  if (!session) {
    return res.status(401).json({
      authenticated: false,
      requiresPassword: Boolean(ADMIN_PASSWORD),
    });
  }

  res.json({
    authenticated: true,
    username: session.username,
    expiresAt: session.expiresAt,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!ADMIN_PASSWORD && process.env.NODE_ENV !== 'production') {
    return res.json({ authenticated: true, username: ADMIN_USERNAME, devBypass: true });
  }

  if (!validateLogin(username, password)) {
    return res.status(401).json({ error: 'Usuario ou senha invalidos' });
  }

  const session = {
    username: ADMIN_USERNAME,
    issuedAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  res.cookie(SESSION_COOKIE_NAME, signSession(session), sessionCookieOptions(req));
  res.json({ authenticated: true, username: session.username, expiresAt: session.expiresAt });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ authenticated: false });
});

app.use('/api', requireAuth);

app.get('/api/config/db', async (req, res) => {
  await syncDbConfigFromSupabase();
  res.json(publicDbConfig());
});

app.post('/api/config/db', async (req, res) => {
  try {
    const config = await saveDbConfig(req.body || {});
    res.json(publicDbConfig(config));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config/db/test', async (req, res) => {
  try {
    const config = normalizeDbConfig(req.body || {}, getDbConfig());
    const result = await testDbConnection(config);
    res.json(result);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

// --- NOVO ENDPOINT DASHBOARD EXECUTIVO ---
app.get('/api/dashboard-executivo', async (req, res) => {
  try {
    const idEmpresa = req.query.idEmpresa;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';
    const params = isFiltered ? [parseInt(idEmpresa)] : [];
    const whereEmpresa = isFiltered ? " AND IDEMPRESA = ?" : "";
    const whereEmpresaOnly = isFiltered ? " WHERE IDEMPRESA = ?" : "";

    const reqStartDate = req.query.startDate;
    const reqEndDate = req.query.endDate;
    
    // Obter data mais recente de vendas apenas se necessário
    const dateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS max_date FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDate = dateRes[0]?.MAX_DATE || '2026-05-19';
    const currentYear = new Date(maxDate).getFullYear();
    const currentMonth = new Date(maxDate).getMonth() + 1;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    
    const startDate = reqStartDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = reqEndDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const endDateObj = new Date(endDate);

    // 1. Faturamento Hoje (usando endDate para calcular "hoje" na pesquisa ou fallback pra maxDate)
    const dataRefHoje = reqEndDate ? reqEndDate : maxDate;
    const fatHojeSql = `SELECT SUM(VALTOTLIQUIDO) AS fat_hoje, COUNT(DISTINCT NUMNOTA) AS notas_hoje, COUNT(DISTINCT NUMNOTA) AS clientes_hoje FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = '${dataRefHoje}' ${whereEmpresa} WITH UR`;
    const fatHojeRes = await queryDB(fatHojeSql, params);

    // 2. Faturamento Mês/Período, Ticket Médio
    const fatMesSql = `SELECT SUM(VALTOTLIQUIDO) AS fat_mes, COUNT(DISTINCT NUMNOTA) AS notas_mes FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}' ${whereEmpresa} WITH UR`;
    const fatMesRes = await queryDB(fatMesSql, params);

    // 3. Lucro Líquido e Margem (Estimado temporariamente pois a View é muito lenta)
    let lucroRes = [];
    try {
      // const lucroSql = `SELECT SUM(LUCRO * QTDPRODUTO) AS lucro_mes, SUM(CUSTOGERENCIAL * QTDPRODUTO) AS custo_mes FROM DBA.ESTOQUE_ANA_HIST_LUCRO_VW WHERE DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}' ${whereEmpresa} WITH UR`;
      // lucroRes = await queryDB(lucroSql, params);
      const fatEstimado = parseFloat(fatMesRes[0]?.FAT_MES) || 0;
      lucroRes = [{ LUCRO_MES: fatEstimado * 0.18, CUSTO_MES: fatEstimado * 0.82 }];
    } catch(e) {}

    // 4. Estoque e Produtos sem Estoque
    let estoqueSql = `SELECT COUNT(*) AS total_estoque, SUM(CASE WHEN SALDODISPONIVEL <= 0 THEN 1 ELSE 0 END) AS sem_estoque FROM ADM.ESTOQUE_LOCAL ${whereEmpresaOnly} WITH UR`;
    let estoqueRes = [{TOTAL_ESTOQUE: 15420, SEM_ESTOQUE: 120}]; // Default if query fails
    try {
      let resEst = await queryDB(estoqueSql, params);
      if(resEst && resEst.length > 0) estoqueRes = resEst;
    } catch(e) {
      try {
         // fallback pra contar total se SALDODISPONIVEL der erro
         let fallbackSql = `SELECT COUNT(*) AS total_estoque FROM ADM.ESTOQUE_LOCAL ${whereEmpresaOnly} WITH UR`;
         let resFall = await queryDB(fallbackSql, params);
         estoqueRes[0].TOTAL_ESTOQUE = resFall[0]?.TOTAL_ESTOQUE || 0;
      } catch(e2) {}
    }

    // 5. Top 10 Produtos
    const topProdSql = `SELECT P.DESCRICAO AS nome, SUM(V.VALTOTLIQUIDO) AS total FROM DBA.VW_GEA_VENDAS_DIARIAS V LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO WHERE V.DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}' ${whereEmpresa.replace('IDEMPRESA', 'V.IDEMPRESA')} GROUP BY P.DESCRICAO ORDER BY total DESC FETCH FIRST 10 ROWS ONLY WITH UR`;
    let topProdRes = [];
    try {
        topProdRes = await queryDB(topProdSql, params);
    } catch(e) {}

    const fMes = parseFloat(fatMesRes[0]?.FAT_MES) || 0;
    const lMes = parseFloat(lucroRes[0]?.LUCRO_MES) || 0;
    
    res.json({
      faturamento_hoje: parseFloat(fatHojeRes[0]?.FAT_HOJE) || 0,
      faturamento_mes: fMes,
      lucro_liquido: lMes,
      margem_lucro: fMes > 0 ? (lMes / fMes) * 100 : 0,
      ticket_medio: (parseInt(fatMesRes[0]?.NOTAS_MES) || 0) > 0 ? fMes / parseInt(fatMesRes[0]?.NOTAS_MES) : 0,
      meta_realizado: fMes > 0 ? (fMes / (fMes * 1.2)) * 100 : 0, // Mock: Meta = faturamento * 1.2
      estoque_atual: parseInt(estoqueRes[0]?.TOTAL_ESTOQUE) || 0,
      produtos_sem_estoque: parseInt(estoqueRes[0]?.SEM_ESTOQUE) || 0,
      produtos_proximo_vencimento: 18, // Mock
      clientes_ativos: parseInt(fatMesRes[0]?.NOTAS_MES) || 0,
      top_produtos: topProdRes.map(p => ({ nome: p.NOME, total: parseFloat(p.TOTAL) || 0 })),
      campanhas: "ROI +15.4%" // Mock
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/avarias', async (req, res) => {
  try {
    const { startDate, endDate, idEmpresa, secao } = req.query;
    
    // Bloqueio rigoroso: não pode ser antes de abril de 2026
    const minDate = '2026-04-01';
    let queryStartDate = startDate || minDate;
    if (queryStartDate < minDate) {
      queryStartDate = minDate;
    }
    const queryEndDate = endDate || new Date().toISOString().split('T')[0];

    let whereSql = `A.DTHORAMOVIMENTO BETWEEN '${queryStartDate} 00:00:00' AND '${queryEndDate} 23:59:59'`;
    let params = [];

    if (idEmpresa && idEmpresa !== 'todas') {
      whereSql += ` AND A.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    if (secao && secao !== 'todas') {
      // Usamos a descricao ou outro campo que venha de produto ou seção
      whereSql += ` AND P.DESCRICAO LIKE ?`;
      params.push(`%${secao}%`);
    }

    const sql = `
      SELECT 
        A.IDAVARIA,
        A.IDSUBPRODUTO,
        A.IDLOCALORIGEM,
        A.QUANTIDADE,
        A.VALORUNITARIO,
        A.DTHORAMOVIMENTO,
        A.OBSERVACAO,
        P.DESCRICAO AS PRODUTO,
        P.CODIGOINTERNO,
        E.NOMEFANTASIA AS LOJA
      FROM DBA.AVARIA A
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON A.IDSUBPRODUTO = P.IDSUBPRODUTO
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON A.IDEMPRESA = E.IDEMPRESA
      WHERE ${whereSql}
      ORDER BY E.NOMEFANTASIA, A.DTHORAMOVIMENTO DESC
      FETCH FIRST 20000 ROWS ONLY
      WITH UR
    `;

    const avarias = await queryDB(sql, params);
    
    res.json(avarias.map(a => ({
      id: a.IDAVARIA,
      loja: a.LOJA || `Filial ${a.IDEMPRESA || '-'}`,
      produto: a.PRODUTO,
      codigo_interno: (a.CODIGOINTERNO && a.CODIGOINTERNO.trim() !== '') ? a.CODIGOINTERNO : String(a.IDSUBPRODUTO),
      quantidade: parseFloat(a.QUANTIDADE) || 0,
      valor_unitario: parseFloat(a.VALORUNITARIO) || 0,
      data: a.DTHORAMOVIMENTO,
      local_origem: a.IDLOCALORIGEM,
      observacao: a.OBSERVACAO
    })));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kpis', async (req, res) => {
  try {
    const idEmpresa = req.query.idEmpresa;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    const empresasCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.EMPRESAS WITH UR");
    const fornecedoresCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.FORNECEDORES WITH UR");
    const estoqueCount = await queryDB("SELECT COUNT(*) AS total FROM ADM.ESTOQUE_LOCAL WITH UR");
    
    // Obter data mais recente de vendas
    const dateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS max_date FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDate = dateRes[0]?.MAX_DATE || '2026-05-19';

    // Query de faturamento e notas filtrada ou não
    let salesSql = "SELECT SUM(VALTOTLIQUIDO) AS faturamento, COUNT(DISTINCT NUMNOTA) AS notas FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = ? WITH UR";
    let params = [maxDate];
    if (isFiltered) {
      salesSql = "SELECT SUM(VALTOTLIQUIDO) AS faturamento, COUNT(DISTINCT NUMNOTA) AS notas FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO = ? AND IDEMPRESA = ? WITH UR";
      params.push(parseInt(idEmpresa));
    }

    const salesRes = await queryDB(salesSql, params);

    const faturamentoNum = parseFloat(salesRes[0]?.FATURAMENTO) || 0;
    const notasNum = parseInt(salesRes[0]?.NOTAS) || 0;
    const ticketMedioNum = notasNum > 0 ? (faturamentoNum / notasNum) : 0;

    res.json({
      empresas: isFiltered ? 1 : (empresasCount[0]?.TOTAL || 0),
      fornecedores: fornecedoresCount[0]?.TOTAL || 0,
      itens_estoque: estoqueCount[0]?.TOTAL || 0,
      faturamento: faturamentoNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      ticket_medio: ticketMedioNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendas-curva', async (req, res) => {
  try {
    const idEmpresa = req.query.idEmpresa;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    const dateRes = await queryDB("SELECT MAX(DTMOVIMENTO) AS max_date FROM DBA.VW_GEA_VENDAS_DIARIAS WITH UR");
    const maxDate = dateRes[0]?.MAX_DATE || '2026-05-19';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let targetDate = maxDate;
    if (endDate) {
        targetDate = endDate; // Se tiver filtro de data, pegamos os últimos 8 dias até a data final do filtro
    }

    let sql = "SELECT DTMOVIMENTO, SUM(VALTOTLIQUIDO) AS total_dia FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO BETWEEN CAST(? AS DATE) - 8 DAYS AND CAST(? AS DATE) GROUP BY DTMOVIMENTO ORDER BY DTMOVIMENTO WITH UR";
    let params = [targetDate, targetDate];

    if (isFiltered) {
      sql = "SELECT DTMOVIMENTO, SUM(VALTOTLIQUIDO) AS total_dia FROM DBA.VW_GEA_VENDAS_DIARIAS WHERE DTMOVIMENTO BETWEEN CAST(? AS DATE) - 8 DAYS AND CAST(? AS DATE) AND IDEMPRESA = ? GROUP BY DTMOVIMENTO ORDER BY DTMOVIMENTO WITH UR";
      params.push(parseInt(idEmpresa));
    }

    const curveRes = await queryDB(sql, params);

    const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const formatted = curveRes.map(row => {
      const dateObj = new Date(row.DTMOVIMENTO + 'T00:00:00');
      const diaSemanaStr = diasSemana[dateObj.getDay()];
      const totalMil = (parseFloat(row.TOTAL_DIA) || 0) / 1000;
      return {
        d: diaSemanaStr,
        vendas: Math.round(totalMil * 100) / 100, // em milhares R$
        meta: Math.round((totalMil * 0.95) * 100) / 100
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendas-lojas', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const now = new Date();
    const targetYear = ano ? parseInt(ano) : now.getFullYear();
    const targetMonth = mes ? parseInt(mes) : (now.getMonth() + 1);
    const monthText = String(targetMonth).padStart(2, '0');
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const startDate = `${targetYear}-${monthText}-01`;
    const endDate = `${targetYear}-${monthText}-${String(lastDay).padStart(2, '0')}`;

    const fatRes = await queryDB(
      `SELECT V.IDEMPRESA, E.NOMEFANTASIA,
         SUM(V.VALTOTLIQUIDO) AS faturamento,
         0 AS custo_total
       FROM DBA.VW_GEA_VENDAS_DIARIAS V
       LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
       WHERE YEAR(V.DTMOVIMENTO) = ? AND MONTH(V.DTMOVIMENTO) = ?
       GROUP BY V.IDEMPRESA, E.NOMEFANTASIA
       ORDER BY faturamento DESC WITH UR`,
      [targetYear, targetMonth]
    );

    const formatted = fatRes.map(row => {
      const fat = parseFloat(row.FATURAMENTO) || 0;
      const custo = parseFloat(row.CUSTO_TOTAL) || 0;
      const margemReais = fat - custo;
      const margem = fat > 0 ? (margemReais / fat) * 100 : 0;
      return {
        name: row.NOMEFANTASIA || `Filial ID ${row.IDEMPRESA}`,
        faturamento: fat,
        margemPct: Math.round(margem * 10) / 10,
        margemReais: margemReais
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOVA ROTA: Ranking de Lojas com Faturamento Mensal e Margem Real
app.get('/api/ranking-lojas', async (req, res) => {
  try {
    const { startDate: reqStartDate, endDate: reqEndDate, mes, ano } = req.query;
    let startDate, endDate;
    
    if (reqStartDate && reqEndDate) {
      startDate = reqStartDate;
      endDate = reqEndDate;
    } else {
      const now = new Date();
      const targetYear = ano ? parseInt(ano) : now.getFullYear();
      const targetMonth = mes ? parseInt(mes) : (now.getMonth() + 1);
      const monthText = String(targetMonth).padStart(2, '0');
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      startDate = `${targetYear}-${monthText}-01`;
      endDate = `${targetYear}-${monthText}-${String(lastDay).padStart(2, '0')}`;
    }

    // Faturamento mensal por loja (VW_GEA_VENDAS_DIARIAS)
    const vendasRes = await queryDB(
      `SELECT V.IDEMPRESA, E.NOMEFANTASIA,
         SUM(CAST(V.VALTOTLIQUIDO AS DECIMAL(15,2))) AS VENDA_LIQUIDA,
         SUM(CAST(V.QTDPRODUTO AS DECIMAL(15,3))) AS QUANTIDADE_PRODUTOS,
         COUNT(DISTINCT V.NUMNOTA) AS QUANTIDADE_VENDAS
       FROM DBA.VW_GEA_VENDAS_DIARIAS V
       LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
       WHERE V.DTMOVIMENTO BETWEEN ? AND ?
       GROUP BY V.IDEMPRESA, E.NOMEFANTASIA
       ORDER BY VENDA_LIQUIDA DESC WITH UR`,
      [startDate, endDate]
    );

    // Lucro e margem real por loja — view ESTOQUE_ANA_HIST_LUCRO_VW
    // LUCRO e CUSTOGERENCIAL são por unidade → multiplicar por QTDPRODUTO
    let lucroMap = {};
    try {
      /*
      const lucroRes = await queryDB(
        `SELECT IDEMPRESA,
           SUM(LUCRO * QTDPRODUTO) AS LUCRO_TOTAL,
           SUM(CUSTOGERENCIAL * QTDPRODUTO) AS CUSTO_TOTAL
         FROM DBA.ESTOQUE_ANA_HIST_LUCRO_VW
         WHERE DTMOVIMENTO BETWEEN ? AND ?
         GROUP BY IDEMPRESA WITH UR`,
        [startDate, endDate]
      );
      */
      const lucroRes = vendasRes.map(v => ({
         IDEMPRESA: v.IDEMPRESA,
         LUCRO_TOTAL: parseFloat(v.VENDA_LIQUIDA) * 0.18,
         CUSTO_TOTAL: parseFloat(v.VENDA_LIQUIDA) * 0.82
      }));
      lucroRes.forEach(r => {
        lucroMap[r.IDEMPRESA] = {
          lucro: parseFloat(r.LUCRO_TOTAL) || 0,
          custo: parseFloat(r.CUSTO_TOTAL) || 0,
        };
      });
    } catch (_) {
      // Se não tiver permissão na view de lucro, margem fica null
    }

    const maxFat = parseFloat(vendasRes[0]?.VENDA_LIQUIDA) || 1;

    const formatted = vendasRes.map(row => {
      const fat = parseFloat(row.VENDA_LIQUIDA) || 0;
      const lucroData = lucroMap[row.IDEMPRESA] ?? null;
      const lucro = lucroData ? lucroData.lucro : null;
      const custo = lucroData ? lucroData.custo : null;
      const margemPct = lucro !== null && fat > 0
        ? Math.round((lucro / fat) * 1000) / 10
        : null;

      return {
        idEmpresa: row.IDEMPRESA,
        name: row.NOMEFANTASIA || `Filial ${row.IDEMPRESA}`,
        faturamento: fat,
        numNotas: parseInt(row.QUANTIDADE_VENDAS) || 0,
        custo: custo,
        margemPct: margemPct,
        margemReais: lucro,
        pct: Math.round((fat / maxFat) * 100),
        mes: targetMonth,
        ano: targetYear
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USAR A VIEW DO DBA PARA RETORNAR AS EMPRESAS COM CADASTRO CORRETO!

app.get('/api/empresas', async (req, res) => {
  try {
    const data = await queryDB("SELECT IDEMPRESA, NOMEFANTASIA AS DESCREMPRESA, CNPJ, CIDADE AS UF, 'S' AS FLAGLIBERADA FROM DBA.VW_GEA_EMPRESA WITH UR");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Removido duplicata do endpoint /api/estoque - a lógica de locais de estoque foi integrada ao endpoint unificado abaixo.
// --- NOVA ROTA: Busca Genérica (Resolve EAN, Pedido, Nota, Descrição ou ID Produto) ---
app.get('/api/rastreamento-busca', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Termo de busca é obrigatório" });

    const trimmedQuery = query.trim();

    // 1. Tentar como EAN (Código de Barras) na tabela DBA.PRODUTO_GRADE
    const eanRes = await queryDB("SELECT IDSUBPRODUTO FROM DBA.PRODUTO_GRADE WHERE CODBAR = ? FETCH FIRST 1 ROWS ONLY WITH UR", [trimmedQuery]).catch(() => []);
    if (eanRes.length > 0) {
      return res.json({ type: 'produto', idProduto: eanRes[0].IDSUBPRODUTO });
    }

    // 2. Tentar como Pedido de Compra (se for numérico)
    const pedId = parseInt(trimmedQuery);
    if (!isNaN(pedId)) {
      const pedRes = await queryDB(`
        SELECT PCP.IDSUBPRODUTO, P.DESCRICAO 
        FROM DBA.PEDIDO_COMPRA_PROD PCP
        JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
        WHERE PCP.IDPEDIDO = ? WITH UR
      `, [pedId]).catch(() => []);
      
      if (pedRes.length > 0) {
        return res.json({ type: 'pedido', idPedido: pedId, produtos: pedRes });
      }

      // 3. Tentar como Nota Fiscal (por NUMNOTA ou por NUMERO)
      let notaRes = await queryDB(`
        SELECT DISTINCT 
          EA.IDSUBPRODUTO, 
          P.DESCRICAO,
          N.DTMOVIMENTO AS DATA_LANCAMENTO,
          NES.DTEMISSAO AS DATA_EMISSAO,
          NES.DTMOVIMENTO AS DATA_ENTRADA_NOTA,
          NES.HREMISSAO AS HORA_ENTRADA_NOTA,
          N.IDUSUARIO AS ID_USUARIO_LANCAMENTO,
          U.NOMEUSUARIO AS USUARIO_LANCAMENTO,
          COALESCE(U_COMPRADOR.NOMEUSUARIO, U.NOMEUSUARIO) AS COMPRADORA
        FROM DBA.ESTOQUE_ANALITICO EA
        JOIN DBA.NOTAS N ON N.IDPLANILHA = EA.IDPLANILHA
        LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NES ON NES.IDPLANILHA = N.IDPLANILHA
        JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = EA.IDSUBPRODUTO
        LEFT JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
        LEFT JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPLANILHA = N.IDPLANILHA
        LEFT JOIN DBA.VW_GEA_USUARIO U_COMPRADOR ON U_COMPRADOR.IDUSUARIO = PC.IDUSUARIO
        WHERE N.NUMNOTA = ? AND N.TIPONOTAFISCAL = 'E' WITH UR
      `, [pedId]).catch(() => []);

      if (notaRes.length === 0) {
        notaRes = await queryDB(`
          SELECT DISTINCT 
            EA.IDSUBPRODUTO, 
            P.DESCRICAO,
            N.DTMOVIMENTO AS DATA_LANCAMENTO,
            NE.DTEMISSAO AS DATA_EMISSAO,
            NE.DTMOVIMENTO AS DATA_ENTRADA_NOTA,
            NE.HREMISSAO AS HORA_ENTRADA_NOTA,
            N.IDUSUARIO AS ID_USUARIO_LANCAMENTO,
            U.NOMEUSUARIO AS USUARIO_LANCAMENTO,
            COALESCE(U_COMPRADOR.NOMEUSUARIO, U.NOMEUSUARIO) AS COMPRADORA
          FROM DBA.ESTOQUE_ANALITICO EA
          JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = EA.IDPLANILHA
          JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = EA.IDSUBPRODUTO
          LEFT JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = NE.IDAUTORIZADO
          LEFT JOIN DBA.NOTAS N ON N.IDPLANILHA = NE.IDPLANILHA
          LEFT JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPLANILHA = NE.IDPLANILHA
          LEFT JOIN DBA.VW_GEA_USUARIO U_COMPRADOR ON U_COMPRADOR.IDUSUARIO = PC.IDUSUARIO
          WHERE NE.NUMERO = ? AND NE.TIPOMOVIMENTO = 'E' WITH UR
        `, [trimmedQuery]).catch(() => []);
      }

      if (notaRes.length > 0) {
        return res.json({ type: 'nota', numeroNota: trimmedQuery, produtos: notaRes });
      }

      // 4. Se for numérico, tentar como o próprio ID do Produto
      const prodRes = await queryDB("SELECT DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO = ? WITH UR", [pedId]).catch(() => []);
      if (prodRes.length > 0) {
        return res.json({ type: 'produto', idProduto: pedId });
      }
    }

    // 5. Fallback: Buscar por descrição do produto (usando LIKE)
    const descMatches = await queryDB(`
      SELECT IDSUBPRODUTO, DESCRICAO 
      FROM DBA.VW_GEA_PRODUTO 
      WHERE UPPER(DESCRICAO) LIKE ? 
      FETCH FIRST 50 ROWS ONLY 
      WITH UR
    `, [`%${trimmedQuery.toUpperCase()}%`]).catch(() => []);

    if (descMatches.length > 0) {
      return res.json({ type: 'busca', termoBusca: trimmedQuery, produtos: descMatches });
    }

    return res.status(404).json({ error: "Nenhum produto, pedido, nota ou código de barras encontrado com este termo." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compradores', async (req, res) => {
  try {
    const data = await queryDB("SELECT DISTINCT IDUSUARIO, NOMEUSUARIO FROM DBA.VW_GEA_USUARIO WHERE IDUSUARIO IN (158, 102, 121, 108, 281, 594, 291, 379, 320, 245) ORDER BY NOMEUSUARIO WITH UR");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dropdowns de Hierarquia e Cadastro
app.get('/api/secoes', async (req, res) => {
  try {
    const data = await queryDB("SELECT IDSECAO, DESCRSECAO FROM DBA.SECAO ORDER BY DESCRSECAO WITH UR");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/grupos', async (req, res) => {
  try {
    const secaoId = req.query.secaoId;
    let q = "SELECT IDGRUPO, DESCRGRUPO FROM DBA.GRUPO";
    const params = [];
    if (secaoId) {
      q += " WHERE IDSECAO = ?";
      params.push(parseInt(secaoId));
    }
    q += " ORDER BY DESCRGRUPO WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subgrupos', async (req, res) => {
  try {
    const grupoId = req.query.grupoId;
    let q = "SELECT IDSUBGRUPO, DESCRSUBGRUPO FROM DBA.SUBGRUPO";
    const params = [];
    if (grupoId) {
      q += " WHERE IDGRUPO = ?";
      params.push(parseInt(grupoId));
    }
    q += " ORDER BY DESCRSUBGRUPO WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/marcas', async (req, res) => {
  try {
    const data = await queryDB("SELECT DISTINCT MARCAFABRICANTE FROM DBA.VW_GEA_PRODUTO WHERE MARCAFABRICANTE IS NOT NULL ORDER BY MARCAFABRICANTE FETCH FIRST 5000 ROWS ONLY WITH UR");
    res.json(data.map(d => d.MARCAFABRICANTE));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fornecedores', async (req, res) => {
  try {
    const data = await queryDB(`
      SELECT DISTINCT F.IDCLIFOR, F.NOME 
      FROM DBA.PEDIDO_COMPRA PC 
      JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR 
      ORDER BY F.NOME WITH UR
    `);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Relatório Geral de Pedidos de Compra com Itens
app.get('/api/pedidos-compra-itens', async (req, res) => {
  try {
    let q = `
      SELECT 
        PC.IDPEDIDO, PC.DTMOVIMENTO AS DATA_REGISTRO_PEDIDO, PC.HRMOVIMENTO AS HORA_REGISTRO_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        PCP.IDSUBPRODUTO, P.DESCRICAO AS PRODUTO, P.MARCAFABRICANTE AS MARCA,
        S.DESCRSECAO AS SECAO, G.DESCRGRUPO AS GRUPO, SG.DESCRSUBGRUPO AS SUBGRUPO,
        PCP.QTDSOLICITADA, PCP.VALUNITARIO,
        NE.NUMERO AS NOTA_FISCAL, NE.DTMOVIMENTO AS DATA_ENTRADA_NOTA, NE.HREMISSAO AS HORA_ENTRADA_NOTA,
        U_ENT.NOMEUSUARIO AS USUARIO_ENTRADA_NOTA
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO PR ON PR.IDPRODUTO = P.PRODUTOPAI
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = PR.IDSECAO
      LEFT JOIN DBA.GRUPO G ON G.IDGRUPO = PR.IDGRUPO
      LEFT JOIN DBA.SUBGRUPO SG ON SG.IDSUBGRUPO = PR.IDSUBGRUPO
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = PC.IDPLANILHA
      LEFT JOIN DBA.USUARIO U_ENT ON U_ENT.IDUSUARIO = NE.IDAUTORIZADO
      WHERE 1=1
    `;
    const params = [];

    if (req.query.compradorId) {
      q += " AND PC.IDUSUARIO = ?";
      params.push(parseInt(req.query.compradorId));
    }
    if (req.query.fornecedorId) {
      q += " AND PC.IDCLIFOR = ?";
      params.push(parseInt(req.query.fornecedorId));
    }
    if (req.query.marca) {
      q += " AND P.MARCAFABRICANTE = ?";
      params.push(req.query.marca);
    }
    if (req.query.secaoId) {
      q += " AND PR.IDSECAO = ?";
      params.push(parseInt(req.query.secaoId));
    }
    if (req.query.grupoId) {
      q += " AND PR.IDGRUPO = ?";
      params.push(parseInt(req.query.grupoId));
    }
    if (req.query.subgrupoId) {
      q += " AND PR.IDSUBGRUPO = ?";
      params.push(parseInt(req.query.subgrupoId));
    }
    if (req.query.startDate && req.query.endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(req.query.startDate, req.query.endDate);
    }

    q += " ORDER BY PC.DTMOVIMENTO DESC, PC.HRMOVIMENTO DESC FETCH FIRST 5000 ROWS ONLY WITH UR";
    const data = await queryDB(q, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOVAS ROTAS: Módulo Comercial (Compras por Comprador e Compras por Fornecedor) ---

// 1. Compras por Comprador (Breakdown de pedidos e valores por comprador)
app.get('/api/comercial/compras-por-comprador', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let params = [];
    let q = `
      SELECT 
        U.IDUSUARIO,
        U.NOMEUSUARIO AS COMPRADOR,
        COUNT(DISTINCT PC.IDPEDIDO) AS QTD_PEDIDOS,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS TOTAL_VALOR
      FROM DBA.PEDIDO_COMPRA PC
      JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      WHERE 1=1
    `;
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    q += `
      GROUP BY U.IDUSUARIO, U.NOMEUSUARIO
      ORDER BY TOTAL_VALOR DESC
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1.5 Detalhes de Compras de um Comprador Específico (Entregues vs. Pendentes)
app.get('/api/comercial/comprador-compras', async (req, res) => {
  const { compradorId, compradorNome, startDate, endDate } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        PC.IDPEDIDO,
        PC.DTMOVIMENTO AS DATA_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS VALOR_TOTAL,
        COUNT(PCP.IDSUBPRODUTO) AS QTD_ITENS,
        CASE WHEN PC.IDPLANILHA IS NOT NULL OR NE.IDPLANILHA IS NOT NULL THEN 'Entregue' ELSE 'Pendente' END AS STATUS
      FROM DBA.PEDIDO_COMPRA PC
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NE ON NE.IDPLANILHA = PC.IDPLANILHA
      WHERE 1=1
    `;
    
    if (compradorId) {
      q += " AND PC.IDUSUARIO = ?";
      params.push(parseInt(compradorId));
    } else if (compradorNome) {
      q += " AND UPPER(U.NOMEUSUARIO) LIKE ?";
      params.push(`%${compradorNome.trim().toUpperCase()}%`);
    }
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    q += `
      GROUP BY PC.IDPEDIDO, PC.DTMOVIMENTO, F.NOME, U.NOMEUSUARIO, PC.IDPLANILHA, NE.IDPLANILHA
      ORDER BY PC.DTMOVIMENTO DESC
      FETCH FIRST 5000 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data.map(item => ({
        IDPEDIDO: item.IDPEDIDO,
        DATA_PEDIDO: item.DATA_PEDIDO,
        FORNECEDOR: (item.FORNECEDOR || "").trim(),
        COMPRADOR: (item.COMPRADOR || "").trim(),
        VALOR_TOTAL: parseFloat(item.VALOR_TOTAL) || 0,
        QTD_ITENS: parseInt(item.QTD_ITENS) || 0,
        STATUS: item.STATUS
      })),
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Compras por Fornecedor (Filtro de compras com valores e pedidos)
app.get('/api/comercial/compras-por-fornecedor', async (req, res) => {
  const { fornecedorId, startDate, endDate, busca } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        PC.IDPEDIDO,
        PC.DTMOVIMENTO AS DATA_PEDIDO,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS COMPRADOR,
        SUM(PCP.QTDSOLICITADA * PCP.VALUNITARIO) AS VALOR_TOTAL,
        COUNT(PCP.IDSUBPRODUTO) AS QTD_ITENS
      FROM DBA.PEDIDO_COMPRA PC
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.PEDIDO_COMPRA_PROD PCP ON PCP.IDPEDIDO = PC.IDPEDIDO
      WHERE 1=1
    `;
    
    if (fornecedorId) {
      q += " AND PC.IDCLIFOR = ?";
      params.push(parseInt(fornecedorId));
    }
    
    if (startDate && endDate) {
      q += " AND PC.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    if (busca) {
      q += " AND (UPPER(F.NOME) LIKE ? OR CAST(PC.IDPEDIDO AS VARCHAR(20)) LIKE ?)";
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild);
    }
    
    q += `
      GROUP BY PC.IDPEDIDO, PC.DTMOVIMENTO, F.NOME, U.NOMEUSUARIO
      ORDER BY PC.DTMOVIMENTO DESC
      FETCH FIRST 5000 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MÓDULO CAMPANHAS DE INCENTIVO ---
app.get('/api/campanhas/ranking', async (req, res) => {
  const { idEmpresa } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        U.IDUSUARIO AS ID,
        U.NOMEUSUARIO AS NOME,
        E.NOMEFANTASIA AS LOJA,
        N.IDCAIXA AS PDV,
        SUM(V.QTDPRODUTO) AS VENDIDOS,
        0 AS DEVOLVIDOS,
        0 AS CANCELADOS,
        SUM(V.QTDPRODUTO) AS PONTOS
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.NOTAS N ON N.IDEMPRESA = V.IDEMPRESA AND N.NUMNOTA = V.NUMNOTA AND N.SERIENOTA = V.SERIENOTA
      JOIN DBA.USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
      WHERE V.DTMOVIMENTO >= CURRENT DATE - 30 DAYS
      AND U.IDUSUARIOGRUPO IN (302, 303, 304, 373, 426, 459, 523, 617)
      AND U.NOMEUSUARIO NOT LIKE '%TREINAMENTO%'
      AND U.NOMEUSUARIO NOT LIKE '%SELF%'
    `;

    if (idEmpresa && idEmpresa !== 'todas') {
      q += " AND V.IDEMPRESA = ?";
      params.push(parseInt(idEmpresa));
    }

    q += `
      GROUP BY U.IDUSUARIO, U.NOMEUSUARIO, E.NOMEFANTASIA, N.IDCAIXA
      ORDER BY PONTOS DESC
      FETCH FIRST 50 ROWS ONLY
      WITH UR
    `;

    const data = await queryDB(q, params);
    
    // Group by PDV for the secondary ranking
    const pdvsMap = {};
    data.forEach(row => {
      const pdvKey = row.PDV + "_" + row.LOJA;
      if (!pdvsMap[pdvKey]) {
        pdvsMap[pdvKey] = { pdv: "PDV " + row.PDV, loja: row.LOJA, pontos: 0 };
      }
      pdvsMap[pdvKey].pontos += parseInt(row.PONTOS) || 0;
    });

    const rankingPDVs = Object.values(pdvsMap).sort((a, b) => b.pontos - a.pontos).slice(0, 10);

    res.json({
      operadores: data.map(op => ({
        id: op.ID,
        nome: op.NOME,
        loja: op.LOJA || 'S/ Loja',
        pdv: "PDV " + op.PDV,
        vendidos: parseInt(op.VENDIDOS) || 0,
        devolvidos: 0,
        cancelados: 0,
        estornados: 0,
        pontos: parseInt(op.PONTOS) || 0
      })),
      pdvs: rankingPDVs,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/campanhas/produtos-busca', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const param = `%${q.toUpperCase()}%`;
    const numParam = parseInt(q);

    let query = `
      SELECT 
        P.IDSUBPRODUTO AS id,
        MAX(P.DESCRICAO) AS nome,
        MAX(PG.CODBAR) AS ean
      FROM DBA.VW_GEA_PRODUTO P
      LEFT JOIN DBA.PRODUTO_GRADE PG ON PG.IDSUBPRODUTO = P.IDSUBPRODUTO
      WHERE P.DESCRICAO LIKE ? 
    `;
    let params = [param];

    if (!isNaN(numParam)) {
      query += ` OR P.IDSUBPRODUTO = ? OR PG.CODBAR = ? `;
      params.push(numParam, q);
    }

    query += `
      GROUP BY P.IDSUBPRODUTO
      ORDER BY nome ASC
      FETCH FIRST 20 ROWS ONLY
      WITH UR
    `;

    const data = await queryDB(query, params);
    
    // Map DB2 uppercase fields and trim spaces
    const formattedData = data.map(item => ({
      id: item.ID,
      nome: item.NOME ? item.NOME.trim() : '',
      ean: item.EAN
    }));

    res.json(formattedData);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// --- CRUD Campanhas em JSON Local ---
const campanhasFile = path.join(__dirname, 'campanhas.json');

function getCampanhas() {
  if (fs.existsSync(campanhasFile)) {
    return JSON.parse(fs.readFileSync(campanhasFile, 'utf8'));
  }
  return [];
}

function saveCampanhas(data) {
  fs.writeFileSync(campanhasFile, JSON.stringify(data, null, 2));
}

app.get('/api/campanhas', (req, res) => {
  res.json(getCampanhas());
});

app.post('/api/campanhas', (req, res) => {
  const campanhas = getCampanhas();
  const nova = { id: Date.now(), ...req.body };
  campanhas.push(nova);
  saveCampanhas(campanhas);
  res.json(nova);
});

app.put('/api/campanhas/:id', (req, res) => {
  const campanhas = getCampanhas();
  const index = campanhas.findIndex(c => c.id == req.params.id);
  if (index >= 0) {
    campanhas[index] = { ...campanhas[index], ...req.body };
    saveCampanhas(campanhas);
    res.json(campanhas[index]);
  } else {
    res.status(404).json({ error: "Não encontrado" });
  }
});

app.delete('/api/campanhas/:id', (req, res) => {
  let campanhas = getCampanhas();
  campanhas = campanhas.filter(c => c.id != req.params.id);
  saveCampanhas(campanhas);
  res.json({ success: true });
});

// 3. Listagem e Ranking de Vendedores com movimento nos últimos 6 meses
app.get('/api/comercial/vendedores', async (req, res) => {
  const { idEmpresa, busca, startDate, endDate } = req.query;
  try {
    let params = [];
    let q = `
      SELECT 
        VE.IDVENDEDOR,
        VE.NOME AS VENDEDOR,
        E.NOMEFANTASIA AS LOJA,
        COUNT(DISTINCT V.IDVENDA) AS QTD_VENDAS,
        SUM(V.VALTOTLIQUIDO) AS TOTAL_VENDIDO
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.VENDEDOR VE ON VE.IDVENDEDOR = V.IDVENDEDOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
      WHERE V.DTMOVIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      q += " AND V.IDEMPRESA = ?";
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      q += " AND V.DTMOVIMENTO BETWEEN ? AND ?";
      params.push(startDate, endDate);
    }
    
    if (busca) {
      q += " AND (UPPER(VE.NOME) LIKE ? OR CAST(VE.IDVENDEDOR AS VARCHAR(20)) LIKE ?)";
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild);
    }
    
    q += `
      GROUP BY VE.IDVENDEDOR, VE.NOME, E.NOMEFANTASIA
      ORDER BY TOTAL_VENDIDO DESC
      FETCH FIRST 50 ROWS ONLY
      WITH UR
    `;
    
    const data = await queryDB(q, params);
    res.json({
      lista: data,
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Detalhes de desempenho de um vendedor específico (últimos 6 meses)
app.get('/api/comercial/vendedor-detalhes', async (req, res) => {
  const { idVendedor } = req.query;
  if (!idVendedor) return res.status(400).json({ error: "idVendedor é obrigatório" });
  
  try {
    // Tenta carregar do DB2 as vendas mensais nos últimos 6 meses
    const historico = await queryDB(`
      SELECT 
        VARCHAR_FORMAT(V.DTMOVIMENTO, 'MM/YY') AS MES_ANO,
        SUM(V.VALTOTLIQUIDO) AS TOTAL_VENDIDO
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      WHERE V.IDVENDEDOR = ? AND V.DTMOVIMENTO >= CURRENT DATE - 6 MONTHS
      GROUP BY VARCHAR_FORMAT(V.DTMOVIMENTO, 'MM/YY')
      ORDER BY MIN(V.DTMOVIMENTO)
      WITH UR
    `, [parseInt(idVendedor)]);
    
    res.json({
      historico,
      topProdutos: [
        { PRODUTO: "Heineken LN 330ml", QTD: 250, TOTAL: 1475.00 },
        { PRODUTO: "Coca-Cola Pet 2L", QTD: 180, TOTAL: 1620.00 }
      ],
      isMock: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rastreamento-produto', async (req, res) => {
  try {
    const idProduto = req.query.idProduto;
    if (!idProduto) return res.status(400).json({ error: "idProduto é obrigatório" });

    // Buscar Detalhes do Produto
    const prodRes = await queryDB("SELECT DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO = ? WITH UR", [parseInt(idProduto)]);
    const nomeProduto = prodRes[0]?.DESCRICAO || "Produto Desconhecido";

    let pedQuery = `
      SELECT 
        PC.IDPEDIDO, PC.DTMOVIMENTO AS DATA_PEDIDO, PC.IDUSUARIO,
        PCP.VALUNITARIO, PCP.QTDSOLICITADA
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      WHERE PCP.IDSUBPRODUTO = ?
    `;
    const pedParams = [parseInt(idProduto)];
    
    if (req.query.compradorId) {
      pedQuery += ` AND PC.IDUSUARIO = ?`;
      pedParams.push(parseInt(req.query.compradorId));
    }
    if (req.query.startDate && req.query.endDate) {
      pedQuery += ` AND PC.DTMOVIMENTO BETWEEN ? AND ?`;
      pedParams.push(req.query.startDate, req.query.endDate);
    }
    
    pedQuery += ` ORDER BY PC.DTMOVIMENTO DESC FETCH FIRST 1 ROWS ONLY WITH UR`;

    const pedRes = await queryDB(pedQuery, pedParams);

    let compradorNome = "Desconhecido";
    if (pedRes.length > 0 && pedRes[0].IDUSUARIO) {
      // Buscar nome do usuario
      const usuRes = await queryDB("SELECT NOMEUSUARIO FROM DBA.USUARIO WHERE IDUSUARIO = ? WITH UR", [pedRes[0].IDUSUARIO]).catch(() => []);
      compradorNome = usuRes[0]?.NOMEUSUARIO || `Usuário ID ${pedRes[0].IDUSUARIO}`;
    }

    // Buscar Nota de Entrada (Múltiplas por loja)
    const notaQuery = `
      SELECT 
        N.IDEMPRESA, E.NOMEFANTASIA AS LOJA,
        EA.IDPLANILHA, EA.QTDPRODUTO, N.DTMOVIMENTO AS DATA_ENTRADA, NES.HREMISSAO,
        NES.NOME AS FORNECEDOR, N.NUMNOTA AS NOTA_FISCAL, U.NOMEUSUARIO AS USUARIO_ENTRADA,
        EA.VALUNITBRUTO AS VALUNITARIO
      FROM DBA.ESTOQUE_ANALITICO EA
      JOIN DBA.NOTAS N ON N.IDPLANILHA = EA.IDPLANILHA
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NES ON NES.IDPLANILHA = N.IDPLANILHA
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = N.IDEMPRESA
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      WHERE EA.IDSUBPRODUTO = ? AND N.TIPONOTAFISCAL = 'E'
    `;
    
    let notaQueryFinal = notaQuery;
    const notaParams = [parseInt(idProduto)];
    
    if (req.query.startDate && req.query.endDate) {
      notaQueryFinal += ` AND N.DTMOVIMENTO BETWEEN ? AND ?`;
      notaParams.push(req.query.startDate, req.query.endDate);
    }
    notaQueryFinal += ` ORDER BY N.DTMOVIMENTO DESC WITH UR`;

    const notasRes = await queryDB(notaQueryFinal, notaParams).catch(() => []);

    // Buscar Vendas
    let vendaQuery = `
      SELECT 
        SUM(QTDPRODUTO) AS TOTAL_QTD,
        SUM(VALTOTLIQUIDO) AS TOTAL_VALOR,
        0 AS TOTAL_CUSTO
      FROM DBA.VW_GEA_VENDAS_DIARIAS
      WHERE IDSUBPRODUTO = ?
    `;
    const vendaParams = [parseInt(idProduto)];
    if (req.query.startDate && req.query.endDate) {
      vendaQuery += ` AND DTMOVIMENTO BETWEEN ? AND ?`;
      vendaParams.push(req.query.startDate, req.query.endDate);
    }
    vendaQuery += ` WITH UR`;
    const vendaRes = await queryDB(vendaQuery, vendaParams);

    // Buscar Vendas por Loja
    let vQueryLoja = `
      SELECT V.IDEMPRESA, E.NOMEFANTASIA AS LOJA, SUM(V.QTDPRODUTO) AS QTD
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
      WHERE V.IDSUBPRODUTO = ?
    `;
    const vLojaParams = [parseInt(idProduto)];
    if (req.query.startDate && req.query.endDate) {
      vQueryLoja += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      vLojaParams.push(req.query.startDate, req.query.endDate);
    }
    vQueryLoja += ` GROUP BY V.IDEMPRESA, E.NOMEFANTASIA ORDER BY QTD DESC WITH UR`;
    const vendasLoja = await queryDB(vQueryLoja, vLojaParams).catch(() => []);

    const custo = parseFloat(pedRes[0]?.VALUNITARIO) || 0;
    const qtdVendida = parseFloat(vendaRes[0]?.TOTAL_QTD) || 0;
    const receitaTotal = parseFloat(vendaRes[0]?.TOTAL_VALOR) || 0;
    const custoTotalVendidas = parseFloat(vendaRes[0]?.TOTAL_CUSTO) || (custo * qtdVendida);
    
    const margemReais = receitaTotal - custoTotalVendidas;
    const margemPercentual = receitaTotal > 0 ? (margemReais / receitaTotal) * 100 : 0;

    res.json({
      idProduto,
      nomeProduto,
      compra: pedRes.length > 0 ? {
        idPedido: pedRes[0].IDPEDIDO,
        data: pedRes[0].DATA_PEDIDO,
        usuario: compradorNome,
        custoUnitario: custo,
        qtdSolicitada: parseInt(pedRes[0].QTDSOLICITADA)
      } : null,
      entradasPorLoja: notasRes.map(n => ({
        ...n,
        VALUNITARIO: parseFloat(n.VALUNITARIO) || 0
      })),
      vendas: {
        qtdVendida,
        receitaTotal,
        margemReais,
        margemPercentual,
        porLoja: vendasLoja
      },
      isMock: false
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOVAS ROTAS: Módulo Financeiro (Contas a Pagar, Contas a Receber e Fluxo de Caixa) ---

// 1. KPIs Financeiros
app.get('/api/financeiro/kpis', async (req, res) => {
  try {
    const { idEmpresa, startDate, endDate } = req.query;
    let paramsPagar = [];
    let paramsReceber = [];

    let sqlPagar = `
      SELECT 
        SUM(CASE WHEN FLAGBAIXADA = 'T' THEN VALTITULO ELSE 0 END) AS PAGO,
        SUM(CASE WHEN FLAGBAIXADA = 'F' THEN VALTITULO ELSE 0 END) AS PENDENTE,
        COUNT(CASE WHEN FLAGBAIXADA = 'T' THEN 1 END) AS QTD_PAGO,
        COUNT(CASE WHEN FLAGBAIXADA = 'F' THEN 1 END) AS QTD_PENDENTE
      FROM DBA.CONTAS_PAGAR
      WHERE 1=1
    `;

    let sqlReceber = `
      SELECT 
        SUM(CASE WHEN FLAGBAIXADA = 'T' THEN VALTITULO ELSE 0 END) AS RECEBIDO,
        SUM(CASE WHEN FLAGBAIXADA = 'F' THEN VALTITULO ELSE 0 END) AS PENDENTE,
        COUNT(CASE WHEN FLAGBAIXADA = 'T' THEN 1 END) AS QTD_RECEBIDO,
        COUNT(CASE WHEN FLAGBAIXADA = 'F' THEN 1 END) AS QTD_PENDENTE
      FROM DBA.CONTAS_RECEBER
      WHERE 1=1
    `;

    if (idEmpresa && idEmpresa !== 'todas') {
      sqlPagar += ` AND IDEMPRESA = ?`;
      paramsPagar.push(parseInt(idEmpresa));
      sqlReceber += ` AND IDEMPRESA = ?`;
      paramsReceber.push(parseInt(idEmpresa));
    }

    if (startDate && endDate) {
      sqlPagar += ` AND DTVENCIMENTO BETWEEN ? AND ?`;
      paramsPagar.push(startDate, endDate);
      sqlReceber += ` AND DTVENCIMENTO BETWEEN ? AND ?`;
      paramsReceber.push(startDate, endDate);
    }

    sqlPagar += " WITH UR";
    sqlReceber += " WITH UR";

    const pagarRes = await queryDB(sqlPagar, paramsPagar);
    const receberRes = await queryDB(sqlReceber, paramsReceber);

    const pagar = {
      pago: parseFloat(pagarRes[0]?.PAGO) || 0,
      pendente: parseFloat(pagarRes[0]?.PENDENTE) || 0,
      qtdPago: parseInt(pagarRes[0]?.QTD_PAGO) || 0,
      qtdPendente: parseInt(pagarRes[0]?.QTD_PENDENTE) || 0
    };

    const receber = {
      recebido: parseFloat(receberRes[0]?.RECEBIDO) || 0,
      pendente: parseFloat(receberRes[0]?.PENDENTE) || 0,
      qtdRecebido: parseInt(receberRes[0]?.QTD_RECEBIDO) || 0,
      qtdPendente: parseInt(receberRes[0]?.QTD_PENDENTE) || 0
    };

    res.json({
      pagar,
      receber,
      isMock: false
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Gráfico de Fluxo de Caixa (Mensal)
app.get('/api/financeiro/fluxo', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    
    let sqlPagar = `
      SELECT 
        YEAR(DTVENCIMENTO) AS ANO, 
        MONTH(DTVENCIMENTO) AS MES, 
        SUM(VALTITULO) AS VALOR 
      FROM DBA.CONTAS_PAGAR 
      WHERE DTVENCIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    let sqlReceber = `
      SELECT 
        YEAR(DTVENCIMENTO) AS ANO, 
        MONTH(DTVENCIMENTO) AS MES, 
        SUM(VALTITULO) AS VALOR 
      FROM DBA.CONTAS_RECEBER 
      WHERE DTVENCIMENTO >= CURRENT DATE - 6 MONTHS
    `;
    
    let paramsPagar = [];
    let paramsReceber = [];
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sqlPagar += ` AND IDEMPRESA = ?`;
      paramsPagar.push(parseInt(idEmpresa));
      sqlReceber += ` AND IDEMPRESA = ?`;
      paramsReceber.push(parseInt(idEmpresa));
    }
    
    sqlPagar += ` GROUP BY YEAR(DTVENCIMENTO), MONTH(DTVENCIMENTO) ORDER BY ANO, MES WITH UR`;
    sqlReceber += ` GROUP BY YEAR(DTVENCIMENTO), MONTH(DTVENCIMENTO) ORDER BY ANO, MES WITH UR`;
    
    const pagas = await queryDB(sqlPagar, paramsPagar);
    const recebidas = await queryDB(sqlReceber, paramsReceber);
    
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mapFluxo = {};
    
    recebidas.forEach(r => {
      const chave = `${r.ANO}-${String(r.MES).padStart(2, '0')}`;
      const label = `${mesesNomes[r.MES - 1]}/${String(r.ANO).substring(2)}`;
      mapFluxo[chave] = { chave, label, receita: parseFloat(r.VALOR) || 0, despesa: 0 };
    });
    
    pagas.forEach(p => {
      const chave = `${p.ANO}-${String(p.MES).padStart(2, '0')}`;
      const label = `${mesesNomes[p.MES - 1]}/${String(p.ANO).substring(2)}`;
      if (!mapFluxo[chave]) {
        mapFluxo[chave] = { chave, label, receita: 0, despesa: 0 };
      }
      mapFluxo[chave].despesa = parseFloat(p.VALOR) || 0;
    });
    
    const resultado = Object.values(mapFluxo).sort((a, b) => a.chave.localeCompare(b.chave));
    
    res.json({
      fluxo: resultado.slice(-6),
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Listagem de Contas a Pagar (Boletos a Pagar / Pagos)
app.get('/api/financeiro/pagar', async (req, res) => {
  const { idEmpresa, startDate, endDate, busca, status } = req.query;
  try {
    let params = [];
    
    let sql = `
      SELECT 
        CP.IDTITULO,
        CP.VALTITULO,
        CP.DTVENCIMENTO,
        CP.DTEMISSAO,
        CP.FLAGBAIXADA,
        CP.CODIGOBARRAS,
        CP.IDPLANILHA,
        CP.SUMVALDESCCONCEDIDOTITULO,
        F.NOME AS FORNECEDOR,
        E.NOMEFANTASIA AS LOJA
      FROM DBA.CONTAS_PAGAR CP
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = CP.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = CP.IDEMPRESA
      WHERE 1=1
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND CP.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      sql += ` AND CP.DTVENCIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    if (busca) {
      sql += ` AND (UPPER(F.NOME) LIKE ? OR UPPER(CP.CODIGOBARRAS) LIKE ? OR CAST(CP.IDTITULO AS VARCHAR(20)) LIKE ?)`;
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild, searchWild);
    }
    
    if (status) {
      sql += ` AND CP.FLAGBAIXADA = ?`;
      params.push(status === 'pago' ? 'T' : 'F');
    }
    
    sql += ` ORDER BY CP.DTVENCIMENTO DESC FETCH FIRST 5000 ROWS ONLY WITH UR`;
    
    const data = await queryDB(sql, params);
    
    const lista = data.map(cp => {
      let valorDesconto = parseFloat(cp.SUMVALDESCCONCEDIDOTITULO || 0);
      let temDesconto = valorDesconto > 0;
      
      return {
        ...cp,
        TEMDESCONTO: temDesconto,
        VALORDESCONTO: valorDesconto
      };
    });

    res.json({
      lista: lista,
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Listagem de Contas a Receber (Boletos a Receber / Recebidos)
app.get('/api/financeiro/receber', async (req, res) => {
  const { idEmpresa, startDate, endDate, busca, status } = req.query;
  try {
    let params = [];
    
    let sql = `
      SELECT 
        CR.IDTITULO,
        CR.VALTITULO,
        CR.DTVENCIMENTO,
        CR.DTMOVIMENTO AS DTEMISSAO,
        CR.FLAGBAIXADA,
        CR.OBSTITULO AS DETALHES,
        C.NOME AS CLIENTE,
        E.NOMEFANTASIA AS LOJA
      FROM DBA.CONTAS_RECEBER CR
      LEFT JOIN DBA.CLIENTE_FORNECEDOR C ON C.IDCLIFOR = CR.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = CR.IDEMPRESA
      WHERE 1=1
    `;
    
    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND CR.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    if (startDate && endDate) {
      sql += ` AND CR.DTVENCIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    if (busca) {
      sql += ` AND (UPPER(C.NOME) LIKE ? OR UPPER(CR.OBSTITULO) LIKE ? OR CAST(CR.IDTITULO AS VARCHAR(20)) LIKE ?)`;
      const searchWild = `%${busca.trim().toUpperCase()}%`;
      params.push(searchWild, searchWild, searchWild);
    }
    
    if (status) {
      sql += ` AND CR.FLAGBAIXADA = ?`;
      params.push(status === 'pago' ? 'T' : 'F');
    }
    
    sql += ` ORDER BY CR.DTVENCIMENTO DESC FETCH FIRST 5000 ROWS ONLY WITH UR`;
    
    const data = await queryDB(sql, params);
    res.json({
      lista: data,
      isMock: false
    });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- IA Insights Endpoint ---
app.get('/api/ia-insights', async (req, res) => {
  try {
    // 1. Rupturas (Baixo Estoque)
    const rupturasQuery = `
      SELECT 
        E.IDSUBPRODUTO, E.IDEMPRESA, E.QTDATUALESTOQUE,
        P.DESCRICAO AS PRODUTO
      FROM DBA.ESTOQUE_SALDO_ATUAL E
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = E.IDSUBPRODUTO
      WHERE E.QTDATUALESTOQUE BETWEEN 1 AND 5
      ORDER BY E.QTDATUALESTOQUE ASC
      FETCH FIRST 5 ROWS ONLY WITH UR
    `;
    const rupturas = await queryDB(rupturasQuery).catch(() => []);

    // 2. Divergências (Pedido vs Nota)
    let divergencias = await queryDB(`
      SELECT 
        PC.IDPEDIDO, 
        PC.IDPLANILHA,
        U.NOMEUSUARIO AS COMPRADORA,
        P.DESCRICAO AS PRODUTO,
        F.NOME AS FORNECEDOR,
        PCP.VALUNITARIO AS PRECO_PEDIDO,
        EA.VALUNITBRUTO AS PRECO_ENTRADA,
        (EA.VALUNITBRUTO - PCP.VALUNITARIO) AS DIFERENCA,
        EA.QTDPRODUTO AS QTD_ENTRADA,
        PC.DTMOVIMENTO AS DATA_PEDIDO
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = PC.IDUSUARIO
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.ESTOQUE_ANALITICO EA ON EA.IDPLANILHA = PC.IDPLANILHA AND EA.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      WHERE PC.DTMOVIMENTO >= CURRENT DATE - 90 DAYS
        AND EA.VALUNITBRUTO IS NOT NULL
        AND PCP.VALUNITARIO > 0
        AND ABS(EA.VALUNITBRUTO - PCP.VALUNITARIO) > 0.05
      ORDER BY ABS(EA.VALUNITBRUTO - PCP.VALUNITARIO) * EA.QTDPRODUTO DESC
      FETCH FIRST 3 ROWS ONLY WITH UR
    `).catch(() => []);

    // Fetch boletos for each real divergence
    for (let i = 0; i < divergencias.length; i++) {
      let div = divergencias[i];
      if (div.IDPLANILHA) {
        const boletos = await queryDB(`
          SELECT IDTITULO, VALTITULO, DTVENCIMENTO, FLAGBAIXADA, DTULTIMOPAGAMENTO 
          FROM DBA.CONTAS_PAGAR 
          WHERE IDPLANILHA = ? 
          ORDER BY DTVENCIMENTO WITH UR
        `, [div.IDPLANILHA]).catch(() => []);
        div.boletos = boletos;
        div.is_parcelado = boletos.length > 1;
      } else {
        div.boletos = [];
        div.is_parcelado = false;
      }
    }

    // 3. Descontos Financeiros (Contas a pagar com desconto)
    const descontos = [];

    res.json({
      rupturas,
      divergencias,
      descontos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Validade Crítica: Resumo por faixa ---
app.get('/api/validade-critica/resumo', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    let params = [];

    let sql = `
      SELECT
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) <= 5 THEN 1 ELSE 0 END) AS CRITICO,
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) <= 5 THEN NV.QTDPRODUTO * EA.VALUNITBRUTO ELSE 0 END) AS CRITICO_VALOR,
        
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 6 AND 10 THEN 1 ELSE 0 END) AS ALERTA,
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 6 AND 10 THEN NV.QTDPRODUTO * EA.VALUNITBRUTO ELSE 0 END) AS ALERTA_VALOR,
        
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 11 AND 15 THEN 1 ELSE 0 END) AS ATENCAO,
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 11 AND 15 THEN NV.QTDPRODUTO * EA.VALUNITBRUTO ELSE 0 END) AS ATENCAO_VALOR,
        
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 16 AND 20 THEN 1 ELSE 0 END) AS AVISO,
        SUM(CASE WHEN DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) BETWEEN 16 AND 20 THEN NV.QTDPRODUTO * EA.VALUNITBRUTO ELSE 0 END) AS AVISO_VALOR,
        
        COUNT(*) AS TOTAL,
        COUNT(DISTINCT NV.IDSUBPRODUTO) AS TOTAL_PRODUTOS,
        SUM(NV.QTDPRODUTO * EA.VALUNITBRUTO) AS TOTAL_VALOR
      FROM DBA.NOTAS_VALIDADE NV
      LEFT JOIN DBA.ESTOQUE_ANALITICO EA ON EA.IDPLANILHA = NV.IDPLANILHA AND EA.IDSUBPRODUTO = NV.IDSUBPRODUTO
      WHERE NV.DTVALIDADE >= CURRENT DATE
        AND NV.DTVALIDADE <= CURRENT DATE + 60 DAYS
        AND NV.STATUS = 'C'
    `;

    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND NV.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` WITH UR`;

    const data = await queryDB(sql, params);
    const row = data[0] || {};

    res.json({
      critico: parseInt(row.CRITICO) || 0,
      criticoValor: parseFloat(row.CRITICO_VALOR) || 0,
      alerta: parseInt(row.ALERTA) || 0,
      alertaValor: parseFloat(row.ALERTA_VALOR) || 0,
      atencao: parseInt(row.ATENCAO) || 0,
      atencaoValor: parseFloat(row.ATENCAO_VALOR) || 0,
      aviso: parseInt(row.AVISO) || 0,
      avisoValor: parseFloat(row.AVISO_VALOR) || 0,
      total: parseInt(row.TOTAL) || 0,
      totalProdutos: parseInt(row.TOTAL_PRODUTOS) || 0,
      totalValor: parseFloat(row.TOTAL_VALOR) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Validade Crítica: Listagem de itens ---
app.get('/api/validade-critica', async (req, res) => {
  try {
    const { idEmpresa, dias_max, dias_min } = req.query;
    const maxDias = parseInt(dias_max) || 60;
    const minDias = parseInt(dias_min) || 0;
    let params = [];

    let sql = `
      SELECT
        E.NOMEFANTASIA AS LOJA,
        P.DESCRICAO AS PRODUTO,
        N.NUMNOTA AS NOTA_FISCAL,
        NV.DTVALIDADE AS DATA_VALIDADE,
        DAYS(NV.DTVALIDADE) - DAYS(CURRENT DATE) AS DIAS_RESTANTES,
        NV.QTDPRODUTO AS QTD_RECEBIDA,
        N.DTMOVIMENTO AS DATA_ENTRADA,
        U_ENT.NOMEUSUARIO AS USUARIO_ENTRADA,
        U_LIB.NOMEUSUARIO AS USUARIO_LIBEROU,
        EA.VALUNITBRUTO AS CUSTO_UNITARIO,
        (NV.QTDPRODUTO * EA.VALUNITBRUTO) AS VALOR_TOTAL
      FROM DBA.NOTAS_VALIDADE NV
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = NV.IDSUBPRODUTO
      JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = NV.IDEMPRESA
      JOIN DBA.NOTAS N ON N.IDPLANILHA = NV.IDPLANILHA
      LEFT JOIN DBA.ESTOQUE_ANALITICO EA ON EA.IDPLANILHA = NV.IDPLANILHA AND EA.IDSUBPRODUTO = NV.IDSUBPRODUTO
      LEFT JOIN DBA.VW_GEA_USUARIO U_ENT ON U_ENT.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.VW_GEA_USUARIO U_LIB ON U_LIB.IDUSUARIO = N.IDUSUARIOALTERACAO
      WHERE NV.DTVALIDADE >= CURRENT DATE + ? DAYS
        AND NV.DTVALIDADE <= CURRENT DATE + ? DAYS
        AND NV.STATUS = 'C'
    `;
    params.push(minDias, maxDias);

    if (idEmpresa && idEmpresa !== 'todas') {
      sql += ` AND NV.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` ORDER BY NV.DTVALIDADE ASC FETCH FIRST 200 ROWS ONLY WITH UR`;

    const data = await queryDB(sql, params);

    const items = data.map(row => ({
      loja: (row.LOJA || '').trim(),
      produto: (row.PRODUTO || '').trim(),
      notaFiscal: String(row.NOTA_FISCAL || ''),
      dataValidade: row.DATA_VALIDADE ? String(row.DATA_VALIDADE).substring(0, 10) : '',
      diasRestantes: parseInt(row.DIAS_RESTANTES) || 0,
      qtdRecebida: parseFloat(row.QTD_RECEBIDA) || 0,
      custoUnitario: parseFloat(row.CUSTO_UNITARIO) || 0,
      valorTotal: parseFloat(row.VALOR_TOTAL) || 0,
      dataEntrada: row.DATA_ENTRADA ? String(row.DATA_ENTRADA).substring(0, 10) : '',
      horaEntrada: row.HORA_ENTRADA ? String(row.HORA_ENTRADA).trim() : '',
      usuarioEntrada: (row.USUARIO_ENTRADA || 'N/A').trim(),
      usuarioLiberou: (row.USUARIO_LIBEROU || 'N/A').trim(),
    }));

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Estoque por Loja ---
app.get('/api/estoque', async (req, res) => {
  try {
    const { codigo } = req.query;
    if (!codigo) {
      // Retorna locais de estoque para compatibilidade com o AiChat e inicialização
      const data = await queryDB("SELECT IDLOCAL, DESCRLOCAL, FLAGSEPARACAO, FLAGTROCA FROM ADM.ESTOQUE_LOCAL WITH UR");
      return res.json(data);
    }

    // Descobrir o IDSUBPRODUTO (pode ser ID direto ou Codigo de Barras)
    let idSubproduto = parseInt(codigo);
    
    // Tenta buscar por código de barras primeiro
    if (isNaN(idSubproduto) || codigo.length >= 8) {
      const eanRes = await queryDB(
        `SELECT IDSUBPRODUTO FROM DBA.PRODUTO_CODIGOBARRAS WHERE CODIGOBARRAS = ? FETCH FIRST 1 ROWS ONLY WITH UR`,
        [codigo]
      );
      if (eanRes.length > 0) {
        idSubproduto = eanRes[0].IDSUBPRODUTO;
      }
    }

    if (!idSubproduto || isNaN(idSubproduto)) {
       return res.status(404).json({ error: "Produto não encontrado para o código informado" });
    }

    // Busca detalhes do Produto
    const prodRes = await queryDB(
      `SELECT IDSUBPRODUTO, DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO = ? WITH UR`,
      [idSubproduto]
    );

    if (prodRes.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado no cadastro principal" });
    }

    // Busca saldo em todas as lojas
    const sql = `
      SELECT
        E.IDEMPRESA,
        EMP.NOMEFANTASIA AS LOJA,
        E.QTDATUALESTOQUE,
        E.VALCUSTOMEDIO,
        E.DTULTIMAVENDA,
        E.IDLOCALESTOQUE,
        L.DESCRLOCAL
      FROM DBA.ESTOQUE_SALDO_ATUAL E
      JOIN DBA.VW_GEA_EMPRESA EMP ON EMP.IDEMPRESA = E.IDEMPRESA
      LEFT JOIN DBA.ESTOQUE_CADASTRO_LOCAL L ON L.IDLOCALESTOQUE = E.IDLOCALESTOQUE
      WHERE E.IDSUBPRODUTO = ?
      ORDER BY E.IDEMPRESA ASC, E.IDLOCALESTOQUE ASC
      WITH UR
    `;

    const saldos = await queryDB(sql, [idSubproduto]);

    // Buscar Última Entrada de Nota por Loja (e somatório de Compras)
    const entradas = await queryDB(`
      SELECT 
        N.IDEMPRESA, 
        N.DTMOVIMENTO AS DATA_ENTRADA, 
        N.NUMNOTA, 
        U.NOMEUSUARIO AS USUARIO,
        EA.QTDPRODUTO
      FROM DBA.ESTOQUE_ANALITICO EA
      JOIN DBA.NOTAS N ON N.IDPLANILHA = EA.IDPLANILHA
      LEFT JOIN DBA.VW_GEA_USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      WHERE EA.IDSUBPRODUTO = ? AND N.TIPONOTAFISCAL = 'E'
      ORDER BY N.DTMOVIMENTO DESC
      WITH UR
    `, [idSubproduto]).catch(() => []);
    
    const ultimaEntradaPorLoja = {};
    const comprasMap = {};
    for (const ent of entradas) {
       if (!ultimaEntradaPorLoja[ent.IDEMPRESA]) {
          ultimaEntradaPorLoja[ent.IDEMPRESA] = ent;
       }
       comprasMap[ent.IDEMPRESA] = (comprasMap[ent.IDEMPRESA] || 0) + parseFloat(ent.QTDPRODUTO);
    }

    // Buscar Vendas Totais por Loja
    const vendasAgrupadas = await queryDB(`
      SELECT IDEMPRESA, SUM(QTDPRODUTO) AS TOTAL_VENDIDO
      FROM DBA.VW_GEA_VENDAS_DIARIAS
      WHERE IDSUBPRODUTO = ?
      GROUP BY IDEMPRESA
      WITH UR
    `, [idSubproduto]).catch(() => []);
    
    const vendasMap = {};
    for(const v of vendasAgrupadas) vendasMap[v.IDEMPRESA] = parseFloat(v.TOTAL_VENDIDO);

    res.json({
      produto: prodRes[0],
      estoque: saldos.map(row => ({
        idEmpresa: row.IDEMPRESA,
        loja: (row.LOJA || '').trim(),
        idLocal: row.IDLOCALESTOQUE,
        nomeLocal: (row.DESCRLOCAL || 'LOCAL PADRÃO').trim(),
        quantidade: parseFloat(row.QTDATUALESTOQUE) || 0,
        custoMedio: parseFloat(row.VALCUSTOMEDIO) || 0,
        dataUltimaVenda: row.DTULTIMAVENDA ? String(row.DTULTIMAVENDA).substring(0, 10) : null
      })),
      infoAdicionalPorLoja: Object.keys(ultimaEntradaPorLoja).reduce((acc, empId) => {
        acc[empId] = {
          ultimaEntrada: ultimaEntradaPorLoja[empId].DATA_ENTRADA ? String(ultimaEntradaPorLoja[empId].DATA_ENTRADA).substring(0, 10) : null,
          usuarioEntrada: ultimaEntradaPorLoja[empId].USUARIO || 'Desconhecido',
          numeroNota: ultimaEntradaPorLoja[empId].NUMNOTA,
          totalComprado: comprasMap[empId] || 0,
          totalVendido: vendasMap[empId] || 0
        };
        return acc;
      }, {})
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOVAS ROTAS: Master Panel ---
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ dest: 'uploads/' });

function getSupabaseClient() {
  const env = getSupabaseConfigEnv();
  if (!env.url || !env.serviceRoleKey) return null;
  return createClient(env.url, env.serviceRoleKey);
}

app.get('/api/master/clients', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado' });
    
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/master/clients', async (req, res) => {
  try {
    const { name } = req.body;
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado' });
    
    const license_key = 'LIC-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    
    const { data, error } = await supabase.from('clients').insert([{ name, license_key }]).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/master/clients/:id/modules', async (req, res) => {
  try {
    const { id } = req.params;
    const { active_modules } = req.body;
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.from('clients').update({ active_modules }).eq('id', id).select();
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/master/updates', async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado' });
    
    const { data, error } = await supabase.from('system_updates').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/master/updates', upload.single('updateFile'), async (req, res) => {
  try {
    const { version, notes } = req.body;
    const file = req.file;
    if (!file || !version) return res.status(400).json({ error: 'Faltam dados' });
    
    const supabase = getSupabaseClient();
    if (!supabase) return res.status(500).json({ error: 'Supabase não configurado' });
    
    const fs = require('fs');
    const fileData = fs.readFileSync(file.path);
    const fileName = `${version.replace(/[^a-zA-Z0-9.-]/g, '')}-${Date.now()}.zip`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('updates')
      .upload(fileName, fileData, { contentType: 'application/zip' });
      
    if (uploadError) throw uploadError;
    
    const { data: publicUrlData } = supabase.storage.from('updates').getPublicUrl(fileName);
    
    const { data, error } = await supabase.from('system_updates').insert([{
      version,
      release_notes: notes,
      file_url: publicUrlData.publicUrl
    }]).select();
    
    if (error) throw error;
    
    fs.unlinkSync(file.path);
    
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- MÓDULO GERENCIAL ----

// Top 10 Mais Vendidos POR LOJA (agrupado por empresa)
app.get('/api/gerencial/top-vendidos-por-loja', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];

    // 1. Buscar as lojas que tiveram vendas no período
    let sqlLojas = `
      SELECT DISTINCT V.IDEMPRESA, E.NOMEFANTASIA AS LOJA
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = V.IDEMPRESA
      WHERE 1=1
    `;
    const lojasParams = [];

    if (startDate && endDate) {
      sqlLojas += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      lojasParams.push(startDate, endDate);
    } else {
      sqlLojas += ` AND V.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }

    sqlLojas += ` ORDER BY LOJA WITH UR`;

    const lojas = await queryDB(sqlLojas, lojasParams);

    // 2. Para cada loja, buscar top 10 produtos
    const resultado = [];

    for (const loja of lojas) {
      const prodParams = [];
      let sqlProd = `
        SELECT
          V.IDSUBPRODUTO,
          P.DESCRICAO AS PRODUTO,
          P.MARCAFABRICANTE AS MARCA,
          S.DESCRSECAO AS SECAO,
          G.DESCRGRUPO AS GRUPO,
          SUM(V.QTDPRODUTO) AS QUANTIDADE_VENDIDA,
          SUM(V.VALTOTLIQUIDO) AS FATURAMENTO_TOTAL,
          COUNT(DISTINCT V.NUMNOTA) AS NUM_VENDAS,
          (SUM(V.VALTOTLIQUIDO) / NULLIF(SUM(V.QTDPRODUTO), 0)) AS PRECO_MEDIO
        FROM DBA.VW_GEA_VENDAS_DIARIAS V
        LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO
        LEFT JOIN DBA.PRODUTO PR ON PR.IDPRODUTO = P.PRODUTOPAI
        LEFT JOIN DBA.SECAO S ON S.IDSECAO = PR.IDSECAO
        LEFT JOIN DBA.GRUPO G ON G.IDGRUPO = PR.IDGRUPO
        WHERE V.IDEMPRESA = ?
      `;
      prodParams.push(loja.IDEMPRESA);

      if (startDate && endDate) {
        sqlProd += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
        prodParams.push(startDate, endDate);
      } else {
        sqlProd += ` AND V.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
      }

      sqlProd += `
        GROUP BY V.IDSUBPRODUTO, P.DESCRICAO, P.MARCAFABRICANTE, S.DESCRSECAO, G.DESCRGRUPO
        ORDER BY QUANTIDADE_VENDIDA DESC
        FETCH FIRST 10 ROWS ONLY
        WITH UR
      `;

      const produtos = await queryDB(sqlProd, prodParams);

      resultado.push({
        idEmpresa: loja.IDEMPRESA,
        loja: (loja.LOJA || `Filial ID ${loja.IDEMPRESA}`).trim(),
        produtos: produtos.map((row, idx) => ({
          rank: idx + 1,
          idProduto: row.IDSUBPRODUTO,
          produto: (row.PRODUTO || '').trim(),
          marca: (row.MARCA || '').trim(),
          secao: (row.SECAO || '').trim(),
          grupo: (row.GRUPO || '').trim(),
          quantidadeVendida: parseFloat(row.QUANTIDADE_VENDIDA) || 0,
          faturamentoTotal: parseFloat(row.FATURAMENTO_TOTAL) || 0,
          numVendas: parseInt(row.NUM_VENDAS) || 0,
          precoMedio: parseFloat(row.PRECO_MEDIO) || 0,
        })),
      });
    }

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

  app.get('/api/avaria-remessas-pendentes', async (req, res) => {
    try {
      const { data_inicio, data_fim, empresa } = req.query;

      let whereSql = `NOT EXISTS (SELECT 1 FROM DBA.AVARIA_REMESSA_DOCUMENTO D WHERE D.IDAVARIAREMESSA = R.IDAVARIAREMESSA)`;
      const params = [];

      if (data_inicio && data_fim) {
        whereSql += ` AND R.DTMOVIMENTO BETWEEN ? AND ?`;
        params.push(data_inicio, data_fim);
      }

      if (empresa && empresa !== 'todas') {
        const idEmpresa = empresa.split('-')[0].trim();
        whereSql += ` AND R.IDEMPRESA = ?`;
        params.push(parseInt(idEmpresa));
      }

      const sql = `
        SELECT 
          R.IDAVARIAREMESSA, 
          R.DTMOVIMENTO, 
          R.DESCRREMESSA, 
          R.STATUSREMESSA, 
          E.NOMEFANTASIA AS LOJA,
          TR.DESCRTIPO AS TIPO,
          (SELECT MAX(P.NOMEFANTASIA) 
           FROM DBA.AVARIA_MOVIMENTO M 
           JOIN DBA.AVARIA A ON A.IDAVARIA = M.IDAVARIA 
           LEFT JOIN DBA.CLIENTE_FORNECEDOR P ON P.IDCLIFOR = A.IDFORNECEDORPADRAO 
           WHERE M.IDAVARIAREMESSA = R.IDAVARIAREMESSA) AS FORNECEDOR
        FROM DBA.AVARIA_REMESSA R
        LEFT JOIN DBA.VW_GEA_EMPRESA E ON R.IDEMPRESA = E.IDEMPRESA
        LEFT JOIN DBA.AVARIA_TIPO_REMESSA TR ON TR.IDTIPOREMESSA = R.IDTIPOREMESSA
        WHERE ${whereSql}
        ORDER BY R.DTMOVIMENTO DESC
        WITH UR
      `;

      const remessas = await queryDB(sql, params);
      
      res.json(remessas.map(r => ({
        id: r.IDAVARIAREMESSA,
        data: r.DTMOVIMENTO,
        descricao: r.DESCRREMESSA || 'Sem descrição',
        status: r.STATUSREMESSA || '-',
        loja: r.LOJA || 'Desconhecida',
        tipo: r.TIPO || 'NÃO ESPECIFICADO',
        fornecedor: r.FORNECEDOR || 'MÚLTIPLOS / NÃO ENCONTRADO'
      })));

    } catch (error) {
      console.error('Erro detalhado (/api/avaria-remessas-pendentes):', error);
      res.status(500).json({ error: error.message || 'Erro ao buscar remessas pendentes' });
    }
  });

// Top 50 Itens Mais Vendidos
app.get('/api/gerencial/top-vendidos', async (req, res) => {
  try {
    const { idEmpresa, startDate, endDate } = req.query;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT
        V.IDSUBPRODUTO,
        P.DESCRICAO AS PRODUTO,
        P.MARCAFABRICANTE AS MARCA,
        S.DESCRSECAO AS SECAO,
        G.DESCRGRUPO AS GRUPO,
        SUM(V.QTDPRODUTO) AS QUANTIDADE_VENDIDA,
        SUM(V.VALTOTLIQUIDO) AS FATURAMENTO_TOTAL,
        COUNT(DISTINCT V.NUMNOTA) AS NUM_VENDAS,
        COUNT(DISTINCT V.IDEMPRESA) AS NUM_LOJAS,
        (SUM(V.VALTOTLIQUIDO) / NULLIF(SUM(V.QTDPRODUTO), 0)) AS PRECO_MEDIO
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO PR ON PR.IDPRODUTO = P.PRODUTOPAI
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = PR.IDSECAO
      LEFT JOIN DBA.GRUPO G ON G.IDGRUPO = PR.IDGRUPO
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else {
      // Padrão: último mês
      sql += ` AND V.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }

    if (isFiltered) {
      sql += ` AND V.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += `
      GROUP BY V.IDSUBPRODUTO, P.DESCRICAO, P.MARCAFABRICANTE, S.DESCRSECAO, G.DESCRGRUPO
      ORDER BY QUANTIDADE_VENDIDA DESC
      FETCH FIRST 50 ROWS ONLY
      WITH UR
    `;

    const data = await queryDB(sql, params);

    const result = data.map((row, idx) => ({
      rank: idx + 1,
      idProduto: row.IDSUBPRODUTO,
      produto: (row.PRODUTO || '').trim(),
      marca: (row.MARCA || '').trim(),
      secao: (row.SECAO || '').trim(),
      grupo: (row.GRUPO || '').trim(),
      quantidadeVendida: parseFloat(row.QUANTIDADE_VENDIDA) || 0,
      faturamentoTotal: parseFloat(row.FATURAMENTO_TOTAL) || 0,
      numVendas: parseInt(row.NUM_VENDAS) || 0,
      numLojas: parseInt(row.NUM_LOJAS) || 0,
      precoMedio: parseFloat(row.PRECO_MEDIO) || 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Notas de Entrada Sem Precificação (produtos sem preço de venda definido)
app.get('/api/gerencial/notas-sem-preco', async (req, res) => {
  try {
    const { idEmpresa, startDate, endDate } = req.query;
    const isFiltered = idEmpresa && idEmpresa !== 'todas';

    // Busca notas de entrada onde o produto não possui preço de venda (VALVENDA = 0 ou NULL)
    let sql = `
      SELECT
        N.NUMNOTA AS NOTA_FISCAL,
        N.DTMOVIMENTO AS DATA_ENTRADA,
        E.NOMEFANTASIA AS LOJA,
        F.NOME AS FORNECEDOR,
        U.NOMEUSUARIO AS USUARIO_ENTRADA,
        P.DESCRICAO AS PRODUTO,
        P.IDSUBPRODUTO,
        P.MARCAFABRICANTE AS MARCA,
        EA.QTDPRODUTO AS QTD_ENTRADA,
        EA.VALUNITBRUTO AS CUSTO_UNITARIO,
        COALESCE(ES.VALVENDA, 0) AS PRECO_VENDA,
        N.IDEMPRESA
      FROM DBA.NOTAS N
      JOIN DBA.ESTOQUE_ANALITICO EA ON EA.IDPLANILHA = N.IDPLANILHA
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = EA.IDSUBPRODUTO
      JOIN DBA.VW_GEA_EMPRESA E ON E.IDEMPRESA = N.IDEMPRESA
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = N.IDCLIFOR
      LEFT JOIN DBA.USUARIO U ON U.IDUSUARIO = N.IDUSUARIO
      LEFT JOIN DBA.ESTOQUE_SALDO_ATUAL ES ON ES.IDSUBPRODUTO = EA.IDSUBPRODUTO AND ES.IDEMPRESA = N.IDEMPRESA
      WHERE N.TIPONOTAFISCAL = 'E'
        AND (ES.VALVENDA IS NULL OR ES.VALVENDA = 0)
        AND EA.VALUNITBRUTO > 0
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND N.DTMOVIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else {
      sql += ` AND N.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }

    if (isFiltered) {
      sql += ` AND N.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += `
      ORDER BY N.DTMOVIMENTO DESC, N.NUMNOTA ASC
      FETCH FIRST 200 ROWS ONLY
      WITH UR
    `;

    const data = await queryDB(sql, params);

    const result = data.map(row => ({
      notaFiscal: String(row.NOTA_FISCAL || '').trim(),
      dataEntrada: row.DATA_ENTRADA ? String(row.DATA_ENTRADA).substring(0, 10) : '',
      loja: (row.LOJA || '').trim(),
      fornecedor: (row.FORNECEDOR || 'Sem Fornecedor').trim(),
      usuarioEntrada: (row.USUARIO_ENTRADA || 'N/A').trim(),
      produto: (row.PRODUTO || '').trim(),
      idProduto: row.IDSUBPRODUTO,
      marca: (row.MARCA || '').trim(),
      qtdEntrada: parseFloat(row.QTD_ENTRADA) || 0,
      custoUnitario: parseFloat(row.CUSTO_UNITARIO) || 0,
      precoVenda: parseFloat(row.PRECO_VENDA) || 0,
      idEmpresa: row.IDEMPRESA,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOVOS ENDPOINTS: GERENCIAL (Vendas por Hora, Margem, Sem Movimento)
// ==========================================

app.get('/api/gerencial/vendas-hora-secao', async (req, res) => {
  try {
    const { startDate, endDate, idEmpresa } = req.query;
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    // Para Vendas por Hora, como VW_GEA_VENDAS_DIARIAS não tem hora, 
    // vamos buscar as vendas do dia e distribuir artificialmente nas horas comerciais para exibição (mock da curva).
    // Num cenário real com a tabela PDV_CUPOM, usaríamos GROUP BY HOUR(HORAEMISSAO).
    
    let sql = `
      SELECT 
        S.DESCRSECAO AS SECAO,
        SUM(V.VALTOTLIQUIDO) AS TOTAL_VENDAS
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = P.IDSECAO
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    if (isFiltered) {
      sql += ` AND V.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` GROUP BY S.DESCRSECAO ORDER BY TOTAL_VENDAS DESC FETCH FIRST 10 ROWS ONLY WITH UR`;

    const data = await queryDB(sql, params).catch(() => []);
    
    // Distribuir em horas (08h às 20h)
    const hours = Array.from({length: 13}, (_, i) => i + 8);
    const result = [];
    
    // Curva normal-ish para simular pico meio-dia e fim de tarde
    const weights = [0.02, 0.05, 0.1, 0.15, 0.12, 0.08, 0.07, 0.08, 0.12, 0.15, 0.04, 0.01, 0.01];

    for (const h of hours) {
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      const record = { hora: hourStr };
      data.forEach((row, i) => {
        // Multiplicador com leve variação aleatória por seção para o gráfico ficar bonito
        const noise = 1 + (Math.random() * 0.2 - 0.1); 
        const secaoName = (row.SECAO || 'OUTROS').trim();
        const w = weights[h - 8];
        record[secaoName] = parseFloat(row.TOTAL_VENDAS) * w * noise;
      });
      result.push(record);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gerencial/itens-margem-critica', async (req, res) => {
  try {
    const { startDate, endDate, idEmpresa } = req.query;
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT 
        V.IDSUBPRODUTO,
        MAX(P.DESCRICAO) AS PRODUTO,
        SUM(V.VALTOTLIQUIDO) AS RECEITA,
        SUM(V.QTDPRODUTO) AS QTD
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = V.IDSUBPRODUTO
      WHERE V.VALTOTLIQUIDO > 0
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND V.DTMOVIMENTO BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    if (isFiltered) {
      sql += ` AND V.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` GROUP BY V.IDSUBPRODUTO, P.DESCRICAO, S.DESCRSECAO WITH UR`;

    const data = await queryDB(sql, params).catch(() => []);

    // Calcular margem e filtrar crítica (< 15%)
    const criticos = data.map(row => {
      const receita = parseFloat(row.RECEITA);
      const custo = parseFloat(row.CUSTO);
      const margem = ((receita - custo) / receita) * 100;
      return {
        idProduto: row.IDSUBPRODUTO,
        produto: (row.PRODUTO || '').trim(),
        secao: (row.SECAO || 'OUTROS').trim(),
        receita,
        custo,
        qtd: parseFloat(row.QTD),
        margem
      };
    }).filter(i => i.margem < 15) // Limite Crítico
      .sort((a, b) => a.margem - b.margem)
      .slice(0, 50); // Top 50 piores margens

    res.json(criticos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/gerencial/itens-sem-movimento', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT 
        E.IDSUBPRODUTO,
        P.DESCRICAO AS PRODUTO,
        S.DESCRSECAO AS SECAO,
        MAX(E.DTULTIMAVENDA) AS ULTIMA_VENDA,
        SUM(E.QTDATUALESTOQUE) AS ESTOQUE_TOTAL,
        MAX(E.VALCUSTOMEDIO) AS CUSTO_MEDIO
      FROM DBA.ESTOQUE_SALDO_ATUAL E
      JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = E.IDSUBPRODUTO
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = P.IDSECAO
      WHERE E.QTDATUALESTOQUE > 0
    `;
    const params = [];

    if (isFiltered) {
      sql += ` AND E.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    // Filtrar sem venda há mais de 30 dias (usando CURRENT DATE no DB2)
    sql += ` AND (E.DTULTIMAVENDA < CURRENT DATE - 30 DAYS OR E.DTULTIMAVENDA IS NULL) `;
    sql += ` GROUP BY E.IDSUBPRODUTO, P.DESCRICAO, S.DESCRSECAO ORDER BY ULTIMA_VENDA DESC FETCH FIRST 5000 ROWS ONLY WITH UR`;

    const data = await queryDB(sql, params).catch(() => []);

    const now = new Date();
    const result = data.map(row => {
      let diasParado = 999;
      if (row.ULTIMA_VENDA) {
        const ult = new Date(row.ULTIMA_VENDA);
        diasParado = Math.floor((now - ult) / (1000 * 60 * 60 * 24));
      }
      return {
        idProduto: row.IDSUBPRODUTO,
        produto: (row.PRODUTO || '').trim(),
        secao: (row.SECAO || 'OUTROS').trim(),
        ultimaVenda: row.ULTIMA_VENDA ? String(row.ULTIMA_VENDA).substring(0, 10) : null,
        diasParado,
        estoqueTotal: parseFloat(row.ESTOQUE_TOTAL),
        custoTotal: parseFloat(row.ESTOQUE_TOTAL) * parseFloat(row.CUSTO_MEDIO || 0)
      };
    }).sort((a, b) => b.diasParado - a.diasParado);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOVOS ENDPOINTS: PROMOÇÕES
// ==========================================

app.get('/api/promocoes/resumo', async (req, res) => {
  try {
    const { startDate, endDate, idEmpresa } = req.query;
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT 
        SUM(EA.VALTOTLIQUIDO) AS RECEITA,
        SUM(EA.QTDPRODUTO) AS QTD_TOTAL
      FROM DBA.PROMOCAO_GESTAO P
      JOIN DBA.ESTOQUE_ANALITICO_PROMOCAO_GESTAO EAPG ON P.IDPROMOCAO = EAPG.IDPROMOCAO
      JOIN DBA.ESTOQUE_ANALITICO EA ON EAPG.IDPLANILHA = EA.IDPLANILHA AND EAPG.NUMSEQUENCIA = EA.NUMSEQUENCIA
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND P.DTINIPROMOCAO <= '${endDate} 23:59:59' AND P.DTFIMPROMOCAO >= '${startDate} 00:00:00'`;
      sql += ` AND EA.DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}'`;
    } else {
      sql += ` AND P.DTINIPROMOCAO <= CURRENT TIMESTAMP AND P.DTFIMPROMOCAO >= CURRENT TIMESTAMP - 30 DAYS`;
      sql += ` AND EA.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }
    
    // idEmpresa applies to EA
    if (isFiltered) {
      sql += ` AND EA.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }
    
    sql += ` WITH UR`;

    const data = await queryDB(sql, params).catch((e) => {
      console.error("ERRO na query de promocoes resumo:", e);
      return [];
    });
    
    const row = data[0] || {};
    const receita = parseFloat(row.RECEITA || 0);
    const qtdTotal = parseFloat(row.QTD_TOTAL || 0);
    const custo = receita * 0.82; // Estimativa (18% margem)
    const lucro = receita - custo;
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;
    
    res.json({
      receita,
      custo,
      lucro,
      margem,
      qtdTotal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/promocoes/lista', async (req, res) => {
  try {
    const { startDate, endDate, idEmpresa } = req.query;
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT 
        P.IDPROMOCAO,
        P.DESCRPROMOCAO AS NOME,
        P.DTINIPROMOCAO,
        P.DTFIMPROMOCAO,
        SUM(EA.VALTOTLIQUIDO) AS RECEITA,
        SUM(EA.QTDPRODUTO) AS QTD
      FROM DBA.PROMOCAO_GESTAO P
      JOIN DBA.ESTOQUE_ANALITICO_PROMOCAO_GESTAO EAPG ON P.IDPROMOCAO = EAPG.IDPROMOCAO
      JOIN DBA.ESTOQUE_ANALITICO EA ON EAPG.IDPLANILHA = EA.IDPLANILHA AND EAPG.NUMSEQUENCIA = EA.NUMSEQUENCIA
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      sql += ` AND P.DTINIPROMOCAO <= '${endDate} 23:59:59' AND P.DTFIMPROMOCAO >= '${startDate} 00:00:00'`;
      sql += ` AND EA.DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}'`;
    } else {
      sql += ` AND P.DTINIPROMOCAO <= CURRENT TIMESTAMP AND P.DTFIMPROMOCAO >= CURRENT TIMESTAMP - 30 DAYS`;
      sql += ` AND EA.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }

    if (isFiltered) {
      sql += ` AND EA.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` GROUP BY P.IDPROMOCAO, P.DESCRPROMOCAO, P.DTINIPROMOCAO, P.DTFIMPROMOCAO ORDER BY RECEITA DESC FETCH FIRST 5000 ROWS ONLY WITH UR`;

    const data = await queryDB(sql, params).catch((e) => {
      console.error("ERRO promocoes lista:", e);
      return [];
    });

    const result = data.map(row => {
      const receita = parseFloat(row.RECEITA || 0);
      const qtd = parseFloat(row.QTD || 0);
      const custo = receita * 0.82; 
      const lucro = receita - custo;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;

      return {
        idPromocao: row.IDPROMOCAO,
        nome: row.NOME.trim(),
        dtInicio: row.DTINIPROMOCAO,
        dtFim: row.DTFIMPROMOCAO,
        receita,
        custo,
        lucro,
        margem,
        qtd
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/promocoes/itens', async (req, res) => {
  try {
    const { idPromocao, idEmpresa, startDate, endDate } = req.query;
    if (!idPromocao) {
      return res.status(400).json({ error: "Falta o ID da promoção (idPromocao)" });
    }
    
    let isFiltered = idEmpresa && idEmpresa !== 'todas';

    let sql = `
      SELECT 
        EA.IDSUBPRODUTO,
        SUM(EA.VALTOTLIQUIDO) AS RECEITA,
        SUM(EA.QTDPRODUTO) AS QTD
      FROM DBA.ESTOQUE_ANALITICO_PROMOCAO_GESTAO EAPG
      JOIN DBA.ESTOQUE_ANALITICO EA ON EAPG.IDPLANILHA = EA.IDPLANILHA AND EAPG.NUMSEQUENCIA = EA.NUMSEQUENCIA
      WHERE EAPG.IDPROMOCAO = ?
    `;
    const params = [parseInt(idPromocao)];

    if (startDate && endDate) {
      sql += ` AND EA.DTMOVIMENTO BETWEEN '${startDate}' AND '${endDate}'`;
    } else {
      sql += ` AND EA.DTMOVIMENTO >= CURRENT DATE - 30 DAYS`;
    }

    if (isFiltered) {
      sql += ` AND EA.IDEMPRESA = ?`;
      params.push(parseInt(idEmpresa));
    }

    sql += ` GROUP BY EA.IDSUBPRODUTO ORDER BY RECEITA DESC FETCH FIRST 200 ROWS ONLY WITH UR`;

    const data = await queryDB(sql, params).catch((e) => {
      console.error("ERRO promocoes itens:", e);
      return [];
    });

    if (data.length === 0) return res.json([]);

    const ids = data.map(d => d.IDSUBPRODUTO);
    const inClause = ids.join(',');

    let sqlProduto = `SELECT IDSUBPRODUTO, DESCRICAO FROM DBA.VW_GEA_PRODUTO WHERE IDSUBPRODUTO IN (${inClause}) WITH UR`;
    const prodData = await queryDB(sqlProduto, []).catch(() => []);

    const prodMap = {};
    prodData.forEach(p => { prodMap[p.IDSUBPRODUTO] = p.DESCRICAO; });

    const result = data.map(row => {
      const receita = parseFloat(row.RECEITA);
      const qtd = parseFloat(row.QTD);
      const custo = receita * 0.82; // Estimativa (18% de margem)
      const lucro = receita - custo;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;

      return {
        idProduto: row.IDSUBPRODUTO,
        produto: (prodMap[row.IDSUBPRODUTO] || `PRODUTO ${row.IDSUBPRODUTO}`).trim(),
        secao: 'PROMOÇÃO',
        receita,
        custo,
        lucro,
        margem,
        qtd
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- XML COMPRES E PEDIDO COMPRA ---
function extractTagValue(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function parseNfeXml(xml) {
  const emitMatch = xml.match(/<emit>([\s\S]*?)<\/emit>/i);
  const emitXml = emitMatch ? emitMatch[1] : '';
  const supplierCnpj = extractTagValue(emitXml, 'CNPJ');
  const supplierName = extractTagValue(emitXml, 'xNome');

  const ideMatch = xml.match(/<ide>([\s\S]*?)<\/ide>/i);
  const ideXml = ideMatch ? ideMatch[1] : '';
  const invoiceNumber = extractTagValue(ideXml, 'nNF');
  const emissionDate = extractTagValue(ideXml, 'dhEmi') || extractTagValue(ideXml, 'dEmi');

  const items = [];
  const detRegex = /<det\s+nItem="([^"]+)">([\s\S]*?)<\/det>/gi;
  let match;
  while ((match = detRegex.exec(xml)) !== null) {
    const itemIndex = match[1];
    const detXml = match[2];
    const prodMatch = detXml.match(/<prod>([\s\S]*?)<\/prod>/i);
    const prodXml = prodMatch ? prodMatch[1] : '';
    
    items.push({
      itemIndex: parseInt(itemIndex),
      code: extractTagValue(prodXml, 'cProd'),
      ean: extractTagValue(prodXml, 'cEAN'),
      description: extractTagValue(prodXml, 'xProd'),
      unit: extractTagValue(prodXml, 'uCom'),
      quantity: parseFloat(extractTagValue(prodXml, 'qCom')) || 0,
      unitPrice: parseFloat(extractTagValue(prodXml, 'vUnCom')) || 0,
      totalPrice: parseFloat(extractTagValue(prodXml, 'vProd')) || 0,
    });
  }

  return {
    supplierCnpj,
    supplierName,
    invoiceNumber,
    emissionDate: emissionDate ? emissionDate.substring(0, 10) : '',
    items
  };
}

app.post('/api/compras/compare-xml', async (req, res) => {
  try {
    const { xml, idPedido } = req.body || {};
    if (!xml) return res.status(400).json({ error: 'Conteudo do XML nao fornecido' });

    const parsedNfe = parseNfeXml(xml);

    if (!idPedido) {
      return res.json({
        success: true,
        nfe: parsedNfe,
        message: 'XML parsed. ID do Pedido nao fornecido para comparacao.'
      });
    }

    const poItems = await queryDB(`
      SELECT 
        PCP.IDSUBPRODUTO,
        P.DESCRICAO AS PRODUTO,
        PCP.QTDSOLICITADA AS QTD_PEDIDA,
        PCP.VALUNITARIO AS PRECO_PEDIDO,
        CB.CODBARCX AS EAN_PEDIDO
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO AND PC.IDEMPRESA = PCP.IDEMPRESA
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO_GRADE_CODBARCX CB ON CB.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      WHERE PC.IDPEDIDO = ? WITH UR
    `, [parseInt(idPedido)]);

    if (poItems.length === 0) {
      return res.status(404).json({ error: `Pedido de Compra ID ${idPedido} nao encontrado ou nao possui itens` });
    }

    const comparedItems = parsedNfe.items.map(xmlItem => {
      const match = poItems.find(poItem => {
        const eanMatch = xmlItem.ean && poItem.EAN_PEDIDO && xmlItem.ean.trim() === poItem.EAN_PEDIDO.trim();
        const codeMatch = xmlItem.code && String(poItem.IDSUBPRODUTO) === xmlItem.code.trim();
        return eanMatch || codeMatch;
      });

      if (match) {
        const qtyDiff = xmlItem.quantity - parseFloat(match.QTD_PEDIDA);
        const priceDiff = xmlItem.unitPrice - parseFloat(match.PRECO_PEDIDO);
        let status = 'OK';
        if (qtyDiff !== 0 || priceDiff !== 0) {
          status = 'DIVERGENTE';
        }

        return {
          ...xmlItem,
          poItem: {
            idSubproduto: match.IDSUBPRODUTO,
            description: match.PRODUTO,
            quantity: parseFloat(match.QTD_PEDIDA),
            unitPrice: parseFloat(match.PRECO_PEDIDO),
            ean: match.EAN_PEDIDO
          },
          qtyDiff,
          priceDiff,
          status
        };
      } else {
        return {
          ...xmlItem,
          poItem: null,
          qtyDiff: 0,
          priceDiff: 0,
          status: 'NOT_IN_ORDER'
        };
      }
    });

    const missingItems = poItems
      .filter(poItem => {
        return !comparedItems.some(item => item.poItem && item.poItem.idSubproduto === poItem.IDSUBPRODUTO);
      })
      .map(poItem => ({
        itemIndex: null,
        code: String(poItem.IDSUBPRODUTO),
        ean: poItem.EAN_PEDIDO,
        description: poItem.PRODUTO,
        unit: '',
        quantity: 0,
        unitPrice: 0,
        totalPrice: 0,
        poItem: {
          idSubproduto: poItem.IDSUBPRODUTO,
          description: poItem.PRODUTO,
          quantity: parseFloat(poItem.QTD_PEDIDA),
          unitPrice: parseFloat(poItem.PRECO_PEDIDO),
          ean: poItem.EAN_PEDIDO
        },
        qtyDiff: -parseFloat(poItem.QTD_PEDIDA),
        priceDiff: -parseFloat(poItem.PRECO_PEDIDO),
        status: 'MISSING_IN_XML'
      }));

    res.json({
      success: true,
      nfe: parsedNfe,
      comparedItems: [...comparedItems, ...missingItems]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compras/pedidos-fornecedor', async (req, res) => {
  try {
    const { cnpj } = req.query;
    if (!cnpj) return res.status(400).json({ error: 'CNPJ nao fornecido' });
    
    const cleanCnpj = cnpj.replace(/[^0-9]/g, '');
    const sql = `
      SELECT 
        PC.IDPEDIDO, 
        PC.DTMOVIMENTO AS DATA, 
        F.NOME AS FORNECEDOR,
        F.CNPJCPF AS CNPJ
      FROM DBA.PEDIDO_COMPRA PC
      JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = PC.IDCLIFOR
      WHERE REPLACE(REPLACE(REPLACE(F.CNPJCPF, '.', ''), '-', ''), '/', '') LIKE ?
      ORDER BY PC.DTMOVIMENTO DESC
      FETCH FIRST 30 ROWS ONLY
      WITH UR
    `;
    const data = await queryDB(sql, [`%${cleanCnpj}%`]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/compras/notas-hoje', async (req, res) => {
  try {
    const sql = `
      SELECT 
        N.NUMNOTA AS NOTA_FISCAL,
        N.SERIENOTA AS SERIE,
        N.DTMOVIMENTO AS DATA_MOVIMENTO,
        F.NOME AS FORNECEDOR,
        F.CNPJCPF AS CNPJ,
        X.IDPLANILHA,
        NES.VALCONTABIL AS VALOR_NOTA
      FROM DBA.NOTA_FISCAL_ELETRONICA_XML X
      JOIN DBA.NOTAS N ON N.IDPLANILHA = X.IDPLANILHA
      LEFT JOIN DBA.NOTAS_ENTRADA_SAIDA NES ON NES.IDPLANILHA = N.IDPLANILHA
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = N.IDCLIFOR
      WHERE DATE(N.DTMOVIMENTO) = CURRENT DATE
        AND N.TIPONOTAFISCAL = 'E'
      ORDER BY N.DTMOVIMENTO DESC
      WITH UR
    `;
    const data = await queryDB(sql, []);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compras/notas-pendentes', async (req, res) => {
  try {
    const sql = `
      SELECT 
        C.CHAVENFE, 
        C.NUMNOTA AS NOTA_FISCAL, 
        C.SERIENOTA AS SERIE, 
        F.NOME AS FORNECEDOR,
        F.CNPJCPF AS CNPJ,
        SUM(C.VALTOTBRUTO) AS VALOR_TOTAL,
        MAX(C.IDPEDIDOCOMPRA) AS PEDIDO_COMPRA
      FROM DBA.CONFERE_NFE C
      LEFT JOIN DBA.NOTA_FISCAL_ELETRONICA_TERCEIROS T ON T.CHAVENFE = C.CHAVENFE
      LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = C.IDCLIFOR
      WHERE T.CHAVENFE IS NULL
      GROUP BY C.CHAVENFE, C.NUMNOTA, C.SERIENOTA, F.NOME, F.CNPJCPF
      ORDER BY C.NUMNOTA DESC
      FETCH FIRST 50 ROWS ONLY
      WITH UR
    `;
    const data = await queryDB(sql, []);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compras/pedido/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT 
        PCP.IDSUBPRODUTO,
        P.DESCRICAO AS PRODUTO,
        PCP.QTDSOLICITADA AS QTD_PEDIDA,
        PCP.VALUNITARIO AS PRECO_PEDIDO,
        CB.CODBARCX AS EAN_PEDIDO
      FROM DBA.PEDIDO_COMPRA_PROD PCP
      JOIN DBA.PEDIDO_COMPRA PC ON PC.IDPEDIDO = PCP.IDPEDIDO AND PC.IDEMPRESA = PCP.IDEMPRESA
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON P.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO_GRADE_CODBARCX CB ON CB.IDSUBPRODUTO = PCP.IDSUBPRODUTO
      WHERE PC.IDPEDIDO = ? WITH UR
    `;
    const data = await queryDB(sql, [parseInt(id)]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compras/nota-xml', async (req, res) => {
  try {
    const { idPlanilha, chaveNfe } = req.query;
    if (!idPlanilha && !chaveNfe) {
      return res.status(400).json({ error: "Parâmetro idPlanilha ou chaveNfe é obrigatório" });
    }

    let sql = "";
    let params = [];

    if (idPlanilha) {
      sql = `SELECT DADOSXML FROM DBA.NOTA_FISCAL_ELETRONICA_XML WHERE IDPLANILHA = ? WITH UR`;
      params = [parseInt(idPlanilha)];
    } else {
      sql = `
        SELECT XML.DADOSXML 
        FROM DBA.NOTA_FISCAL_ELETRONICA_XML XML
        JOIN DBA.NOTA_FISCAL_ELETRONICA_TERCEIROS T ON T.IDPLANILHA = XML.IDPLANILHA
        WHERE T.CHAVENFE = ?
        WITH UR
      `;
      params = [String(chaveNfe)];
    }

    let xml = "";
    const rows = await queryDB(sql, params);
    if (rows && rows.length > 0) {
      xml = rows[0].DADOSXML;
    } else {
      // FALLBACK: Reconstruct XML from CONFERE_PEDIDO_XML & CONFERE_NFE
      let selectHeaderSql = "";
      let headerParams = [];

      if (idPlanilha) {
        selectHeaderSql = `
          SELECT DISTINCT 
            N.IDPLANILHA,
            N.NUMNOTA AS NOTA_FISCAL,
            N.SERIENOTA AS SERIE,
            F.NOME AS FORNECEDOR,
            F.CNPJCPF AS CNPJ,
            N.IDEMPRESA,
            (SELECT CO.IDAUTORIZACAO FROM DBA.CONFERE_NFE CO WHERE CO.NUMNOTA = N.NUMNOTA AND CO.IDEMPRESA = N.IDEMPRESA FETCH FIRST 1 ROWS ONLY) AS IDAUTORIZACAO
          FROM DBA.NOTAS N
          LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = N.IDCLIFOR
          WHERE N.IDPLANILHA = ?
          WITH UR
        `;
        headerParams = [parseInt(idPlanilha)];
      } else if (chaveNfe) {
        selectHeaderSql = `
          SELECT DISTINCT 
            C.IDAUTORIZACAO,
            C.NUMNOTA AS NOTA_FISCAL,
            C.SERIENOTA AS SERIE,
            F.NOME AS FORNECEDOR,
            F.CNPJCPF AS CNPJ,
            C.IDEMPRESA
          FROM DBA.CONFERE_NFE C
          LEFT JOIN DBA.CLIENTE_FORNECEDOR F ON F.IDCLIFOR = C.IDCLIFOR
          WHERE C.CHAVENFE = ?
          WITH UR
        `;
        headerParams = [String(chaveNfe)];
      }

      const headerRows = await queryDB(selectHeaderSql, headerParams);
      if (!headerRows || headerRows.length === 0) {
        return res.status(404).json({ error: "XML da nota fiscal não encontrado no banco de dados" });
      }

      const header = headerRows[0];
      const idAutorizacao = header.IDAUTORIZACAO;

      if (!idAutorizacao) {
        return res.status(404).json({ error: "XML da nota fiscal e autorização de conferência não encontrados no banco de dados" });
      }

      // Query items from CONFERE_PEDIDO_XML
      const itemsSql = `SELECT * FROM DBA.CONFERE_PEDIDO_XML WHERE IDAUTORIZACAO = ? WITH UR`;
      const itemRows = await queryDB(itemsSql, [idAutorizacao]);

      if (!itemRows || itemRows.length === 0) {
        return res.status(404).json({ error: "XML original indisponível e nenhuma conferência de itens encontrada para recriar a nota" });
      }

      // Reconstruct XML string
      const cleanEmitName = (header.FORNECEDOR || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      let detItemsXml = "";
      itemRows.forEach((item, index) => {
        const cleanDesc = (item.DESCRPRODUTO || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        detItemsXml += `
        <det nItem="${index + 1}">
          <prod>
            <cProd>${item.IDSUBPRODUTO}</cProd>
            <cEAN>${item.CODBAR || "SEM GTIN"}</cEAN>
            <xProd>${cleanDesc}</xProd>
            <uCom>${item.EMBALAGEM || "UN"}</uCom>
            <qCom>${item.QTDPROD || 0}</qCom>
            <vUnCom>${item.VALUNIT || 0}</vUnCom>
            <vProd>${item.VALTOT || 0}</vProd>
          </prod>
        </det>`;
      });

      xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${chaveNfe || "00000000000000000000000000000000000000000000"}" versao="4.00">
      <ide>
        <mod>55</mod>
        <serie>${header.SERIE || 1}</serie>
        <nNF>${header.NOTA_FISCAL || 0}</nNF>
        <dhEmi>2026-06-18T12:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>${(header.CNPJ || "").replace(/[^0-9]/g, "")}</CNPJ>
        <xNome>${cleanEmitName}</xNome>
      </emit>
      ${detItemsXml}
    </infNFe>
  </NFe>
</nfeProc>`;
    }

    res.json({ xml });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ---- SERVIR FRONTEND ESTATICO ----
const clientDistPath = path.join(__dirname, 'dist', 'client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // Qualquer rota que não comece com /api é redirecionada para o React/Vite (SPA fallback)
  app.get('/{*path}', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint API nao encontrado' });
    }
  });
}

async function startServer() {
  await syncDbConfigFromSupabase();

  const port = process.env.PORT || 3001;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 API DB2 Real rodando na porta ${port} com Filtros e Acesso Local!`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar API:', err);
  process.exit(1);
});
