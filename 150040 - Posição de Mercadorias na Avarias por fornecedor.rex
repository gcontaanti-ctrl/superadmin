¿1A¿150040¿2B¿6¿3C¿150040¿4D¿150040-Posição de Mercadorias na Avarias por Fornecedor¿5E¿Relatório de Posição de Mercadorias na Avarias por Fornecedor¿6F¿release 10.5;
datawindow(units=0 timer_interval=60000 color=1090519039 processing=0 print.printername="" print.documentname="" print.orientation=1 print.margin.left=110 print.margin.right=110 print.margin.top=96 print.margin.bottom=96 print.paper.size=9 print.paper.source=0 print.canusedefaultprinter=yes selected.mouse=no)
header(height=480 color="536870912" )
summary(height=120 color="536870912" )
footer(height=80 color="536870912" )
detail(height=64 color="536870912" )
table(column=(type=long updatewhereclause=yes name=idempresa dbname="IDEMPRESA" )
column=(type=long updatewhereclause=yes name=remessa dbname="REMESSA" )
column=(type=char(100) updatewhereclause=yes name=descricao_remessa dbname="DESCRICAO_REMESSA" )
column=(type=char(60) updatewhereclause=yes name=tipo_remessa dbname="TIPO_REMESSA" )
column=(type=long updatewhereclause=yes name=idfornecedor dbname="IDFORNECEDOR" )
column=(type=char(100) updatewhereclause=yes name=nome_fornecedor dbname="NOME_FORNECEDOR" )
column=(type=date updatewhereclause=yes name=data_remessa dbname="DATA_REMESSA" )
column=(type=long updatewhereclause=yes name=idproduto dbname="IDPRODUTO" )
column=(type=char(120) updatewhereclause=yes name=descricaoproduto dbname="DESCRICAOPRODUTO" )
column=(type=char(60) updatewhereclause=yes name=marca dbname="MARCA" )
column=(type=char(30) updatewhereclause=yes name=lote dbname="LOTE" )
column=(type=char(60) updatewhereclause=yes name=local_origem dbname="LOCAL_ORIGEM" )
column=(type=char(60) updatewhereclause=yes name=local_destino dbname="LOCAL_DESTINO" )
column=(type=decimal(3) updatewhereclause=yes name=quantidade dbname="QUANTIDADE" )
column=(type=decimal(4) updatewhereclause=yes name=valorunitario dbname="VALORUNITARIO" )
column=(type=decimal(2) updatewhereclause=yes name=valor_total_liquido dbname="VALOR_TOTAL_LIQUIDO" )
column=(type=decimal(3) updatewhereclause=yes name=saldo_avaria dbname="SALDO_AVARIA" )
column=(type=decimal(4) updatewhereclause=yes name=val_saldo_avaria dbname="VAL_SALDO_AVARIA" )
 retrieve="SELECT 
    AR.IDEMPRESA,
    AR.IDAVARIAREMESSA AS REMESSA,
    AR.DESCRREMESSA AS DESCRICAO_REMESSA,
    ATR.DESCRTIPO AS TIPO_REMESSA,
    CF.IDCLIFOR AS IDFORNECEDOR,
    CF.NOME AS NOME_FORNECEDOR,
    AR.DTMOVIMENTO AS DATA_REMESSA,
    A.IDPRODUTO,
    P.DESCRICAOPRODUTO,
    M.DESCRICAO AS MARCA,
    A.IDLOTE AS LOTE,
    LO.DESCRLOCAL AS LOCAL_ORIGEM,
    LD.DESCRLOCAL AS LOCAL_DESTINO,
    AM.QUANTIDADE,
    A.VALORUNITARIO,
    (AM.QUANTIDADE * A.VALORUNITARIO) AS VALOR_TOTAL_LIQUIDO,
    A.SALDO AS SALDO_AVARIA,
    (A.SALDO * A.VALORUNITARIO) AS VAL_SALDO_AVARIA
FROM DBA.AVARIA_REMESSA AR
JOIN DBA.AVARIA_TIPO_REMESSA ATR ON ATR.IDTIPOREMESSA = AR.IDTIPOREMESSA
JOIN DBA.AVARIA_MOVIMENTO AM ON AM.IDAVARIAREMESSA = AR.IDAVARIAREMESSA AND AM.IDEMPRESA = AR.IDEMPRESA
JOIN DBA.AVARIA A ON A.IDAVARIA = AM.IDAVARIA AND A.IDEMPRESA = AM.IDEMPRESA
LEFT JOIN DBA.CLIENTE_FORNECEDOR CF ON CF.IDCLIFOR = A.IDFORNECEDORPADRAO
LEFT JOIN DBA.PRODUTOS_VIEW P ON P.IDPRODUTO = A.IDPRODUTO AND P.IDSUBPRODUTO = A.IDSUBPRODUTO
LEFT JOIN DBA.MARCA M ON M.IDMARCAFABRICANTE = P.IDMARCAFABRICANTE
LEFT JOIN DBA.ESTOQUE_CADASTRO_LOCAL LO ON LO.IDLOCALESTOQUE = A.IDLOCALORIGEM
LEFT JOIN DBA.ESTOQUE_CADASTRO_LOCAL LD ON LD.IDLOCALESTOQUE = A.IDLOCALDESTINO
WHERE AR.IDEMPRESA IN (:RA_IDEMPRESA)
  AND (CF.IDCLIFOR = :RA_IDFORNECEDOR OR :RA_IDFORNECEDOR IS NULL OR :RA_IDFORNECEDOR = 0)
  AND (AR.DTMOVIMENTO BETWEEN :RA_DTINI AND :RA_DTFIM)
ORDER BY CF.NOME, AR.IDAVARIAREMESSA, A.IDPRODUTO"
 arguments=(("RA_IDEMPRESA", numberlist), ("RA_IDFORNECEDOR", number), ("RA_DTINI", date), ("RA_DTFIM", date))
 sort="idfornecedor A, remessa A, idproduto A"
 group=(level=1 header.height=64 footer.height=64 by=("idfornecedor") )
 group=(level=2 header.height=64 footer.height=64 by=("remessa") )
)
compute(name=c_nomeempresa visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="33554432" x="18" y="24" height="56" width="2290" format="[GENERAL]" expression="uf_nomeempresa()" alignment="0" )
compute(name=c_today visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2757" y="24" height="56" width="576" format="dd/mm/yyyy hh:mm:ss" expression="today()" alignment="1" )
compute(name=c_titulo visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-13" font.weight="700" background.mode="1" color="0" x="37" y="88" height="84" width="3314" format="[GENERAL]" expression="'150040-Posição de Mercadorias na Avarias por Fornecedor'" alignment="2" )
compute(name=c_filtros visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-7" font.weight="700" background.mode="1" color="33554432" x="384" y="176" height="224" width="2322" format="[GENERAL]" expression="uf_filtros()" alignment="2" )
compute(name=c_versao visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2848" y="340" height="56" width="485" format="[GENERAL]" expression="'V. CISS 22'" alignment="1" )
text(name=t_avarias visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="32" y="340" height="56" width="485" text="Controle de Avarias por Remessa" )
line(name=l_h1 visible="1" band=header pen.style="0" pen.width="9" pen.color="0" x1="9" y1="416" x2="3369" y2="416" )
text(name=t_col1 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="18" y="426" height="48" width="140" text="Código" )
text(name=t_col2 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="170" y="426" height="48" width="550" text="Descrição Produto" )
text(name=t_col3 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="740" y="426" height="48" width="160" text="Lote" )
text(name=t_col4 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="920" y="426" height="48" width="220" text="Local Origem" )
text(name=t_col5 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="1160" y="426" height="48" width="220" text="Local Destino" )
text(name=t_col6 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="1400" y="426" height="48" width="180" text="Quantidade" )
text(name=t_col7 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="1600" y="426" height="48" width="180" text="Valor Unitário" )
text(name=t_col8 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="1800" y="426" height="48" width="220" text="Valor Total Líquido" )
text(name=t_col9 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="2040" y="426" height="48" width="160" text="Saldo Avaria" )
text(name=t_col10 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="2" x="2220" y="426" height="48" width="200" text="Val. Saldo Avaria" )
text(name=t_col11 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" alignment="0" x="2440" y="426" height="48" width="300" text="Marca" )
line(name=l_h2 visible="1" band=header pen.style="0" pen.width="9" pen.color="0" x1="9" y1="476" x2="3369" y2="476" )
compute(name=c_forn_hdr visible="1" band=header.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="18" y="10" height="48" width="2500" format="[GENERAL]" expression="'Fornecedor: ' + string(idfornecedor) + ' - ' + nome_fornecedor" alignment="0" )
compute(name=c_rem_hdr visible="1" band=header.2 font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="35" y="10" height="48" width="2800" format="[GENERAL]" expression="'Remessa: ' + string(remessa) + ' - ' + descricao_remessa + ' (' + tipo_remessa + ') - Data: ' + string(data_remessa, 'dd/mm/yyyy')" alignment="0" )
column(name=idproduto visible="1" band=detail id=8 x="18" y="8" height="48" width="140" color="33554432" alignment="2" format="[general]" )
column(name=descricaoproduto visible="1" band=detail id=9 x="170" y="8" height="48" width="550" color="33554432" alignment="0" format="[general]" )
column(name=lote visible="1" band=detail id=11 x="740" y="8" height="48" width="160" color="33554432" alignment="0" format="[general]" )
column(name=local_origem visible="1" band=detail id=12 x="920" y="8" height="48" width="220" color="33554432" alignment="0" format="[general]" )
column(name=local_destino visible="1" band=detail id=13 x="1160" y="8" height="48" width="220" color="33554432" alignment="0" format="[general]" )
column(name=quantidade visible="1" band=detail id=14 x="1400" y="8" height="48" width="180" color="33554432" alignment="2" format="#,##0.000" )
column(name=valorunitario visible="1" band=detail id=15 x="1600" y="8" height="48" width="180" color="33554432" alignment="2" format="#,##0.0000" )
column(name=valor_total_liquido visible="1" band=detail id=16 x="1800" y="8" height="48" width="220" color="33554432" alignment="2" format="#,##0.00" )
column(name=saldo_avaria visible="1" band=detail id=17 x="2040" y="8" height="48" width="160" color="33554432" alignment="2" format="#,##0.000" )
column(name=val_saldo_avaria visible="1" band=detail id=18 x="2220" y="8" height="48" width="200" color="33554432" alignment="2" format="#,##0.0000" )
column(name=marca visible="1" band=detail id=10 x="2440" y="8" height="48" width="300" color="33554432" alignment="0" format="[general]" )
compute(name=c_tot_rem_qtd visible="1" band=footer.2 font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="0" x="1400" y="10" height="48" width="180" format="#,##0.000" expression="sum(quantidade for group 2)" alignment="2" )
compute(name=c_tot_rem_vlr visible="1" band=footer.2 font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="0" x="1800" y="10" height="48" width="220" format="#,##0.00" expression="sum(valor_total_liquido for group 2)" alignment="2" )
compute(name=c_tot_forn_qtd visible="1" band=footer.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="1400" y="10" height="48" width="180" format="#,##0.000" expression="sum(quantidade for group 1)" alignment="2" )
compute(name=c_tot_forn_vlr visible="1" band=footer.1 font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="1800" y="10" height="48" width="220" format="#,##0.00" expression="sum(valor_total_liquido for group 1)" alignment="2" )
compute(name=c_tot_geral_qtd visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="1400" y="10" height="48" width="180" format="#,##0.000" expression="sum(quantidade for all)" alignment="2" )
compute(name=c_tot_geral_vlr visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-9" font.weight="700" background.mode="1" color="0" x="1800" y="10" height="48" width="220" format="#,##0.00" expression="sum(valor_total_liquido for all)" alignment="2" )
compute(name=c_rodape visible="1" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="27" y="20" height="56" width="3310" format="[GENERAL]" expression="uf_rodape()" alignment="0" )
compute(name=c_pagina visible="1" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.weight="700" background.mode="1" color="33554432" x="2734" y="20" height="52" width="599" format="[general]" expression="'Página ' + page() + ' de ' + pageCount()" alignment="1" )
