const ibmdb = require('ibm_db');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

function loadLocalEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const sep = trimmed.indexOf('=');
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const val = trimmed.slice(sep + 1).trim().replace(/^['"']|['"']$/g, '');
    if (key && process.env[key] == null) process.env[key] = val;
  }
}
loadLocalEnvFile();

const connStr = `DATABASE=${process.env.DB2_DATABASE || 'cisserp'};HOSTNAME=${process.env.DB2_HOSTNAME || '192.168.20.20'};PORT=${process.env.DB2_PORT || '30231'};PROTOCOL=TCPIP;UID=${process.env.DB2_UID || 'contabilidade'};PWD=${process.env.DB2_PWD || '}yFhZ1PuJB*[]!s'};ConnectTimeout=60;`;

function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    ibmdb.open(connStr, (err, conn) => {
      if (err) return reject(err);
      conn.query(sql, params, (err2, rows) => {
        conn.close(() => {});
        if (err2) return reject(err2);
        resolve(rows);
      });
    });
  });
}

async function main() {
  console.log('--- Extraindo tributação + usuários do CISS ERP ---');

  const sql = `
    SELECT 
      P.IDPRODUTO,
      P.DESCRCOMPRODUTO,
      PG.NCM,
      PG.CODCEST,
      COALESCE(PG.FLAGBLOQUEIASOLCENARIOFISCAL, 'F') AS FLAG_BLOQUEIO_SOLICITACAO,
      COALESCE(PG.FLAGASSUMERESPONSACENARIO, 'F') AS FLAG_ASSUME_RESPONSABILIDADE,
      CF.IDTIPOOPERACAO,
      CF.UFORIGEM,
      CF.UFDESTINO,
      CF.ICMS_CST,
      CF.ICMS_ALIQUOTA,
      CF.ICMS_RED_BC,
      CF.ICMSST_ALIQUOTA,
      CF.ICMSST_MVA,
      CF.PIS_CST,
      CF.PIS_ALIQUOTA,
      CF.COFINS_CST,
      CF.COFINS_ALIQUOTA,
      CF.IPI_CST,
      CF.IPI_ALIQUOTA,
      CF.RESPONSAATUALTRIB,
      CF.DTALTERACAO,
      CF.IDUSUARIOALTERACAO AS ID_USER_CF,
      U1.NOMEUSUARIO AS LOGIN_USER_CF,
      U1.NOMESOBRENOME AS NOME_COMPLETO_CF,
      PG.IDUSUARIOULTIMAALTERACAO AS ID_USER_PG,
      U2.NOMEUSUARIO AS LOGIN_USER_PG,
      U2.NOMESOBRENOME AS NOME_COMPLETO_PG
    FROM DBA.PRODUTO P
    JOIN DBA.PRODUTO_GRADE PG ON PG.IDPRODUTO = P.IDPRODUTO
    LEFT JOIN DBA.CENARIO_FISCAL CF ON CF.IDPRODUTO = P.IDPRODUTO
    LEFT JOIN DBA.USUARIO U1 ON U1.IDUSUARIO = CF.IDUSUARIOALTERACAO
    LEFT JOIN DBA.USUARIO U2 ON U2.IDUSUARIO = PG.IDUSUARIOULTIMAALTERACAO
    ORDER BY P.IDPRODUTO, CF.IDTIPOOPERACAO
    WITH UR
  `;

  console.log('Executando query com cruzamento de usuários...');
  const rows = await queryDB(sql);
  console.log(`Query concluída. Total de regras extraídas: ${rows.length}`);

  const productMap = new Map();
  const userCounts = new Map();

  for (const r of rows) {
    const id = r.IDPRODUTO;
    if (!productMap.has(id)) {
      productMap.set(id, {
        idProduto: r.IDPRODUTO,
        descricao: r.DESCRCOMPRODUTO ? r.DESCRCOMPRODUTO.trim() : '',
        ncm: r.NCM ? r.NCM.trim() : '',
        cest: r.CODCEST ? r.CODCEST.trim() : '',
        flagBloqueio: r.FLAG_BLOQUEIO_SOLICITACAO,
        flagAssumeResponsa: r.FLAG_ASSUME_RESPONSABILIDADE,
        hasManualRule: false,
        rules: []
      });
    }

    const p = productMap.get(id);

    if (r.RESPONSAATUALTRIB === 'U' || r.FLAG_BLOQUEIO_SOLICITACAO === 'T') {
      p.hasManualRule = true;
    }

    // Determinar o usuário responsável pela regra
    const idUser = r.ID_USER_CF != null ? r.ID_USER_CF : r.ID_USER_PG;
    const loginUser = r.LOGIN_USER_CF || r.LOGIN_USER_PG || (idUser != null ? `ID_${idUser}` : 'SISTEMA/DESCONHECIDO');
    const nomeCompletoUser = r.NOME_COMPLETO_CF || r.NOME_COMPLETO_PG || 'Não Identificado';

    if (r.IDTIPOOPERACAO != null) {
      p.rules.push({
        idTipoOperacao: r.IDTIPOOPERACAO,
        ufOrigem: r.UFORIGEM,
        ufDestino: r.UFDESTINO,
        icmsCst: r.ICMS_CST,
        icmsAliq: r.ICMS_ALIQUOTA,
        icmsRedBc: r.ICMS_RED_BC,
        icmsStAliq: r.ICMSST_ALIQUOTA,
        icmsStMva: r.ICMSST_MVA,
        pisCst: r.PIS_CST,
        pisAliq: r.PIS_ALIQUOTA,
        cofinsCst: r.COFINS_CST,
        cofinsAliq: r.COFINS_ALIQUOTA,
        ipiCst: r.IPI_CST,
        ipiAliq: r.IPI_ALIQUOTA,
        responsa: r.RESPONSAATUALTRIB,
        dtAlteracao: r.DTALTERACAO,
        idUser: idUser || '-',
        loginUser: loginUser,
        nomeCompletoUser: nomeCompletoUser
      });
    }
  }

  const manualProducts = [];
  const autoProducts = [];

  for (const p of productMap.values()) {
    if (p.hasManualRule) {
      manualProducts.push(p);

      // Mapear contagem por usuário responsável pelos produtos manuais
      const mainUserKey = p.rules.length > 0 ? `${p.rules[0].loginUser}||${p.rules[0].nomeCompletoUser}` : 'SISTEMA/DESCONHECIDO||Não Identificado';
      userCounts.set(mainUserKey, (userCounts.get(mainUserKey) || 0) + 1);
    } else {
      autoProducts.push(p);
    }
  }

  console.log(`Processados: Total = ${productMap.size} | Impostos Manuais = ${manualProducts.length} | Grade Automática = ${autoProducts.length}`);

  const desktopPath = path.join('C:', 'Users', 'tisup', 'Desktop', 'Grade_Tributaria_Com_Usuarios_CISS.xlsx');
  console.log(`Gravando nova planilha com Usuários em: ${desktopPath}...`);

  const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: desktopPath,
    useStyles: true,
    useSharedStrings: true
  });

  // Estilos de cabeçalho
  const headerFillBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E78' } };
  const headerFillOrange = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'C65911' } };
  const headerFillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: '375623' } };
  const headerFillPurple = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7030A0' } };
  const fontHeader = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };

  // 1. Aba Resumo Executivo
  console.log('Escrevendo Aba Resumo Executivo...');
  const wsResumo = workbookWriter.addWorksheet('Resumo Executivo');
  wsResumo.columns = [
    { header: 'Indicador Tributário', key: 'indicador', width: 50 },
    { header: 'Quantidade de Produtos', key: 'valor', width: 25 },
    { header: '% do Total', key: 'percentual', width: 20 }
  ];
  wsResumo.getRow(1).eachCell(cell => { cell.fill = headerFillBlue; cell.font = fontHeader; });

  const totalProds = productMap.size;
  const qtdManual = manualProducts.length;
  const qtdAuto = autoProducts.length;

  wsResumo.addRow({ indicador: 'Total de Produtos no CISS ERP', valor: totalProds, percentual: '100,00%' }).commit();
  wsResumo.addRow({ indicador: 'Produtos com Impostos Colocados MANUALMENTE', valor: qtdManual, percentual: `${((qtdManual / totalProds) * 100).toFixed(2).replace('.', ',')}%` }).commit();
  wsResumo.addRow({ indicador: 'Produtos em Grade Tributária AUTOMÁTICA (CISS Smart)', valor: qtdAuto, percentual: `${((qtdAuto / totalProds) * 100).toFixed(2).replace('.', ',')}%` }).commit();
  wsResumo.commit();

  // 2. Aba Resumo por Usuário
  console.log('Escrevendo Aba Resumo por Usuário...');
  const wsUserSummary = workbookWriter.addWorksheet('Resumo por Usuário');
  wsUserSummary.columns = [
    { header: 'Login do Usuário', key: 'loginUser', width: 25 },
    { header: 'Nome Completo do Usuário', key: 'nomeCompleto', width: 45 },
    { header: 'Qtd. Produtos Alterados Manuais', key: 'qtd', width: 30 },
    { header: '% do Total Manuais', key: 'percManual', width: 20 }
  ];
  wsUserSummary.getRow(1).eachCell(cell => { cell.fill = headerFillPurple; cell.font = fontHeader; });

  const sortedUsers = Array.from(userCounts.entries())
    .map(([key, count]) => {
      const [login, nome] = key.split('||');
      return { login, nome, count };
    })
    .sort((a, b) => b.count - a.count);

  for (const u of sortedUsers) {
    wsUserSummary.addRow({
      loginUser: u.login,
      nomeCompleto: u.nome,
      qtd: u.count,
      percManual: `${((u.count / qtdManual) * 100).toFixed(2).replace('.', ',')}%`
    }).commit();
  }
  wsUserSummary.commit();

  // Definição das colunas detalhadas com USUÁRIO
  const columnsWithUser = [
    { header: 'ID Produto', key: 'idProduto', width: 12 },
    { header: 'Descrição do Produto', key: 'descricao', width: 42 },
    { header: 'NCM', key: 'ncm', width: 12 },
    { header: 'CEST', key: 'cest', width: 12 },
    { header: 'Login do Usuário', key: 'loginUser', width: 22 },
    { header: 'Nome Completo do Usuário', key: 'nomeCompletoUser', width: 38 },
    { header: 'ID Usuário', key: 'idUser', width: 12 },
    { header: 'Status Tributação', key: 'origemTributaria', width: 20 },
    { header: 'Bloqueio Cenário Manual?', key: 'flagBloqueio', width: 22 },
    { header: 'Responsabilidade Tributária', key: 'responsa', width: 28 },
    { header: 'Tipo Operação (CFOP)', key: 'tipoOp', width: 18 },
    { header: 'UF Origem', key: 'ufOrigem', width: 10 },
    { header: 'UF Destino', key: 'ufDestino', width: 10 },
    { header: 'CST ICMS', key: 'icmsCst', width: 10 },
    { header: 'Aliq. ICMS %', key: 'icmsAliq', width: 12 },
    { header: 'Red. BC ICMS %', key: 'icmsRedBc', width: 14 },
    { header: 'Aliq. ICMS ST %', key: 'icmsStAliq', width: 14 },
    { header: 'MVA ST %', key: 'icmsStMva', width: 12 },
    { header: 'CST PIS', key: 'pisCst', width: 10 },
    { header: 'Aliq. PIS %', key: 'pisAliq', width: 12 },
    { header: 'CST COFINS', key: 'cofinsCst', width: 12 },
    { header: 'Aliq. COFINS %', key: 'cofinsAliq', width: 14 },
    { header: 'CST IPI', key: 'ipiCst', width: 10 },
    { header: 'Aliq. IPI %', key: 'ipiAliq', width: 12 },
    { header: 'Data Alteração', key: 'dtAlteracao', width: 20 }
  ];

  // 3. Aba Impostos Manuais
  console.log('Escrevendo Aba Impostos Manuais...');
  const wsManual = workbookWriter.addWorksheet('Impostos Manuais (Separados)');
  wsManual.columns = columnsWithUser;
  wsManual.getRow(1).eachCell(cell => { cell.fill = headerFillOrange; cell.font = fontHeader; });

  for (const p of manualProducts) {
    writeProductToStreamSheet(wsManual, p, 'IMPOSTO MANUAL');
  }
  wsManual.commit();

  // 4. Aba Grade Automática
  console.log('Escrevendo Aba Grade Automática...');
  const wsAuto = workbookWriter.addWorksheet('Grade Automática (CISS Engine)');
  wsAuto.columns = columnsWithUser;
  wsAuto.getRow(1).eachCell(cell => { cell.fill = headerFillGreen; cell.font = fontHeader; });

  for (const p of autoProducts) {
    writeProductToStreamSheet(wsAuto, p, 'GRADE AUTOMÁTICA');
  }
  wsAuto.commit();

  console.log('Finalizando gravação do arquivo Excel...');
  await workbookWriter.commit();
  console.log(`=== PLANILHA ATUALIZADA COM SUCESSO EM: ${desktopPath} ===`);
}

