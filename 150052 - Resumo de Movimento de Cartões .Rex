¿1A¿150052¿2B¿6¿3C¿33¿4D¿Resumo de Movimento de Cartões ¿5E¿Criado pelo usuário: 6 no dia: 05/08/2025¿6F¿release 10.5;
datawindow ( units=0 timer_interval=60000 color=1090519039 processing=0 print.printername=""  print.documentname=""  print.orientation=2 print.margin.left=110 print.margin.right=110 print.margin.top=96 print.margin.bottom=96 print.paper.size=9 print.paper.source=0 print.canusedefaultprinter=yes selected.mouse=no)
header(height=608 color="536870912" )
summary(height=80 color="536870912" )
footer(height=100 color="536870912" )
detail(height=88 color="536870912" )
table(column=(type=long updatewhereclause=yes name=idbandeira dbname="IDBANDEIRA"  )
column=(type=char(8) updatewhereclause=yes name=tipo dbname="TIPO"  )
column=(type=char(30) updatewhereclause=yes name=bandeira dbname="BANDEIRA"  )
column=(type=long updatewhereclause=yes name=idempresa dbname="IDEMPRESA"  )
column=(type=char(60) updatewhereclause=yes name=nomefantasia dbname="NOMEFANTASIA"  )
column=(type=decimal(2) updatewhereclause=yes name=debito dbname="DEBITO"  )
column=(type=decimal(2) updatewhereclause=yes name=parcela_1x dbname="PARCELA_1X"  )
column=(type=decimal(2) updatewhereclause=yes name=parcela_2x dbname="PARCELA_2X"  )
column=(type=decimal(2) updatewhereclause=yes name=valor_total dbname="VALOR_TOTAL"  )
column=(type=decimal(2) updatewhereclause=yes name=txcredito dbname="TXCREDITO"  )
column=(type=decimal(2) updatewhereclause=yes name=txdebito dbname="TXDEBITO"  )
column=(type=decimal(25) updatewhereclause=yes name=taxacredito dbname="TAXACREDITO"  )
column=(type=decimal(25) updatewhereclause=yes name=taxadebito dbname="TAXADEBITO"  )
column=(type=decimal(2) updatewhereclause=yes name=valliquido dbname="VALLIQUIDO"  )
 retrieve="SELECT 
C.IDBANDEIRA,
C.TIPO,
C.BANDEIRA,
C.IDEMPRESA,
C.NOMEFANTASIA,
C.DEBITO,
C.PARCELA_1X,
C.PARCELA_2X,
C.VALOR_TOTAL,
C.TXCREDITO,
C.TXDEBITO,
C.TAXACREDITO,
C.TAXADEBITO,
C.VALLIQUIDO FROM  (
SELECT
  IDBANDEIRA,
  TIPO,
  BANDEIRA,
  IDEMPRESA,
  NOMEFANTASIA,

  -- Parcelamentos separados
  SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) AS DEBITO,
  SUM(CASE WHEN TIPOCARTAO = 'C' AND DIGITOTITULO = '01' THEN VALOR ELSE 0 END) AS PARCELA_1X,
  SUM(CASE WHEN TIPOCARTAO = 'C' AND DIGITOTITULO = '02' THEN VALOR ELSE 0 END) AS PARCELA_2X,

  -- Valor total
  SUM(VALOR) AS VALOR_TOTAL,

  -- Taxas
  TXCREDITO,
  TXDEBITO,
  ROUND(SUM(CASE WHEN TIPOCARTAO = 'C' THEN VALOR ELSE 0 END) * (TXCREDITO / 100), 2) AS TAXACREDITO,
  ROUND(SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) * (TXDEBITO / 100), 2) AS TAXADEBITO,

  -- Valor líquido
  CAST(SUM(VALOR) AS DECIMAL(16, 2)) -
  CAST(
    ROUND(SUM(CASE WHEN TIPOCARTAO = 'C' THEN VALOR ELSE 0 END) * (TXCREDITO / 100), 2) +
    ROUND(SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) * (TXDEBITO / 100), 2)
    AS DECIMAL(16, 2)
  ) AS VALLIQUIDO

