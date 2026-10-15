¿1A¿211¿2B¿6¿3C¿211¿4D¿211-Movimentação por Produto¿5E¿Relatório de Movimentação por Produto CISS¿6F¿release 10.5;
datawindow(units=0 timer_interval=60000 color=1090519039 processing=0 print.printername="" print.documentname="" print.orientation=1 print.margin.left=110 print.margin.right=110 print.margin.top=96 print.margin.bottom=96 print.paper.size=9 print.paper.source=0 print.canusedefaultprinter=yes selected.mouse=no)
header(height=480 color="536870912" )
summary(height=120 color="536870912" )
footer(height=80 color="536870912" )
detail(height=64 color="536870912" )
table(column=(type=long updatewhereclause=yes name=idempresa dbname="IDEMPRESA" )
column=(type=long updatewhereclause=yes name=idsubproduto dbname="IDSUBPRODUTO" )
column=(type=char(120) updatewhereclause=yes name=descricaoproduto dbname="DESCRICAOPRODUTO" )
column=(type=date updatewhereclause=yes name=dtmovimento dbname="DTMOVIMENTO" )
column=(type=long updatewhereclause=yes name=nota dbname="NOTA" )
column=(type=char(10) updatewhereclause=yes name=serienota dbname="SERIENOTA" )
column=(type=long updatewhereclause=yes name=idoperacao dbname="IDOPERACAO" )
column=(type=char(60) updatewhereclause=yes name=descroperacao dbname="DESCROPERACAO" )
column=(type=char(60) updatewhereclause=yes name=vendedor_nome dbname="VENDEDOR_NOME" )
column=(type=char(30) updatewhereclause=yes name=referencia dbname="REFERENCIA" )
column=(type=decimal(3) updatewhereclause=yes name=qtd dbname="QTD" )
column=(type=decimal(2) updatewhereclause=yes name=vlr dbname="VLR" )
 retrieve="SELECT
    ESTOQUE_ANALITICO.IDEMPRESA,
    ESTOQUE_ANALITICO.IDSUBPRODUTO,
    PRODUTOS_VIEW.DESCRICAOPRODUTO,
    ESTOQUE_ANALITICO.DTMOVIMENTO,
    CASE WHEN ESTOQUE_ANALITICO.IDOPERACAO = 1300 AND NOTAS.MODELO <> '65' THEN
        NOTAS.NUMCUPOMFISCAL
    ELSE
        NOTAS.NUMNOTA
    END AS NOTA,
    NOTAS.SERIENOTA,
    ESTOQUE_ANALITICO.IDOPERACAO,
    OPERACAO_INTERNA.DESCROPERACAO,
    VENDEDOR.NOME AS VENDEDOR_NOME,
    PRODUTOS_VIEW.REFERENCIA,
    SUM(ESTOQUE_ANALITICO.QTDPRODUTO) AS QTD,
    SUM(ESTOQUE_ANALITICO.VALTOTLIQUIDO) AS VLR
FROM
    NOTAS JOIN ESTOQUE_ANALITICO ON
        (NOTAS.IDEMPRESA = ESTOQUE_ANALITICO.IDEMPRESA AND
         NOTAS.IDPLANILHA = ESTOQUE_ANALITICO.IDPLANILHA)
    LEFT OUTER JOIN CLIENTE_FORNECEDOR AS VENDEDOR ON
        (VENDEDOR.IDCLIFOR = ESTOQUE_ANALITICO.IDVENDEDOR)
    JOIN PRODUTOS_VIEW ON
        (ESTOQUE_ANALITICO.IDPRODUTO = PRODUTOS_VIEW.IDPRODUTO AND
         ESTOQUE_ANALITICO.IDSUBPRODUTO = PRODUTOS_VIEW.IDSUBPRODUTO)
    JOIN OPERACAO_INTERNA ON
        (OPERACAO_INTERNA.IDOPERACAO = ESTOQUE_ANALITICO.IDOPERACAO)
WHERE
    ESTOQUE_ANALITICO.FLAGMOVSALDOPRO = 'T' AND
    ESTOQUE_ANALITICO.IDOPERACAO <> 1301 AND
    NOTAS.IDEMPRESA IN (:RA_IDEMPRESA) AND
    ESTOQUE_ANALITICO.IDSUBPRODUTO IN (:RA_IDSUBPRODUTO) AND
    ((UPPER(:RA_TIPONOTA) = 'E' AND ESTOQUE_ANALITICO.IDOPERACAO < 1000) OR
     (UPPER(:RA_TIPONOTA) = 'S' AND ESTOQUE_ANALITICO.IDOPERACAO > 1000) OR
     (UPPER(:RA_TIPONOTA) = '%')) AND
    ESTOQUE_ANALITICO.DTMOVIMENTO BETWEEN :RA_DTINI AND :RA_DTFIM
GROUP BY
    ESTOQUE_ANALITICO.IDEMPRESA,
    ESTOQUE_ANALITICO.IDSUBPRODUTO,
    PRODUTOS_VIEW.DESCRICAOPRODUTO,
    ESTOQUE_ANALITICO.IDOPERACAO,
    VENDEDOR.NOME,
    PRODUTOS_VIEW.REFERENCIA,
    OPERACAO_INTERNA.DESCROPERACAO,
    ESTOQUE_ANALITICO.DTMOVIMENTO,
    NOTAS.SERIENOTA,
    NOTAS.NUMNOTA,
    NOTAS.MODELO,
    NOTAS.NUMCUPOMFISCAL"
 arguments=(("RA_IDEMPRESA", numberlist), ("RA_IDSUBPRODUTO", numberlist), ("RA_TIPONOTA", string), ("RA_DTINI", date), ("RA_DTFIM", date))
 sort="idsubproduto A, dtmovimento A"
 group=(level=1 header.height=64 footer.height=64 by=("idsubproduto") )
)
compute(name=c_nomeempresa visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="33554432" x="18" y="24" height="56" width="2290" format="[GENERAL]" expression="uf_nomeempresa()" alignment="0" )
compute(name=c_today visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2757" y="24" height="56" width="576" format="dd/mm/yyyy hh:mm:ss" expression="today()" alignment="1" )
compute(name=c_titulo visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-13" font.weight="700" background.mode="1" color="0" x="37" y="88" height="84" width="3314" format="[GENERAL]" expression="'211-Movimentação por Produto'" alignment="2" )
compute(name=c_filtros visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-7" font.weight="700" background.mode="1" color="33554432" x="384" y="176" height="224" width="2322" format="[GENERAL]" expression="uf_filtros()" alignment="2" )
compute(name=c_versao visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2848" y="340" height="56" width="485" format="[GENERAL]" expression="'V. CISS 14'" alignment="1" )
text(name=t_prod visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="32" y="340" height="56" width="485" text="Produtos" )
line(name=l_h1 visible="1" band=header pen.style="0" pen.width="9" pen.color="0" x1="9" y1="416" x2="3369" y2="416" )
text(name=t_col1 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="18" y="426" height="48" width="200" text="Data Movimento" )
text(name=t_col2 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="230" y="426" height="48" width="180" text="Nota ou Cupom" )
text(name=t_col3 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="420" y="426" height="48" width="100" text="Série" )
text(name=t_col4 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="530" y="426" height="48" width="120" text="Op. Cód." )
text(name=t_col5 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="660" y="426" height="48" width="500" text="Descrição Operação" )
text(name=t_col6 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="1200" y="426" height="48" width="400" text="Vendedor" )
text(name=t_col7 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="1650" y="426" height="48" width="300" text="Qtde. Produto" )
text(name=t_col8 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="2000" y="426" height="48" width="350" text="Valor Total Líquido" )
line(name=l_h2 visible="1" band=header pen.style="0" pen.width="9" pen.color="0" x1="9" y1="476" x2="3369" y2="476" )
compute(name=c_grp_header visible="1" band=header.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="18" y="10" height="48" width="1800" format="[GENERAL]" expression="'Produto: ' + string(idsubproduto) + ' - ' + descricaoproduto" alignment="0" )
text(name=t_ref visible="1" band=header.1 font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="1900" y="10" height="48" width="600" expression="'Referência: ' + referencia" )
column(name=dtmovimento visible="1" band=detail id=4 x="18" y="8" height="48" width="200" color="33554432" alignment="0" format="dd/mm/yyyy" )
column(name=nota visible="1" band=detail id=5 x="230" y="8" height="48" width="180" color="33554432" alignment="2" format="[general]" )
column(name=serienota visible="1" band=detail id=6 x="420" y="8" height="48" width="100" color="33554432" alignment="2" format="[general]" )
column(name=idoperacao visible="1" band=detail id=7 x="530" y="8" height="48" width="120" color="33554432" alignment="2" format="[general]" )
column(name=descroperacao visible="1" band=detail id=8 x="660" y="8" height="48" width="500" color="33554432" alignment="0" format="[general]" )
column(name=vendedor_nome visible="1" band=detail id=9 x="1200" y="8" height="48" width="400" color="33554432" alignment="0" format="[general]" )
column(name=qtd visible="1" band=detail id=11 x="1650" y="8" height="48" width="300" color="33554432" alignment="2" format="#,##0.000" )
column(name=vlr visible="1" band=detail id=12 x="2000" y="8" height="48" width="350" color="33554432" alignment="2" format="#,##0.00" )
compute(name=c_grp_tot_lbl visible="1" band=footer.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="50" y="10" height="48" width="1400" format="[GENERAL]" expression="'Total do Produto: ' + descricaoproduto" alignment="0" )
compute(name=c_grp_tot_qtd visible="1" band=footer.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="1650" y="10" height="48" width="300" format="#,##0.000" expression="sum(qtd for group 1)" alignment="2" )
compute(name=c_grp_tot_vlr visible="1" band=footer.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="2000" y="10" height="48" width="350" format="#,##0.00" expression="sum(vlr for group 1)" alignment="2" )
compute(name=c_rodape visible="1" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="27" y="20" height="56" width="3310" format="[GENERAL]" expression="uf_rodape()" alignment="0" )
compute(name=c_pagina visible="1" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2734" y="20" height="52" width="599" format="[general]" expression="'Página ' + page() + ' de ' + pageCount()" alignment="1" )
