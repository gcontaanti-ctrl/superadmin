const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'backend_api.cjs');
let content = fs.readFileSync(filePath, 'utf8');

const newRoutes = `

  // ROTA: Relatório de Entradas (160068)
  app.get('/api/relatorios/entradas', async (req, res) => {
    try {
      const { data_inicio, data_fim, id_empresa, id_fornecedor, id_operacao } = req.query;
      
      if (!data_inicio || !data_fim) {
        return res.status(400).json({ error: 'data_inicio e data_fim sao obrigatorios' });
      }

      const dtIni = data_inicio;
      const dtFim = data_fim;
      const idEmpresa = id_empresa || '1'; // Default loja 1 ou usar filtro in
      const idFornecedor = id_fornecedor || null;
      const idOperacao = id_operacao || '2'; // Operação padrão de entrada (Compra = 2 geralmente), ajustar conforme ERP
      const tipoCategoria = '%';

      // Query do relatorio 160068 adaptada
      let sql = \`
        SELECT
            NOTAS_ENTRADA_SAIDA.IDEMPRESA,
            NOTAS.NUMNOTA,
            NOTAS.SERIENOTA,
            NOTAS_ENTRADA_SAIDA.DTMOVIMENTO,
            NOTAS_ENTRADA_SAIDA.DTEMISSAO,
            NOTAS_ENTRADA_SAIDA.NOME,
            NOTAS_ENTRADA_SAIDA.IDPLANILHA,
            NOTAS_ENTRADA_SAIDA.IDOPERACAO,
            NOTAS_ENTRADA_SAIDA.UF,
            NOTAS_ENTRADA_SAIDA.VALCONTABIL,
            COALESCE(ESTOQUE_ANALITICO.TIPOCATEGORIA,'') AS TIPOCATEGORIA,
            NOTAS.IDCLIFOR
        FROM
            DBA.NOTAS_ENTRADA_SAIDA
            LEFT OUTER JOIN DBA.ESTOQUE_ANALITICO ON(
                NOTAS_ENTRADA_SAIDA.IDEMPRESA = ESTOQUE_ANALITICO.IDEMPRESA AND
                NOTAS_ENTRADA_SAIDA.IDPLANILHA = ESTOQUE_ANALITICO.IDPLANILHA
            ),
            DBA.NOTAS
        WHERE
            NOTAS_ENTRADA_SAIDA.IDEMPRESA = NOTAS.IDEMPRESA AND
            NOTAS_ENTRADA_SAIDA.IDPLANILHA = NOTAS.IDPLANILHA AND
            NOTAS_ENTRADA_SAIDA.IDOPERACAO < 1000 AND
            NOTAS_ENTRADA_SAIDA.DTMOVIMENTO BETWEEN ? AND ? 
      \`;

      const params = [dtIni, dtFim];

      if (id_empresa && id_empresa !== 'todas') {
        sql += ' AND NOTAS_ENTRADA_SAIDA.IDEMPRESA = ?';
        params.push(id_empresa);
      }

      if (id_fornecedor) {
        sql += ' AND NOTAS.IDCLIFOR = ?';
        params.push(id_fornecedor);
      }

      // Evitando duplicação agregando
      sql += \`
        GROUP BY
            NOTAS_ENTRADA_SAIDA.IDEMPRESA,
            NOTAS.NUMNOTA,
            NOTAS.SERIENOTA,
            NOTAS_ENTRADA_SAIDA.DTMOVIMENTO,
            NOTAS_ENTRADA_SAIDA.DTEMISSAO,
            NOTAS_ENTRADA_SAIDA.NOME,
            NOTAS_ENTRADA_SAIDA.IDPLANILHA,
            NOTAS_ENTRADA_SAIDA.IDOPERACAO,
            NOTAS_ENTRADA_SAIDA.UF,
            COALESCE(ESTOQUE_ANALITICO.TIPOCATEGORIA,''),
            NOTAS.IDCLIFOR,
            NOTAS_ENTRADA_SAIDA.VALCONTABIL
        ORDER BY NOTAS_ENTRADA_SAIDA.DTMOVIMENTO DESC
        FETCH FIRST 500 ROWS ONLY
      \`;

      const pool = ibmdb.Pool;
      const conn = await new Promise((resolve, reject) => {
        pool.open(connStr, (err, conn) => {
          if (err) reject(err);
          else resolve(conn);
        });
      });

      try {
        const rows = await new Promise((resolve, reject) => {
          conn.query(sql, params, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        res.json(rows);
      } finally {
        conn.close();
      }

    } catch (err) {
      console.error('Erro relatorio entradas:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ROTA: Detalhes dos Itens da Nota
  app.get('/api/notas/:idempresa/:idplanilha/itens', async (req, res) => {
    try {
      const { idempresa, idplanilha } = req.params;

      const sql = \`
        SELECT 
          I.SEQUENCIA,
          I.IDPRODUTO,
          P.DESCRICAO AS PRODUTO_DESC,
          I.QUANTIDADE,
          I.VALUNITARIO,
          (I.QUANTIDADE * I.VALUNITARIO) AS VALTOTAL
        FROM DBA.NOTAS_ITENS I
        JOIN DBA.PRODUTO P ON I.IDPRODUTO = P.IDPRODUTO
        WHERE I.IDEMPRESA = ? AND I.IDPLANILHA = ?
        ORDER BY I.SEQUENCIA
      \`;

      const pool = ibmdb.Pool;
      const conn = await new Promise((resolve, reject) => {
        pool.open(connStr, (err, conn) => {
          if (err) reject(err);
          else resolve(conn);
        });
      });

      try {
        const rows = await new Promise((resolve, reject) => {
          conn.query(sql, [idempresa, idplanilha], (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        res.json(rows);
      } finally {
        conn.close();
      }
    } catch (err) {
      console.error('Erro ao buscar itens da nota:', err);
      res.status(500).json({ error: err.message });
    }
  });

}

startServer().catch((err) => {
`;

content = content.replace(/}\r?\n\r?\nstartServer\(\)\.catch\(\(err\) => {/, newRoutes);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Routes injected.");