FROM (
  SELECT
    CONTAS_RECEBER.IDBANDEIRA,
    'TEF' AS TIPO,
    ADMINISTRADORAS_BANDEIRA.DESCRINSTITUICAO AS BANDEIRA,
    EMPRESA.IDEMPRESA,
    CONTAS_RECEBER.VALTITULO AS VALOR,
    CONTAS_RECEBER.TIPOCARTAO,
    CONTAS_RECEBER.DIGITOTITULO,
    EMPRESA.NOMEFANTASIA,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAO AS TXCREDITO,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAODEB AS TXDEBITO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.ADMINISTRADORAS,
    DBA.ADMINISTRADORAS_BANDEIRA,
    DBA.CLIENTE_FORNECEDOR,
    DBA.EMPRESA
  WHERE
    ADMINISTRADORAS_BANDEIRA.IDBANDEIRA = CONTAS_RECEBER.IDBANDEIRA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = CONTAS_RECEBER.IDADMINISTRADORA AND
    ADMINISTRADORAS_BANDEIRA.IDEMPRESA = CONTAS_RECEBER.IDEMPRESA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = ADMINISTRADORAS.IDADMINISTRADORA AND
    CONTAS_RECEBER.IDCLIFOR = CLIENTE_FORNECEDOR.IDCLIFOR AND
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDNSUHOST IS NOT NULL AND
    CONTAS_RECEBER.ORIGEMMOVIMENTO <> 'TES'

  UNION ALL

  SELECT
    CONTAS_RECEBER.IDBANDEIRA,
    'POS' AS TIPO,
    ADMINISTRADORAS_BANDEIRA.DESCRINSTITUICAO AS BANDEIRA,
    EMPRESA.IDEMPRESA,
    CONTAS_RECEBER.VALTITULO AS VALOR,
    CONTAS_RECEBER.TIPOCARTAO,
    CONTAS_RECEBER.DIGITOTITULO,
    EMPRESA.NOMEFANTASIA,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAO AS TXCREDITO,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAODEB AS TXDEBITO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.ADMINISTRADORAS,
    DBA.ADMINISTRADORAS_BANDEIRA,
    DBA.CLIENTE_FORNECEDOR,
    DBA.EMPRESA
  WHERE
    ADMINISTRADORAS_BANDEIRA.IDBANDEIRA = CONTAS_RECEBER.IDBANDEIRA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = CONTAS_RECEBER.IDADMINISTRADORA AND
    ADMINISTRADORAS_BANDEIRA.IDEMPRESA = CONTAS_RECEBER.IDEMPRESA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = ADMINISTRADORAS.IDADMINISTRADORA AND
    CONTAS_RECEBER.IDCLIFOR = CLIENTE_FORNECEDOR.IDCLIFOR AND
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDNSUHOST IS NULL AND
    CONTAS_RECEBER.ORIGEMMOVIMENTO <> 'TES'
) AS TMP

GROUP BY
  IDBANDEIRA,
  TIPO,
  BANDEIRA,
  IDEMPRESA,
  NOMEFANTASIA,
  TXCREDITO,
  TXDEBITO

ORDER BY
  TIPO
) AS C

UNION

 (
    SELECT 
NULL AS IDBANDEIRA,
'DINHEIRO' AS TIPO,
NULL AS BANDEIRA,
EMPRESA.IDEMPRESA,
EMPRESA.NOMEFANTASIA,
NULL AS  DEBITO,
NULL AS PARCELA_1X,
NULL AS PARCELA_2X,
 SUM(CONTAS_RECEBER.VALTITULO) AS VALOR_TOTAL,
NULL AS TXCREDITO,
NULL AS TXDEBITO,
NULL AS TAXACREDITO,
NULL AS TAXADEBITO,
 SUM(CONTAS_RECEBER.VALTITULO) AS VALLIQUIDO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.EMPRESA
  WHERE
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDRECEBIMENTO = 17 AND
    CONTAS_RECEBER.IDADMINISTRADORA IS NULL
    GROUP BY
    EMPRESA.IDEMPRESA,
    EMPRESA.NOMEFANTASIA
)

