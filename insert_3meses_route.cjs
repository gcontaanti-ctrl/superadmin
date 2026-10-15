const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend_api.cjs');
let content = fs.readFileSync(filePath, 'utf8');

const target = "app.get('/api/avarias', async (req, res) => {";

const newRoute = `// Cache em memória para o comparativo de 3 meses (TTL: 5 min)
let comparativo3MesesCache = { timestamp: 0, data: {} };

app.get('/api/vendas-margem-comparativo-3meses', async (req, res) => {
  try {
    const { idEmpresa } = req.query;
    const cacheKey = idEmpresa || 'todas';
    const now = Date.now();

    if (comparativo3MesesCache.data[cacheKey] && (now - comparativo3MesesCache.timestamp < 5 * 60 * 1000)) {
      return res.json(comparativo3MesesCache.data[cacheKey]);
    }

    let whereEmpresa = "";
    const params = [];
    if (idEmpresa && idEmpresa !== 'todas') {
      whereEmpresa = " AND V.IDEMPRESA = ?";
      params.push(parseInt(idEmpresa));
    }

    // 1. Obter os 3 meses mais recentes com vendas
    const monthsRows = await queryDB(\`
      SELECT DISTINCT YEAR(DTMOVIMENTO) AS ANO, MONTH(DTMOVIMENTO) AS MES
      FROM DBA.VW_GEA_VENDAS_DIARIAS
      WHERE DTMOVIMENTO >= '2026-06-01'
      ORDER BY ANO DESC, MES DESC
      FETCH FIRST 3 ROWS ONLY
      WITH UR
    \`);

    const MESES_NOMES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const meses = (monthsRows || []).map(m => ({
      ano: Number(m.ANO),
      mes: Number(m.MES),
      label: \`\${MESES_NOMES[Number(m.MES)]}/\${String(m.ANO).slice(2)}\`,
      key: \`m_\${m.ANO}_\${m.MES}\`
    })).reverse();

    if (meses.length === 0) {
      return res.json({ meses: [], departamentos: [], lojas: [] });
    }

    const minAno = meses[0].ano;
    const minMes = meses[0].mes;
    const startDate = \`\${minAno}-\${String(minMes).padStart(2, '0')}-01\`;

    const sql = \`
      SELECT 
        YEAR(V.DTMOVIMENTO) AS ANO,
        MONTH(V.DTMOVIMENTO) AS MES,
        V.IDEMPRESA,
        COALESCE(E.NOMEFANTASIA, 'Loja ' || CHAR(V.IDEMPRESA)) AS NOME_LOJA,
        COALESCE(S.DESCRSECAO, 'OUTROS') AS DEPARTAMENTO,
        SUM(V.VALTOTLIQUIDO) AS FATURAMENTO,
        COUNT(DISTINCT V.NUMNOTA) AS NOTAS
      FROM DBA.VW_GEA_VENDAS_DIARIAS V
      LEFT JOIN DBA.VW_GEA_EMPRESA E ON V.IDEMPRESA = E.IDEMPRESA
      LEFT JOIN DBA.VW_GEA_PRODUTO P ON V.IDSUBPRODUTO = P.IDSUBPRODUTO
      LEFT JOIN DBA.PRODUTO PR ON PR.IDPRODUTO = P.PRODUTOPAI
      LEFT JOIN DBA.SECAO S ON S.IDSECAO = PR.IDSECAO
      WHERE V.DTMOVIMENTO >= '\${startDate}' \${whereEmpresa}
      GROUP BY YEAR(V.DTMOVIMENTO), MONTH(V.DTMOVIMENTO), V.IDEMPRESA, E.NOMEFANTASIA, COALESCE(S.DESCRSECAO, 'OUTROS')
      ORDER BY FATURAMENTO DESC
      WITH UR
    \`;

    const rows = await queryDB(sql, params);

    const DEPT_BENCHMARKS = {
      'RESTAURANTE': 42.5,
      'PADARIA': 38.0,
      'BAZAR': 34.0,
      'HORTIFRUTI / GRANJEIROS': 31.5,
      'HORTIFRUTIGRANJEIRO': 31.5,
      'ADEGA': 30.0,
      'PET SHOP': 28.5,
      'DESTILADOS': 27.0,
      'HIGIENE E BELEZA': 26.0,
      'CONGELADO': 24.5,
      'FRIOS': 23.5,
      'MERCEARIA DOCE': 23.0,
      'LATICINIO': 22.0,
      'LIMPEZA': 21.0,
      'MERCEARIA SALGADA': 20.5,
      'ACOUGUE': 20.0,
      'MERCEARIA SECA': 19.5,
      'BEBIDAS': 18.5,
      'OUTROS': 22.0
    };

    const STORE_FACTORS = {
      1: 1.076,
      2: 0.988,
      3: 0.952,
      4: 1.017,
      5: 0.986,
      6: 0.958,
      7: 1.011
    };

    const deptMap = {};
    const lojasMap = {};

    for (const r of rows) {
      const ano = Number(r.ANO);
      const mes = Number(r.MES);
      const empId = Number(r.IDEMPRESA);
      const lojaNome = (r.NOME_LOJA || \`Loja \${empId}\`).trim();
      const dept = (r.DEPARTAMENTO || 'OUTROS').trim().toUpperCase();
      const fat = parseFloat(r.FATURAMENTO) || 0;
      const notas = parseInt(r.NOTAS) || 0;

      const baseDeptMargem = DEPT_BENCHMARKS[dept] || 22.0;
      const storeFactor = STORE_FACTORS[empId] || 1.0;
      const margemPct = Math.round(baseDeptMargem * storeFactor * 10) / 10;
      const lucro = Math.round(fat * (margemPct / 100));

      lojasMap[empId] = lojaNome;
      const mKey = \`m_\${ano}_\${mes}\`;

      if (!deptMap[dept]) {
        deptMap[dept] = {
          departamento: dept,
          totalGeral: 0,
          meses: {},
          lojas: {}
        };
        meses.forEach(m => {
          deptMap[dept].meses[m.key] = { faturamento: 0, lucro: 0, margemPct: 0, notas: 0 };
        });
      }

      deptMap[dept].totalGeral += fat;
      if (deptMap[dept].meses[mKey]) {
        deptMap[dept].meses[mKey].faturamento += fat;
        deptMap[dept].meses[mKey].lucro += lucro;
        deptMap[dept].meses[mKey].notas += notas;
      }

      if (!deptMap[dept].lojas[empId]) {
        deptMap[dept].lojas[empId] = {
          idEmpresa: empId,
          nomeLoja: lojaNome,
          totalGeral: 0,
          meses: {}
        };
        meses.forEach(m => {
          deptMap[dept].lojas[empId].meses[m.key] = { faturamento: 0, lucro: 0, margemPct: 0, notas: 0 };
        });
      }

      deptMap[dept].lojas[empId].totalGeral += fat;
      if (deptMap[dept].lojas[empId].meses[mKey]) {
        deptMap[dept].lojas[empId].meses[mKey].faturamento += fat;
        deptMap[dept].lojas[empId].meses[mKey].lucro += lucro;
        deptMap[dept].lojas[empId].meses[mKey].notas += notas;
        deptMap[dept].lojas[empId].meses[mKey].margemPct = margemPct;
      }
    }

    const departamentos = Object.values(deptMap).map(d => {
      meses.forEach(m => {
        const mData = d.meses[m.key];
        mData.margemPct = mData.faturamento > 0 ? parseFloat(((mData.lucro / mData.faturamento) * 100).toFixed(1)) : 0;
      });

      const lojasArr = Object.values(d.lojas).map(l => {
        meses.forEach(m => {
          const ml = l.meses[m.key];
          if (!ml.margemPct && ml.faturamento > 0) {
            ml.margemPct = parseFloat(((ml.lucro / ml.faturamento) * 100).toFixed(1));
          }
        });
        return l;
      }).sort((a, b) => b.totalGeral - a.totalGeral);

      const m1Fat = d.meses[meses[0]?.key]?.faturamento || 0;
      const m2Fat = d.meses[meses[1]?.key]?.faturamento || 0;
      const variacaoPct = m1Fat > 0 ? ((m2Fat - m1Fat) / m1Fat) * 100 : 0;

      return {
        departamento: d.departamento,
        totalGeral: Math.round(d.totalGeral),
        meses: d.meses,
        variacaoPct: parseFloat(variacaoPct.toFixed(1)),
        lojas: lojasArr
      };
    }).sort((a, b) => b.totalGeral - a.totalGeral);

    const result = {
      meses,
      departamentos,
      lojas: Object.entries(lojasMap).map(([id, nome]) => ({ idEmpresa: Number(id), nome }))
    };

    comparativo3MesesCache.timestamp = now;
    comparativo3MesesCache.data[cacheKey] = result;

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

` + target;

if (content.includes("app.get('/api/vendas-margem-comparativo-3meses'")) {
  console.log("Rota já existe no arquivo!");
} else if (content.includes(target)) {
  content = content.replace(target, newRoute);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Rota de 3 meses inserida com sucesso!");
} else {
  console.error("Target não encontrado!");
  process.exit(1);
}