function writeProductToStreamSheet(ws, p, statusDesc) {
  if (p.rules.length === 0) {
    ws.addRow({
      idProduto: p.idProduto,
      descricao: p.descricao,
      ncm: p.ncm,
      cest: p.cest,
      loginUser: 'SISTEMA/DESCONHECIDO',
      nomeCompletoUser: 'Não Identificado',
      idUser: '-',
      origemTributaria: statusDesc,
      flagBloqueio: p.flagBloqueio === 'T' ? 'Sim (Manual)' : 'Não (Automático)',
      responsa: 'Sem Regra Cadastrada',
      tipoOp: '-',
      ufOrigem: '-',
      ufDestino: '-',
      icmsCst: '-',
      icmsAliq: 0,
      icmsRedBc: 0,
      icmsStAliq: 0,
      icmsStMva: 0,
      pisCst: '-',
      pisAliq: 0,
      cofinsCst: '-',
      cofinsAliq: 0,
      ipiCst: '-',
      ipiAliq: 0,
      dtAlteracao: '-'
    }).commit();
  } else {
    for (const r of p.rules) {
      ws.addRow({
        idProduto: p.idProduto,
        descricao: p.descricao,
        ncm: p.ncm,
        cest: p.cest,
        loginUser: r.loginUser,
        nomeCompletoUser: r.nomeCompletoUser,
        idUser: r.idUser,
        origemTributaria: statusDesc,
        flagBloqueio: p.flagBloqueio === 'T' ? 'Sim (Manual)' : 'Não (Automático)',
        responsa: r.responsa === 'U' ? 'Usuário (Manual)' : 'CENÁRIO (Grade CISS Engine)',
        tipoOp: r.idTipoOperacao,
        ufOrigem: r.ufOrigem,
        ufDestino: r.ufDestino,
        icmsCst: r.icmsCst,
        icmsAliq: r.icmsAliq != null ? Number(r.icmsAliq) : 0,
        icmsRedBc: r.icmsRedBc != null ? Number(r.icmsRedBc) : 0,
        icmsStAliq: r.icmsStAliq != null ? Number(r.icmsStAliq) : 0,
        icmsStMva: r.icmsStMva != null ? Number(r.icmsStMva) : 0,
        pisCst: r.pisCst,
        pisAliq: r.pisAliq != null ? Number(r.pisAliq) : 0,
        cofinsCst: r.cofinsCst,
        cofinsAliq: r.cofinsAliq != null ? Number(r.cofinsAliq) : 0,
        ipiCst: r.ipiCst,
        ipiAliq: r.ipiAliq != null ? Number(r.ipiAliq) : 0,
        dtAlteracao: r.dtAlteracao ? String(r.dtAlteracao).slice(0, 19) : '-'
      }).commit();
    }
  }
}

main().catch(console.error);