"
  arguments=(("ra_idempresa", number), ("RA_DTMOVI", date), ("RA_DTMOVIFINAL", date))
 sort="tipo A"
)
compute(name=compute_9 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-7" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="384" y="176" height="224" width="2322" format="[GENERAL]" expression="uf_filtros()" alignment="2" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_7 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="18" y="24" height="56" width="2290" format="[GENERAL]" expression="uf_nomeempresa()" alignment="0" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_3 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-12" font.pitch="2" font.weight="700" background.mode="2" background.color="16777215" color="0" x="37" y="88" height="84" width="3314" format="[GENERAL]" expression="uf_titulo() " alignment="2" border="0" html.valueishtml="0" crosstab.repeat=no )
line(name=l_52 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="0" y1="0" x2="0" y2="0" )
line(name=l_24 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="9" y1="12" x2="3369" y2="12" )
compute(name=compute_8 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="2757" y="24" height="56" width="576" format="dd/mm/yyyy hh:mm:ss" expression="today()" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_5 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="2848" y="340" height="56" width="485" format="[GENERAL]" expression="uf_versao()" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_12 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="32" y="340" height="56" width="485" format="[GENERAL]" expression="uf_pasta()" alignment="0" border="0" html.valueishtml="0" crosstab.repeat=no )
line(name=l_32 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="9" y1="416" x2="9" y2="600" )
line(name=l_23 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="9" y1="416" x2="3369" y2="416" )
line(name=l_21 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="9" y1="604" x2="3369" y2="604" )
line(name=l_1 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1371" y1="416" x2="1371" y2="600" )
line(name=l_7 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="530" y1="416" x2="530" y2="600" )
line(name=l_12 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="293" y1="416" x2="293" y2="600" )
text(name=t_15 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="306" y="540" height="56" width="215" text="Código" html.valueishtml="0" )
text(name=t_8 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="0" border="0" x="553" y="540" height="56" width="805" text="Bandeira" html.valueishtml="0" )
text(name=t_9 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="1390" y="540" height="56" width="229" text="DÉBITO" html.valueishtml="0" )
text(name=t_7 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="46" y="540" height="56" width="215" text="Tipo" html.valueishtml="0" )
line(name=l_2 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2825" y1="416" x2="2825" y2="600" )
line(name=l_28 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2670" y1="416" x2="2670" y2="600" )
line(name=l_9 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2327" y1="416" x2="2327" y2="600" )
line(name=l_5 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1632" y1="416" x2="1632" y2="600" )
text(name=t_6 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="1682" y="540" height="56" width="279" text="1X" html.valueishtml="0" )
line(name=l_27 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1979" y1="416" x2="1979" y2="600" )
text(name=t_5 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="2002" y="540" height="56" width="302" text="2X" html.valueishtml="0" )
line(name=l_3 visible="1" band=header background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="3365" y1="416" x2="3365" y2="600" )
text(name=t_1 visible="1" band=header font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="2" border="0" x="2373" y="540" height="56" width="229" text="TOTAL" html.valueishtml="0" )
line(name=l_16 visible="1	if (page() = pagecount() , 1,0)" band=summary background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="9" y1="4" x2="3369" y2="4" )
text(name=t_10 visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" alignment="1" border="0" x="741" y="16" height="56" width="530" text="Total:" html.valueishtml="0" )
compute(name=compute_1 visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="2" background.color="1073741824" color="33554432" x="1678" y="16" height="56" width="288" format="[General]" expression="sum(   parcela_1x for all )" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_2 visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="2" background.color="1073741824" color="33554432" x="2016" y="16" height="56" width="288" format="[General]" expression="sum(   parcela_2x for all ) " alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_4 visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="2" background.color="1073741824" color="33554432" x="2363" y="16" height="56" width="288" format="###,###,###.00" expression="sum(   debito +  parcela_1x +  parcela_2x for all )" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_11 visible="1" band=summary font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="2" background.color="1073741824" color="33554432" x="1335" y="16" height="56" width="288" format="[General]" expression="sum(    debito for all )" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
compute(name=compute_10 visible="1	if (page() = pagecount() , 1,0)" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="27" y="20" height="56" width="3310" format="[GENERAL]" expression="uf_rodape()" alignment="0" border="0" html.valueishtml="0" crosstab.repeat=no )
line(name=l_25 visible="1	if (page() = pagecount() , 1,0)" band=footer background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="0" y1="8" x2="3360" y2="8" )
line(name=l_26 visible="1	if (page() = pagecount() , 1,0)" band=footer background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="0" y1="92" x2="3360" y2="92" )
compute(name=page_1 visible="1" band=footer font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="700" background.mode="1" background.color="536870912" color="33554432" x="2734" y="20" height="52" width="599" format="[general]" expression="'Página ' + page() + ' de ' + pageCount()" alignment="1" border="0" html.valueishtml="0" crosstab.repeat=no )
line(name=l_6 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="9" y1="0" x2="9" y2="72" )
line(name=l_41 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1371" y1="0" x2="1371" y2="72" )
line(name=l_35 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="530" y1="0" x2="530" y2="72" )
line(name=l_13 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="293" y1="0" x2="293" y2="72" )
column(name=idbandeira visible="1" band=detail id=1 x="306" y="0" height="56" width="215" color="33554432" border="0" alignment="1" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
column(name=bandeira visible="1" band=detail id=3 x="553" y="0" height="56" width="805" color="33554432" border="0" alignment="0" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
column(name=tipo visible="1" band=detail id=2 x="46" y="0" height="56" width="215" color="33554432" border="0" alignment="2" format="[General]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
line(name=l_15 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2825" y1="0" x2="2825" y2="72" )
line(name=l_48 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2670" y1="0" x2="2670" y2="72" )
line(name=l_10 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="2327" y1="0" x2="2327" y2="72" )
line(name=l_14 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1632" y1="0" x2="1632" y2="72" )
line(name=l_53 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="1979" y1="0" x2="1979" y2="72" )
column(name=parcela_1x visible="1" band=detail id=7 x="1659" y="8" height="56" width="306" color="33554432" border="0" alignment="0" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
column(name=parcela_2x visible="1" band=detail id=8 x="2011" y="8" height="56" width="288" color="33554432" border="0" alignment="0" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
column(name=valor_total visible="1" band=detail id=9 x="2373" y="8" height="56" width="288" color="33554432" border="0" alignment="1" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
line(name=l_8 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="5" pen.color="0" x1="3365" y1="0" x2="3365" y2="72" )
line(name=l_4 visible="1" band=detail background.mode="2" background.color="16777215" pen.style="0" pen.width="9" pen.color="0" x1="14" y1="76" x2="3374" y2="76" )
column(name=debito visible="1" band=detail id=6 x="1403" y="8" height="64" width="215" color="33554432" border="0" alignment="0" format="[general]" html.valueishtml="0" edit.focusrectangle=no edit.autohscroll=no edit.autoselect=no edit.autovscroll=no edit.case=any edit.codetable=no edit.displayonly=no edit.hscrollbar=no edit.imemode=0 edit.limit=0 edit.password=no edit.vscrollbar=no edit.validatecode=no edit.nilisnull=no edit.required=no criteria.required=no criteria.override_edit=no crosstab.repeat=no background.mode="2" background.color="1073741824" font.charset="0" font.face="Arial" font.family="2" font.height="-8" font.pitch="2" font.weight="400" tabsequence=0 )
htmltable(border="1" )
htmlgen(clientComputedFields="1" clientEvents="1" clientFormatting="0" clientScriptable="0" clientValidation="1" encodeSelfLinkArgs="1" generateDDDWFrames="1" generateJavaScript="1" netscapeLayers="0" pagingMethod=0 )
xhtmlgen() cssgen(sessionSpecific="0" )
xmlgen(inline="0" )
xsltgen()
jsgen()
export.xml(headGroups="1" includewhitespace="0" metadatatype=0 savemetadata=0 )
import.xml()
export.pdf(method=0 distill.customPostScript="0" xslfop.print="0" )
export.xhtml()
¿7G¿Criado por Cleverson Favero.

Relatorio criado para fechamento de cartoes.
O mesmo utiliza-se como base o Resumo de Transacoes do relatorio do Sitef.¿8H¿SELECT 
C.IDBANDEIRA,
C.TIPO,
C.BANDEIRA,
C.IDEMPRESA,
C.NOMEFANTASIA,
C.DEBITO,
C.PARCELA_1X,
C.PARCELA_2X,
C.VALOR_TOTAL,
C.TXCREDITO,
C.TXDEBITO,
C.TAXACREDITO,
C.TAXADEBITO,
C.VALLIQUIDO FROM  (
SELECT
  IDBANDEIRA,
  TIPO,
  BANDEIRA,
  IDEMPRESA,
  NOMEFANTASIA,

  -- PARCELAMENTOS SEPARADOS
  SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) AS DEBITO,
  SUM(CASE WHEN TIPOCARTAO = 'C' AND DIGITOTITULO = '01' THEN VALOR ELSE 0 END) AS PARCELA_1X,
  SUM(CASE WHEN TIPOCARTAO = 'C' AND DIGITOTITULO = '02' THEN VALOR ELSE 0 END) AS PARCELA_2X,

  -- VALOR TOTAL
  SUM(VALOR) AS VALOR_TOTAL,

  -- TAXAS
  TXCREDITO,
  TXDEBITO,
  ROUND(SUM(CASE WHEN TIPOCARTAO = 'C' THEN VALOR ELSE 0 END) * (TXCREDITO / 100), 2) AS TAXACREDITO,
  ROUND(SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) * (TXDEBITO / 100), 2) AS TAXADEBITO,

  -- VALOR LÍQUIDO
  CAST(SUM(VALOR) AS DECIMAL(16, 2)) -
  CAST(
    ROUND(SUM(CASE WHEN TIPOCARTAO = 'C' THEN VALOR ELSE 0 END) * (TXCREDITO / 100), 2) +
    ROUND(SUM(CASE WHEN TIPOCARTAO = 'D' THEN VALOR ELSE 0 END) * (TXDEBITO / 100), 2)
    AS DECIMAL(16, 2)
  ) AS VALLIQUIDO

FROM (
  SELECT
    CONTAS_RECEBER.IDBANDEIRA,
    'TEF' AS TIPO,
    ADMINISTRADORAS_BANDEIRA.DESCRINSTITUICAO AS BANDEIRA,
    EMPRESA.IDEMPRESA,
    CONTAS_RECEBER.VALTITULO AS VALOR,
    CONTAS_RECEBER.TIPOCARTAO,
    CONTAS_RECEBER.DIGITOTITULO,
    EMPRESA.NOMEFANTASIA,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAO AS TXCREDITO,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAODEB AS TXDEBITO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.ADMINISTRADORAS,
    DBA.ADMINISTRADORAS_BANDEIRA,
    DBA.CLIENTE_FORNECEDOR,
    DBA.EMPRESA
  WHERE
    ADMINISTRADORAS_BANDEIRA.IDBANDEIRA = CONTAS_RECEBER.IDBANDEIRA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = CONTAS_RECEBER.IDADMINISTRADORA AND
    ADMINISTRADORAS_BANDEIRA.IDEMPRESA = CONTAS_RECEBER.IDEMPRESA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = ADMINISTRADORAS.IDADMINISTRADORA AND
    CONTAS_RECEBER.IDCLIFOR = CLIENTE_FORNECEDOR.IDCLIFOR AND
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDNSUHOST IS NOT NULL AND
    CONTAS_RECEBER.ORIGEMMOVIMENTO <> 'TES'

  UNION ALL

  SELECT
    CONTAS_RECEBER.IDBANDEIRA,
    'POS' AS TIPO,
    ADMINISTRADORAS_BANDEIRA.DESCRINSTITUICAO AS BANDEIRA,
    EMPRESA.IDEMPRESA,
    CONTAS_RECEBER.VALTITULO AS VALOR,
    CONTAS_RECEBER.TIPOCARTAO,
    CONTAS_RECEBER.DIGITOTITULO,
    EMPRESA.NOMEFANTASIA,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAO AS TXCREDITO,
    ADMINISTRADORAS_BANDEIRA.PERTAXAADMINISTRACAODEB AS TXDEBITO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.ADMINISTRADORAS,
    DBA.ADMINISTRADORAS_BANDEIRA,
    DBA.CLIENTE_FORNECEDOR,
    DBA.EMPRESA
  WHERE
    ADMINISTRADORAS_BANDEIRA.IDBANDEIRA = CONTAS_RECEBER.IDBANDEIRA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = CONTAS_RECEBER.IDADMINISTRADORA AND
    ADMINISTRADORAS_BANDEIRA.IDEMPRESA = CONTAS_RECEBER.IDEMPRESA AND
    ADMINISTRADORAS_BANDEIRA.IDADMINISTRADORA = ADMINISTRADORAS.IDADMINISTRADORA AND
    CONTAS_RECEBER.IDCLIFOR = CLIENTE_FORNECEDOR.IDCLIFOR AND
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDNSUHOST IS NULL AND
    CONTAS_RECEBER.ORIGEMMOVIMENTO <> 'TES'
) AS TMP

GROUP BY
  IDBANDEIRA,
  TIPO,
  BANDEIRA,
  IDEMPRESA,
  NOMEFANTASIA,
  TXCREDITO,
  TXDEBITO

ORDER BY
  TIPO
) AS C

UNION

 (
    SELECT 
NULL AS IDBANDEIRA,
'DINHEIRO' AS TIPO,
NULL AS BANDEIRA,
EMPRESA.IDEMPRESA,
EMPRESA.NOMEFANTASIA,
NULL AS  DEBITO,
NULL AS PARCELA_1X,
NULL AS PARCELA_2X,
 SUM(CONTAS_RECEBER.VALTITULO) AS VALOR_TOTAL,
NULL AS TXCREDITO,
NULL AS TXDEBITO,
NULL AS TAXACREDITO,
NULL AS TAXADEBITO,
 SUM(CONTAS_RECEBER.VALTITULO) AS VALLIQUIDO
  FROM
    DBA.CONTAS_RECEBER
    LEFT OUTER JOIN DBA.NOTAS ON (
      CONTAS_RECEBER.IDEMPRESA = NOTAS.IDEMPRESA AND
      CONTAS_RECEBER.IDPLANILHA = NOTAS.IDPLANILHA AND
      CONTAS_RECEBER.IDCLIFOR = NOTAS.IDCLIFOR
    ),
    DBA.EMPRESA
  WHERE
    CONTAS_RECEBER.DTMOVIMENTO BETWEEN :RA_DTMOVI AND :RA_DTMOVIFINAL AND
    CONTAS_RECEBER.IDEMPRESA IN (:RA_IDEMPRESA) AND
    CONTAS_RECEBER.IDEMPRESA = EMPRESA.IDEMPRESA AND
    CONTAS_RECEBER.IDRECEBIMENTO = 17 AND
    CONTAS_RECEBER.IDADMINISTRADORA IS NULL
    GROUP BY
    EMPRESA.IDEMPRESA,
    EMPRESA.NOMEFANTASIA
)

¿9I¿F¿1J¿¿1K¿F¿1L¿¿1M¿¿1N¿¿1O¿¿1P¿¿1Q¿F¿1R¿6¿1S¿F¿1T¿¿1U¿14¿2A¿
||||||||||1	PASTTAB E PASTFIL NÃO EXPORTADOS 22.0
||||||||||6	Vendas	Vendas
||||||||||92	Data de vencimento inicial	d_filtro00321	1
93	Data de vencimento final	d_filtro00322	1
160	Informe a(s) empresa(s)	d_filtro0031	1
||||||||||1	PASTTAB E PASTFIL NÃO EXPORTADOS 22.0
||||||||||150052	160	RA_IDEMPRESA	=	1	T	F
150052	92	RA_DTMOVI	=	2	T	F
150052	93	RA_DTMOVIFINAL	=	3	T	F
||||||||||6	33	Frente de Caixa	Vendas da Frente de caixa
||||||||||	TABELAS NÃO EXPORTADAS 22.0	
||||||||||