import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, Calendar, Building2, Search, ArrowRight, ArrowLeft, 
  RotateCcw, CheckCircle2, Clock, Truck, Zap, Droplets, Home, 
  Phone, Receipt, UserCheck, CalendarCheck, HelpCircle, Copy, Check,
  ChevronDown, ChevronRight, Layers, Store, User, FileText, QrCode,
  Table as TableIcon, LayoutGrid, Eye, Hash, Tag, Maximize2, Minimize2,
  Download, ListFilter, List, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { ContasPagarPagamentos } from './ContasPagarPagamentos';
import { ContasPagarMensal } from './ContasPagarMensal';
import { ContasPagarParcelados } from './ContasPagarParcelados';

interface ContasPagarModuleProps {
  selectedStore?: string;
}

interface BoletoItem {
  LOJA: number;
  NUMERO_TITULO: number;
  IDCLIFOR: number;
  FAVORECIDO: string;
  VENCIMENTO: string;
  DATA_EMISSAO?: string;
  DATA_MOVIMENTO?: string;
  DATA_PAGAMENTO?: string;
  VALOR: number;
  VALOR_PAGO?: number;
  STATUS_BAIXADA: string;
  OBSERVACAO: string;
  ORIGEM: string;
  SERIE_NOTA?: string;
  NRO_DOCUMENTO?: string;
  BOLETO: string;
  CODIGO_BARRAS: string;
  CHAVE_PIX?: string;
  IDUSUARIO?: number;
  USUARIO_LANCAMENTO?: string;
  categoria: string;
  grupo: 'FORNECEDOR' | 'OUTROS';
  icone: string;
  corBadge: string;
}

interface DayData {
  data: string;
  fornecedores: BoletoItem[];
  outros: BoletoItem[];
  todos: BoletoItem[];
}

interface SummaryData {
  totalValor: number;
  qtdTotal: number;
  totalFornecedores: number;
  qtdFornecedores: number;
  totalOutros: number;
  qtdOutros: number;
}

export function ContasPagarModule({ selectedStore = 'todas' }: ContasPagarModuleProps) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [dataBase, setDataBase] = useState<string>(getTodayStr());
  // Abas Principais do Módulo Financeiro
  const [abaModulo, setAbaModulo] = useState<'diario' | 'pagamentos' | 'mensal' | 'parcelados'>('diario');
  const [statusFiltro, setStatusFiltro] = useState<'F' | 'T' | 'todos'>('F');
  const [busca, setBusca] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modo de Exibição: Lista (Clean com clique) vs Cards vs Tabela
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'cards' | 'tabela'>('lista');
  // Rolagem: Expandir página inteira (sem corte) vs Rolagem interna limitada
  const [rolagemLivre, setRolagemLivre] = useState<boolean>(true);

  // Controle de itens expandidos individualmente (para clique na linha ver detalhes)
  const [itensExpandidos, setItensExpandidos] = useState<Set<string>>(new Set());

  const toggleItemExpandido = (key: string) => {
    setItensExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandirTodosItens = (itens: BoletoItem[]) => {
    const keys = itens.map(i => `${i.LOJA}-${i.NUMERO_TITULO}`);
    setItensExpandidos(prev => new Set([...prev, ...keys]));
  };

  const recolherTodosItens = () => {
    setItensExpandidos(new Set());
  };

  // Controle de lojas colapsadas/expandidas
  const [lojasAbertasHoje, setLojasAbertasHoje] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [lojasAbertasAmanha, setLojasAbertasAmanha] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  const toggleLojaHoje = (loja: number) => {
    setLojasAbertasHoje(prev => ({ ...prev, [loja]: !prev[loja] }));
  };

  const toggleLojaAmanha = (loja: number) => {
    setLojasAbertasAmanha(prev => ({ ...prev, [loja]: !prev[loja] }));
  };

  const setTodasLojasHoje = (abrir: boolean) => {
    setLojasAbertasHoje({ 1: abrir, 2: abrir, 3: abrir });
  };

  const setTodasLojasAmanha = (abrir: boolean) => {
    setLojasAbertasAmanha({ 1: abrir, 2: abrir, 3: abrir });
  };

  // Filtro de Loja Global e por coluna
  const [lojaGlobal, setLojaGlobal] = useState<string>('todas');
  const [lojaAtivaHoje, setLojaAtivaHoje] = useState<string>('todas');
  const [lojaAtivaAmanha, setLojaAtivaAmanha] = useState<string>('todas');

  const selecionarLojaGlobal = (loja: string) => {
    setLojaGlobal(loja);
    setLojaAtivaHoje(loja);
    setLojaAtivaAmanha(loja);
  };

  // Filtro de Categoria ativa por coluna
  const [categoriaAtivaHoje, setCategoriaAtivaHoje] = useState<'TODOS' | 'FORNECEDORES' | 'OUTROS'>('TODOS');
  const [categoriaAtivaAmanha, setCategoriaAtivaAmanha] = useState<'TODOS' | 'FORNECEDORES' | 'OUTROS'>('TODOS');

  // Modo de exibição: 'AGRUPADO' (blocos por loja) ou 'LISTA'
  const [modoExibicao, setModoExibicao] = useState<'AGRUPADO' | 'LISTA'>('AGRUPADO');

  // Estados dos dados da API
  const [resumoHoje, setResumoHoje] = useState<SummaryData>({
    totalValor: 0, qtdTotal: 0, totalFornecedores: 0, qtdFornecedores: 0, totalOutros: 0, qtdOutros: 0
  });
  const [resumoAmanha, setResumoAmanha] = useState<SummaryData>({
    totalValor: 0, qtdTotal: 0, totalFornecedores: 0, qtdFornecedores: 0, totalOutros: 0, qtdOutros: 0
  });
  const [diaAtualData, setDiaAtualData] = useState<DayData>({
    data: '', fornecedores: [], outros: [], todos: []
  });
  const [proximoDiaData, setProximoDiaData] = useState<DayData>({
    data: '', fornecedores: [], outros: [], todos: []
  });

  // Carrega dados da API
  const carregarBoletos = async () => {
    setLoading(true);
    try {
      const url = `/api/financeiro/contas-pagar?dataBase=${dataBase}&loja=todas&status=${statusFiltro}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar contas a pagar');
      const data = await res.json();

      setResumoHoje(data.resumoDiaAtual || { totalValor: 0, qtdTotal: 0, totalFornecedores: 0, qtdFornecedores: 0, totalOutros: 0, qtdOutros: 0 });
      setResumoAmanha(data.resumoProximoDia || { totalValor: 0, qtdTotal: 0, totalFornecedores: 0, qtdFornecedores: 0, totalOutros: 0, qtdOutros: 0 });
      setDiaAtualData(data.diaAtual || { data: dataBase, fornecedores: [], outros: [], todos: [] });
      setProximoDiaData(data.proximoDia || { data: data.dataProxima, fornecedores: [], outros: [], todos: [] });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao conectar com o financeiro DB2');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarBoletos();
  }, [dataBase, statusFiltro]);

  // Navegação de datas
  const irParaHoje = () => {
    setDataBase(getTodayStr());
    toast.info('Data redefinida para hoje');
  };

  const mudarDia = (dias: number) => {
    const d = new Date(dataBase + 'T12:00:00Z');
    d.setDate(d.getDate() + dias);
    setDataBase(d.toISOString().split('T')[0]);
  };

  // Formatação de Moeda
  const fmtMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  // Formatação de Data Amigável
  const fmtDataExtenso = (dataIso: string) => {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const semana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][d.getDay()];
    return `${semana}, ${dia}/${mes}/${ano}`;
  };

  // Formatação de Data Curta (DD/MM/AAAA)
  const fmtDataCurta = (dataIso?: string) => {
    if (!dataIso) return '—';
    const parts = dataIso.trim().split('-');
    if (parts.length < 3) return dataIso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Copiar código de barras
  const copiarCodigo = (codigo: string, id: number) => {
    if (!codigo) {
      toast.info('Código de barras não informado neste título');
      return;
    }
    navigator.clipboard.writeText(codigo);
    setCopiedId(id);
    toast.success('Código do boleto copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Ícone por categoria
  const renderIcone = (iconeName: string) => {
    switch (iconeName) {
      case 'Zap': return <Zap className="size-3.5" />;
      case 'Droplets': return <Droplets className="size-3.5" />;
      case 'Home': return <Home className="size-3.5" />;
      case 'Phone': return <Phone className="size-3.5" />;
      case 'Receipt': return <Receipt className="size-3.5" />;
      case 'UserCheck': return <UserCheck className="size-3.5" />;
      case 'CalendarCheck': return <CalendarCheck className="size-3.5" />;
      case 'Truck': return <Truck className="size-3.5" />;
      default: return <HelpCircle className="size-3.5" />;
    }
  };

  // Limpeza de texto para tratar acentos ou caracteres especiais do DB2
  const limparTexto = (txt?: string) => {
    if (!txt) return '';
    return txt
      .replace(/\uFFFD/g, 'Ó')
      .replace(/ROTA MACEI\b/gi, 'ROTA MACEIÓ')
      .trim();
  };

  // ======== CARD ENRIQUECIDO DE BOLETO (REUTILIZÁVEL) ========
  const renderCardBoleto = (boleto: BoletoItem, idx: number, accentColor: 'cyan' | 'blue') => {
    const borderHover = accentColor === 'cyan' ? 'hover:border-cyan-500/40 hover:shadow-cyan-500/10' : 'hover:border-blue-500/40 hover:shadow-blue-500/10';
    const copyColor = accentColor === 'cyan' ? 'text-cyan-400' : 'text-blue-400';
    const nomeFavorecido = limparTexto(boleto.FAVORECIDO);

    return (
      <div
        key={`${boleto.LOJA}-${boleto.NUMERO_TITULO}-${idx}`}
        className={`bg-slate-950/60 hover:bg-slate-900/80 border border-white/10 ${borderHover} rounded-xl p-3.5 transition-all flex flex-col gap-2.5 group shadow-sm`}
      >
        {/* Linha 1: Categoria Badge + Origem + Valor */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 flex items-center gap-1 shadow-sm ${boleto.corBadge}`}>
              {renderIcone(boleto.icone)}
              {boleto.categoria}
            </span>
            {boleto.ORIGEM && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/5 border border-white/10 text-slate-300 shrink-0 flex items-center gap-1">
                <FileText className="size-2.5 text-slate-400" />
                {boleto.ORIGEM}
              </span>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-base font-extrabold text-emerald-400 tracking-tight">
              {fmtMoeda(boleto.VALOR)}
            </div>
            <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${boleto.STATUS_BAIXADA === 'T' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
              {boleto.STATUS_BAIXADA === 'T' ? '● Pago' : '● Em Aberto'}
            </span>
          </div>
        </div>

        {/* Linha 2: Favorecido + Nº Título */}
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
          <div className="font-bold text-sm text-slate-100 truncate" title={nomeFavorecido}>
            {nomeFavorecido}
          </div>
          <div className="text-xs text-slate-300 font-mono font-bold shrink-0 bg-white/5 px-2 py-0.5 rounded border border-white/5">
            Nº {boleto.NUMERO_TITULO}
          </div>
        </div>

        {/* Linha 3: Informações Fiscais e Usuário */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[11px] bg-black/40 border border-white/5 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="size-3 text-slate-500 shrink-0" />
            <span>Emissão: <strong className="text-slate-200">{fmtDataCurta(boleto.DATA_EMISSAO)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="size-3 text-slate-500 shrink-0" />
            <span>Movim.: <strong className="text-slate-200">{fmtDataCurta(boleto.DATA_MOVIMENTO)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 col-span-2 sm:col-span-1">
            <User className="size-3 text-amber-400 shrink-0" />
            <span>Lançado por: <strong className="text-amber-300 font-bold">{boleto.USUARIO_LANCAMENTO || '—'}</strong></span>
          </div>
          {boleto.SERIE_NOTA && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Hash className="size-3 text-slate-500 shrink-0" />
              <span>Série: <strong className="text-slate-200">{boleto.SERIE_NOTA}</strong></span>
            </div>
          )}
          {boleto.NRO_DOCUMENTO && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <FileText className="size-3 text-slate-500 shrink-0" />
              <span>Doc: <strong className="text-slate-200">{boleto.NRO_DOCUMENTO}</strong></span>
            </div>
          )}
          {Boolean((boleto.VALOR_PAGO || 0) > 0) && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
              <span>Pago: <strong className="text-emerald-300 font-bold">{fmtMoeda(boleto.VALOR_PAGO || 0)}</strong></span>
            </div>
          )}
          {boleto.DATA_PAGAMENTO && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <CalendarCheck className="size-3 text-emerald-400 shrink-0" />
              <span>Dt Pgto: <strong className="text-emerald-300">{fmtDataCurta(boleto.DATA_PAGAMENTO)}</strong></span>
            </div>
          )}
        </div>

        {/* Linha 4: Observação */}
        {boleto.OBSERVACAO && (
          <p className="text-[11px] text-slate-300 italic bg-white/5 p-2 rounded border border-white/5">
            {limparTexto(boleto.OBSERVACAO)}
          </p>
        )}

        {/* Linha 5: Chave PIX */}
        {boleto.CHAVE_PIX && (
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <QrCode className="size-3.5 text-purple-400 shrink-0" />
              <span className="font-semibold text-purple-300 text-[10px] uppercase">PIX:</span>
              <span className="truncate font-mono text-purple-200">{boleto.CHAVE_PIX}</span>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(boleto.CHAVE_PIX || ''); toast.success('Chave PIX copiada!'); }}
              className="flex items-center gap-1 text-purple-300 hover:text-white shrink-0 px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/40 transition-colors text-[10px] font-bold"
            >
              <Copy className="size-3" /> Copiar
            </button>
          </div>
        )}

        {/* Linha 6: Código de barras / Boleto */}
        {(boleto.BOLETO || boleto.CODIGO_BARRAS) && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
            <span className="truncate font-mono text-slate-300 text-[10px]">
              {boleto.CODIGO_BARRAS || boleto.BOLETO}
            </span>
            <button
              onClick={() => copiarCodigo(boleto.CODIGO_BARRAS || boleto.BOLETO, boleto.NUMERO_TITULO)}
              className="flex items-center gap-1 hover:text-white shrink-0 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-semibold"
              title="Copiar código do boleto"
            >
              {copiedId === boleto.NUMERO_TITULO ? (
                <Check className="size-3 text-emerald-400" />
              ) : (
                <Copy className={`size-3 ${copyColor}`} />
              )}
              {copiedId === boleto.NUMERO_TITULO ? 'Copiado' : 'Copiar Linha'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ======== MODO TABELA DENSA (REUTILIZÁVEL) ========
  const renderTabelaBoletos = (grupos: { loja: number; total: number; totalFornec: number; totalOutros: number; itens: BoletoItem[] }[], accentColor: 'cyan' | 'blue', lojasAbertas: Record<number, boolean>, toggleLoja: (loja: number) => void) => {
    const copyColor = accentColor === 'cyan' ? 'text-cyan-400' : 'text-blue-400';

    return (
      <div className="flex flex-col gap-4">
        {grupos.map((grupo) => {
          const aberta = lojasAbertas[grupo.loja] ?? true;

          return (
            <div key={`tabela-grupo-${grupo.loja}`} className="rounded-xl border border-white/10 overflow-hidden bg-black/40 shadow-md">
              {/* Cabeçalho da Loja */}
              <button
                type="button"
                onClick={() => toggleLoja(grupo.loja)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-all text-left ${
                  accentColor === 'cyan' 
                    ? 'bg-gradient-to-r from-cyan-950/50 via-slate-900/60 to-black/40 hover:from-cyan-950/70 border-b border-cyan-500/20' 
                    : 'bg-gradient-to-r from-blue-950/50 via-slate-900/60 to-black/40 hover:from-blue-950/70 border-b border-blue-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-lg ${accentColor === 'cyan' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {aberta ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </span>
                  <Store className={`size-4 ${accentColor === 'cyan' ? 'text-cyan-400' : 'text-blue-400'}`} />
                  <span className="font-extrabold text-sm text-white tracking-wide">
                    LOJA 0{grupo.loja}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {grupo.itens.length} {grupo.itens.length === 1 ? 'título' : 'títulos'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Fornecedores: <strong className="text-emerald-400">{fmtMoeda(grupo.totalFornec)}</strong>
                  </span>
                  <span className="text-sm md:text-base font-extrabold text-emerald-400">
                    {fmtMoeda(grupo.total)}
                  </span>
                </div>
              </button>

              {/* Tabela de Linhas da Loja */}
              {aberta && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Favorecido / Categoria</th>
                        <th className="py-2.5 px-2">Título / Doc</th>
                        <th className="py-2.5 px-2">Lançado Por</th>
                        <th className="py-2.5 px-2">Emissão / Mov.</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {grupo.itens.map((boleto, idx) => {
                        const nomeFavorecido = limparTexto(boleto.FAVORECIDO);

                        return (
                          <tr 
                            key={`tab-row-${boleto.LOJA}-${boleto.NUMERO_TITULO}-${idx}`}
                            className="hover:bg-white/[0.04] transition-colors group"
                          >
                            {/* Favorecido & Categoria */}
                            <td className="py-2.5 px-3 min-w-[200px]">
                              <div className="font-bold text-slate-100 truncate max-w-[240px]" title={nomeFavorecido}>
                                {nomeFavorecido}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border flex items-center gap-0.5 ${boleto.corBadge}`}>
                                  {renderIcone(boleto.icone)}
                                  {boleto.categoria}
                                </span>
                                {boleto.ORIGEM && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-white/5 text-slate-400">
                                    {boleto.ORIGEM}
                                  </span>
                                )}
                              </div>
                              {boleto.OBSERVACAO && (
                                <div className="text-[10px] text-slate-400 italic truncate max-w-[240px] mt-0.5">
                                  {limparTexto(boleto.OBSERVACAO)}
                                </div>
                              )}
                            </td>

                            {/* Título & Doc */}
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-200">
                                Nº {boleto.NUMERO_TITULO}
                              </span>
                              {(boleto.NRO_DOCUMENTO || boleto.SERIE_NOTA) && (
                                <div className="text-[10px] text-slate-400">
                                  {boleto.NRO_DOCUMENTO ? `Doc: ${boleto.NRO_DOCUMENTO}` : ''}
                                  {boleto.SERIE_NOTA ? ` (Série ${boleto.SERIE_NOTA})` : ''}
                                </div>
                              )}
                            </td>

                            {/* Lançado Por */}
                            <td className="py-2.5 px-2 whitespace-nowrap">
                              <div className="flex items-center gap-1 font-semibold text-amber-300">
                                <User className="size-3 text-amber-400 shrink-0" />
                                <span>{boleto.USUARIO_LANCAMENTO || '—'}</span>
                              </div>
                            </td>

                            {/* Emissão / Movimento */}
                            <td className="py-2.5 px-2 whitespace-nowrap text-slate-400">
                              <div>Em: <strong className="text-slate-300">{fmtDataCurta(boleto.DATA_EMISSAO)}</strong></div>
                              <div className="text-[10px]">Mov: {fmtDataCurta(boleto.DATA_MOVIMENTO)}</div>
                            </td>

                            {/* Valor */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="font-extrabold text-sm text-emerald-400">
                                {fmtMoeda(boleto.VALOR)}
                              </div>
                              {Boolean((boleto.VALOR_PAGO || 0) > 0) && (
                                <div className="text-[10px] text-slate-400">
                                  Pago: {fmtMoeda(boleto.VALOR_PAGO || 0)}
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                boleto.STATUS_BAIXADA === 'T' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              }`}>
                                {boleto.STATUS_BAIXADA === 'T' ? 'PAGO' : 'EM ABERTO'}
                              </span>
                            </td>

                            {/* Ações */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {(boleto.CODIGO_BARRAS || boleto.BOLETO) && (
                                  <button
                                    onClick={() => copiarCodigo(boleto.CODIGO_BARRAS || boleto.BOLETO, boleto.NUMERO_TITULO)}
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                                    title="Copiar código do boleto"
                                  >
                                    {copiedId === boleto.NUMERO_TITULO ? (
                                      <Check className="size-3 text-emerald-400" />
                                    ) : (
                                      <Copy className={`size-3 ${copyColor}`} />
                                    )}
                                  </button>
                                )}
                                {boleto.CHAVE_PIX && (
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(boleto.CHAVE_PIX || ''); toast.success('Chave PIX copiada!'); }}
                                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white transition-colors"
                                    title={`Copiar PIX: ${boleto.CHAVE_PIX}`}
                                  >
                                    <QrCode className="size-3 text-purple-400" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  // ======== MODO LISTA COMPACTA COM EXPANSÃO AO CLICAR (SOLICITADO PELO USUÁRIO) ========
  const renderListaCompactaBoletos = (
    grupos: { loja: number; total: number; totalFornec: number; totalOutros: number; itens: BoletoItem[] }[],
    accentColor: 'cyan' | 'blue',
    lojasAbertas: Record<number, boolean>,
    toggleLoja: (loja: number) => void
  ) => {
    const copyColor = accentColor === 'cyan' ? 'text-cyan-400' : 'text-blue-400';

    return (
      <div className="flex flex-col gap-3">
        {grupos.map((grupo) => {
          const aberta = lojasAbertas[grupo.loja] ?? true;

          return (
            <div key={`lista-compacta-grupo-${grupo.loja}`} className="rounded-xl border border-white/10 overflow-hidden bg-black/40 shadow-sm">
              {/* Cabeçalho da Loja */}
              <button
                type="button"
                onClick={() => toggleLoja(grupo.loja)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-all text-left ${
                  accentColor === 'cyan' 
                    ? 'bg-gradient-to-r from-cyan-950/50 via-slate-900/60 to-black/40 hover:from-cyan-950/70 border-b border-cyan-500/20' 
                    : 'bg-gradient-to-r from-blue-950/50 via-slate-900/60 to-black/40 hover:from-blue-950/70 border-b border-blue-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded-lg ${accentColor === 'cyan' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {aberta ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </span>
                  <Store className={`size-4 ${accentColor === 'cyan' ? 'text-cyan-400' : 'text-blue-400'}`} />
                  <span className="font-extrabold text-xs md:text-sm text-white tracking-wide">
                    LOJA 0{grupo.loja}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                    {grupo.itens.length} {grupo.itens.length === 1 ? 'título' : 'títulos'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Fornec: <strong className="text-emerald-400">{fmtMoeda(grupo.totalFornec)}</strong>
                  </span>
                  <span className="text-sm font-extrabold text-emerald-400">
                    {fmtMoeda(grupo.total)}
                  </span>
                </div>
              </button>

              {/* Lista Compacta de Fornecedores */}
              {aberta && (
                <div className="p-2 flex flex-col gap-1.5 divide-y divide-white/5">
                  {grupo.itens.map((boleto, idx) => {
                    const itemKey = `${boleto.LOJA}-${boleto.NUMERO_TITULO}-${idx}`;
                    const isExpandido = itensExpandidos.has(itemKey);
                    const nomeFavorecido = limparTexto(boleto.FAVORECIDO);

                    return (
                      <div
                        key={itemKey}
                        className={`rounded-xl border transition-all pt-1.5 first:pt-0 ${
                          isExpandido
                            ? 'bg-slate-900/80 border-cyan-500/40 shadow-md'
                            : 'bg-black/20 hover:bg-white/[0.04] border-transparent hover:border-white/10'
                        }`}
                      >
                        {/* Linha Principal (Fornecedor + Valor ao lado, clicável) */}
                        <div
                          onClick={() => toggleItemExpandido(itemKey)}
                          className="px-2.5 py-2 flex items-center justify-between gap-3 cursor-pointer select-none group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className={`p-1 rounded text-slate-400 group-hover:text-white transition-transform ${isExpandido ? 'rotate-90 text-cyan-400' : ''}`}>
                              <ChevronRight className="size-3.5" />
                            </span>

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs md:text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors" title={nomeFavorecido}>
                                  {nomeFavorecido}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${boleto.corBadge}`}>
                                  {boleto.categoria}
                                </span>
                                {boleto.ORIGEM && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-white/5 text-slate-400 shrink-0">
                                    {boleto.ORIGEM}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-300">Nº {boleto.NUMERO_TITULO}</span>
                                {boleto.USUARIO_LANCAMENTO && (
                                  <>
                                    <span>•</span>
                                    <span className="text-amber-400/90 font-medium">Por: {boleto.USUARIO_LANCAMENTO}</span>
                                  </>
                                )}
                                {boleto.NRO_DOCUMENTO && (
                                  <>
                                    <span>•</span>
                                    <span>Doc: {boleto.NRO_DOCUMENTO}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Valor ao lado e Status */}
                          <div className="text-right shrink-0">
                            <div className="text-sm md:text-base font-extrabold text-emerald-400 tracking-tight">
                              {fmtMoeda(boleto.VALOR)}
                            </div>
                            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${boleto.STATUS_BAIXADA === 'T' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                              {boleto.STATUS_BAIXADA === 'T' ? 'Pago' : 'Em Aberto'}
                            </span>
                          </div>
                        </div>

                        {/* Gaveta de Detalhes Completa ao Clicar */}
                        {isExpandido && (
                          <div className="p-3 bg-black/50 border-t border-white/5 rounded-b-xl flex flex-col gap-2.5 animate-in fade-in duration-150">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="size-3 text-slate-500 shrink-0" />
                                <span>Emissão: <strong className="text-slate-200">{fmtDataCurta(boleto.DATA_EMISSAO)}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <Calendar className="size-3 text-slate-500 shrink-0" />
                                <span>Movimento: <strong className="text-slate-200">{fmtDataCurta(boleto.DATA_MOVIMENTO)}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <User className="size-3 text-amber-400 shrink-0" />
                                <span>Lançado por: <strong className="text-amber-300 font-bold">{boleto.USUARIO_LANCAMENTO || '—'}</strong></span>
                              </div>
                              {boleto.SERIE_NOTA && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Hash className="size-3 text-slate-500 shrink-0" />
                                  <span>Série Nota: <strong className="text-slate-200">{boleto.SERIE_NOTA}</strong></span>
                                </div>
                              )}
                              {boleto.NRO_DOCUMENTO && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <FileText className="size-3 text-slate-500 shrink-0" />
                                  <span>Nº Documento: <strong className="text-slate-200">{boleto.NRO_DOCUMENTO}</strong></span>
                                </div>
                              )}
                              {Boolean((boleto.VALOR_PAGO || 0) > 0) && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                                  <span>Valor Pago: <strong className="text-emerald-300 font-bold">{fmtMoeda(boleto.VALOR_PAGO || 0)}</strong></span>
                                </div>
                              )}
                              {boleto.DATA_PAGAMENTO && (
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <CalendarCheck className="size-3 text-emerald-400 shrink-0" />
                                  <span>Data Pagamento: <strong className="text-emerald-300">{fmtDataCurta(boleto.DATA_PAGAMENTO)}</strong></span>
                                </div>
                              )}
                            </div>

                            {boleto.OBSERVACAO && (
                              <p className="text-[11px] text-slate-300 italic bg-white/5 p-2 rounded border border-white/5">
                                {limparTexto(boleto.OBSERVACAO)}
                              </p>
                            )}

                            {/* Chave PIX com botão Copiar */}
                            {boleto.CHAVE_PIX && (
                              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300 bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <QrCode className="size-3.5 text-purple-400 shrink-0" />
                                  <span className="font-semibold text-purple-300 text-[10px] uppercase">PIX:</span>
                                  <span className="truncate font-mono text-purple-200">{boleto.CHAVE_PIX}</span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(boleto.CHAVE_PIX || ''); toast.success('Chave PIX copiada!'); }}
                                  className="flex items-center gap-1 text-purple-300 hover:text-white shrink-0 px-2 py-0.5 rounded bg-purple-500/20 hover:bg-purple-500/40 transition-colors text-[10px] font-bold"
                                >
                                  <Copy className="size-3" /> Copiar
                                </button>
                              </div>
                            )}

                            {/* Código de Barras com botão Copiar */}
                            {(boleto.BOLETO || boleto.CODIGO_BARRAS) && (
                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
                                <span className="truncate font-mono text-slate-300 text-[10px]">
                                  {boleto.CODIGO_BARRAS || boleto.BOLETO}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copiarCodigo(boleto.CODIGO_BARRAS || boleto.BOLETO, boleto.NUMERO_TITULO); }}
                                  className="flex items-center gap-1 hover:text-white shrink-0 px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-semibold"
                                  title="Copiar código do boleto"
                                >
                                  {copiedId === boleto.NUMERO_TITULO ? (
                                    <Check className="size-3 text-emerald-400" />
                                  ) : (
                                    <Copy className={`size-3 ${copyColor}`} />
                                  )}
                                  {copiedId === boleto.NUMERO_TITULO ? 'Copiado' : 'Copiar Linha'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Agrupamento por Loja com totais
  const agruparPorLoja = (lista: BoletoItem[], lojaFiltro: string, categoriaFiltro: 'TODOS' | 'FORNECEDORES' | 'OUTROS') => {
    let filtrada = lista;

    // Filtro por Loja se selecionada
    if (lojaFiltro !== 'todas') {
      filtrada = filtrada.filter(item => String(item.LOJA) === String(lojaFiltro));
    }

    // Filtro por Categoria
    if (categoriaFiltro === 'FORNECEDORES') {
      filtrada = filtrada.filter(item => item.grupo === 'FORNECEDOR');
    } else if (categoriaFiltro === 'OUTROS') {
      filtrada = filtrada.filter(item => item.grupo === 'OUTROS');
    }

    // Filtro de Busca Aprimorado e Multicritério
    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      filtrada = filtrada.filter(item => {
        const favorecido = (item.FAVORECIDO || '').toLowerCase();
        const numTitulo = String(item.NUMERO_TITULO || '');
        const nroDoc = (item.NRO_DOCUMENTO || '').toLowerCase();
        const serieNota = (item.SERIE_NOTA || '').toLowerCase();
        const categoria = (item.categoria || '').toLowerCase();
        const grupo = (item.grupo || '').toLowerCase();
        const obs = (item.OBSERVACAO || '').toLowerCase();
        const usuario = (item.USUARIO_LANCAMENTO || '').toLowerCase();
        const boletoCod = (item.BOLETO || '').toLowerCase();
        const barras = (item.CODIGO_BARRAS || '').toLowerCase();
        const chavePix = (item.CHAVE_PIX || '').toLowerCase();
        const valorStr = String(item.VALOR || '');
        const valorPagoStr = String(item.VALOR_PAGO || '');
        const valorFormatado = fmtMoeda(item.VALOR).toLowerCase();

        return (
          favorecido.includes(q) ||
          numTitulo.includes(q) ||
          nroDoc.includes(q) ||
          serieNota.includes(q) ||
          categoria.includes(q) ||
          grupo.includes(q) ||
          obs.includes(q) ||
          usuario.includes(q) ||
          boletoCod.includes(q) ||
          barras.includes(q) ||
          chavePix.includes(q) ||
          valorStr.includes(q) ||
          valorPagoStr.includes(q) ||
          valorFormatado.includes(q)
        );
      });
    }

    // Agrupa por ID da Loja
    const lojasMap = new Map<number, { loja: number; total: number; totalFornec: number; totalOutros: number; itens: BoletoItem[] }>();
    
    // Garante ordem das lojas 1, 2, 3
    [1, 2, 3].forEach(idLoja => {
      lojasMap.set(idLoja, { loja: idLoja, total: 0, totalFornec: 0, totalOutros: 0, itens: [] });
    });

    filtrada.forEach(item => {
      const idLoja = Number(item.LOJA) || 1;
      if (!lojasMap.has(idLoja)) {
        lojasMap.set(idLoja, { loja: idLoja, total: 0, totalFornec: 0, totalOutros: 0, itens: [] });
      }
      const lojaObj = lojasMap.get(idLoja)!;
      lojaObj.itens.push(item);
      lojaObj.total += item.VALOR;
      if (item.grupo === 'FORNECEDOR') lojaObj.totalFornec += item.VALOR;
      else lojaObj.totalOutros += item.VALOR;
    });

    // Retorna apenas lojas que possuem itens (ou todas se nenhuma loja tiver filtro)
    return Array.from(lojasMap.values()).filter(g => g.itens.length > 0);
  };

  // Lojas agrupadas para o Dia Atual e Próximo Dia
  const gruposHoje = useMemo(() => agruparPorLoja(diaAtualData.todos, lojaAtivaHoje, categoriaAtivaHoje), [diaAtualData, lojaAtivaHoje, categoriaAtivaHoje, busca]);
  const gruposAmanha = useMemo(() => agruparPorLoja(proximoDiaData.todos, lojaAtivaAmanha, categoriaAtivaAmanha), [proximoDiaData, lojaAtivaAmanha, categoriaAtivaAmanha, busca]);

  // Totais por Loja para o cabeçalho
  const totaisLojasHoje = useMemo(() => {
    const totais: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    diaAtualData.todos.forEach(item => {
      totais[item.LOJA] = (totais[item.LOJA] || 0) + item.VALOR;
    });
    return totais;
  }, [diaAtualData]);

  const totaisLojasAmanha = useMemo(() => {
    const totais: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    proximoDiaData.todos.forEach(item => {
      totais[item.LOJA] = (totais[item.LOJA] || 0) + item.VALOR;
    });
    return totais;
  }, [proximoDiaData]);

  // Itens consolidados para o Relatório de Impressão
  const itensParaImpressao = useMemo(() => {
    let base = diaAtualData.todos;
    if (lojaGlobal !== 'todas') {
      base = base.filter(i => String(i.LOJA) === String(lojaGlobal));
    }
    if (busca.trim()) {
      const q = busca.toLowerCase().trim();
      base = base.filter(item => {
        const favorecido = (item.FAVORECIDO || '').toLowerCase();
        const numTitulo = String(item.NUMERO_TITULO || '');
        const nroDoc = (item.NRO_DOCUMENTO || '').toLowerCase();
        const serieNota = (item.SERIE_NOTA || '').toLowerCase();
        const categoria = (item.categoria || '').toLowerCase();
        const grupo = (item.grupo || '').toLowerCase();
        const obs = (item.OBSERVACAO || '').toLowerCase();
        const usuario = (item.USUARIO_LANCAMENTO || '').toLowerCase();
        const boletoCod = (item.BOLETO || '').toLowerCase();
        const barras = (item.CODIGO_BARRAS || '').toLowerCase();
        const chavePix = (item.CHAVE_PIX || '').toLowerCase();
        const valorStr = String(item.VALOR || '');
        const valorPagoStr = String(item.VALOR_PAGO || '');
        const valorFormatado = fmtMoeda(item.VALOR).toLowerCase();

        return (
          favorecido.includes(q) ||
          numTitulo.includes(q) ||
          nroDoc.includes(q) ||
          serieNota.includes(q) ||
          categoria.includes(q) ||
          grupo.includes(q) ||
          obs.includes(q) ||
          usuario.includes(q) ||
          boletoCod.includes(q) ||
          barras.includes(q) ||
          chavePix.includes(q) ||
          valorStr.includes(q) ||
          valorPagoStr.includes(q) ||
          valorFormatado.includes(q)
        );
      });
    }
    return base;
  }, [diaAtualData, lojaGlobal, busca]);

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Visualização de Tela Interativa (Ocultada na Impressão) */}
      <div className="print-hidden flex flex-col gap-4">
        {/* NAVEGAÇÃO DE ABAS PRINCIPAIS DO MÓDULO FINANCEIRO */}
        <div className="glass-strong rounded-2xl p-1.5 md:p-2 border border-white/10 shadow-xl flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAbaModulo('diario')}
            className={`flex items-center gap-2 px-3.5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              abaModulo === 'diario'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="size-4 shrink-0" />
            <span>Contas do Dia (Hoje & Próximo)</span>
          </button>

          <button
            onClick={() => setAbaModulo('pagamentos')}
            className={`flex items-center gap-2 px-3.5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              abaModulo === 'pagamentos'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span>Pagamentos Realizados (Baixas)</span>
          </button>

          <button
            onClick={() => setAbaModulo('mensal')}
            className={`flex items-center gap-2 px-3.5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              abaModulo === 'mensal'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarCheck className="size-4 shrink-0" />
            <span>Visão Mensal (Mês Completo)</span>
          </button>

          <button
            onClick={() => setAbaModulo('parcelados')}
            className={`flex items-center gap-2 px-3.5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all ${
              abaModulo === 'parcelados'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="size-4 shrink-0" />
            <span>Dívidas & Parcelados (Última Parcela)</span>
          </button>
        </div>

        {/* 1. ABA DE PAGAMENTOS REALIZADOS (BAIXAS) */}
        {abaModulo === 'pagamentos' && (
          <ContasPagarPagamentos selectedStore={lojaGlobal} />
        )}

        {/* 2. ABA DE VISÃO MENSAL COMPLETA */}
        {abaModulo === 'mensal' && (
          <ContasPagarMensal selectedStore={lojaGlobal} />
        )}

        {/* 3. ABA DE DÍVIDAS & PARCELADOS COM ÚLTIMA PARCELA */}
        {abaModulo === 'parcelados' && (
          <ContasPagarParcelados selectedStore={lojaGlobal} />
        )}

        {/* 4. ABA DE CONTAS DO DIA (OPERACIONAL DIÁRIO) */}
        {abaModulo === 'diario' && (
          <>
            {/* 1. Header do Módulo & Barra de Filtros Principais */}
            <div className="glass-strong rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-white/10 shadow-xl">
              <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 grid place-items-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Wallet className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-200 to-white">
                  Contas a Pagar & Boletos
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Separado por Loja
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Planejamento diário: <strong className="text-slate-200">Dia Atual</strong> vs <strong className="text-slate-200">Próximo Dia</strong> organizados por Loja 1, Loja 2 e Loja 3
              </p>
            </div>
          </div>

          {/* Controles de Navegação, Filtros e Modos de Visualização */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Alternador de Modo de Visualização: Lista (Clean c/ clique) vs Cards vs Tabela */}
            <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setModoVisualizacao('lista')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  modoVisualizacao === 'lista' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Lista compacta com fornecedor e valor ao lado (clique na linha para ver todos os detalhes)"
              >
                <List className="size-3.5" />
                <span>Lista (Clique p/ Detalhes)</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('cards')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  modoVisualizacao === 'cards' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Cards Detalhados Abertos"
              >
                <LayoutGrid className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                onClick={() => setModoVisualizacao('tabela')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  modoVisualizacao === 'tabela' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar em Tabela Completa"
              >
                <TableIcon className="size-3.5" />
                <span>Tabela</span>
              </button>
            </div>

            {/* Alternador de Rolagem da Página */}
            <button
              onClick={() => setRolagemLivre(!rolagemLivre)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                rolagemLivre
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow'
                  : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
              }`}
              title={rolagemLivre ? 'Rolagem livre na página inteira (Sem limites)' : 'Rolagem presa em caixa interna'}
            >
              {rolagemLivre ? <Maximize2 className="size-3.5 text-cyan-400" /> : <Minimize2 className="size-3.5" />}
              <span>{rolagemLivre ? 'Página Livre' : 'Caixa c/ Barra'}</span>
            </button>

            {/* Seletor de Status */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-medium">
              <button
                onClick={() => setStatusFiltro('F')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFiltro === 'F' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                A Pagar
              </button>
              <button
                onClick={() => setStatusFiltro('T')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFiltro === 'T' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Pagos
              </button>
              <button
                onClick={() => setStatusFiltro('todos')}
                className={`px-2.5 py-1 rounded-lg transition-all ${statusFiltro === 'todos' ? 'bg-white/20 text-white font-bold shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Todos
              </button>
            </div>

            {/* Controles de Data */}
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-xl border border-white/10">
              <button
                onClick={() => mudarDia(-1)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                title="Voltar 1 dia"
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="size-3.5 text-cyan-400 shrink-0" />
                <input
                  type="date"
                  value={dataBase}
                  onChange={(e) => setDataBase(e.target.value)}
                  className="bg-transparent border-none text-slate-200 text-xs font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>

              <button
                onClick={() => mudarDia(1)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                title="Avançar 1 dia"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>

            <button
              onClick={irParaHoje}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition-colors"
              title="Ir para o dia de hoje"
            >
              <RotateCcw className="size-3.5 text-cyan-400" />
              Hoje
            </button>

            {/* Botão de Imprimir Relatório Executivo */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              title="Imprimir relatório das contas de acordo com a data e filtros selecionados"
            >
              <Printer className="size-3.5" />
              <span>Imprimir Relatório</span>
            </button>
          </div>
        </div>

      {/* 2. Barra de Filtro de Loja em Destaque */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/40 p-2.5 rounded-2xl border border-white/10 shadow-md">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-cyan-400 shrink-0 ml-1" />
          <span className="text-xs font-bold text-slate-300">
            Filtrar por Loja:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => selecionarLojaGlobal('todas')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              lojaGlobal === 'todas'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🏪 Todas as Lojas (Consolidado com Blocos Separados)</span>
          </button>
          <button
            onClick={() => selecionarLojaGlobal('1')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              lojaGlobal === '1'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🏢 Loja 01</span>
          </button>
          <button
            onClick={() => selecionarLojaGlobal('2')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              lojaGlobal === '2'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🏢 Loja 02</span>
          </button>
          <button
            onClick={() => selecionarLojaGlobal('3')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              lojaGlobal === '3'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <span>🏢 Loja 03</span>
          </button>
        </div>
      </div>

      {/* 3. Campo de Busca Instantânea com contador de resultados */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por fornecedor, número do título, tipo de despesa, observação ou quem lançou..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        {busca && (
          <button 
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-white bg-white/10 px-2 py-0.5 rounded"
          >
            Limpar Busca
          </button>
        )}
      </div>

      {/* 4. Cards Comparativos Superiores com Divisão por Loja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Resumo DIA BASE */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-black/60 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                Dia Atual Selecionado
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {fmtDataExtenso(dataBase)}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                {fmtMoeda(resumoHoje.totalValor)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {resumoHoje.qtdTotal} títulos {statusFiltro === 'F' ? 'a pagar' : 'listados'}
              </div>
            </div>
          </div>

          {/* Divisão por Loja em Destaque */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-cyan-400" /> Loja 01
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasHoje[1] || 0)}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-cyan-400" /> Loja 02
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasHoje[2] || 0)}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-cyan-400" /> Loja 03
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasHoje[3] || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Card Resumo PRÓXIMO DIA */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-blue-500/20 bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-black/60 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-blue-400" />
                Próximo Dia (D+1)
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {fmtDataExtenso(proximoDiaData.data)}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-white">
                {fmtMoeda(resumoAmanha.totalValor)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {resumoAmanha.qtdTotal} títulos {statusFiltro === 'F' ? 'a pagar' : 'listados'}
              </div>
            </div>
          </div>

          {/* Divisão por Loja em Destaque */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-blue-400" /> Loja 01
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasAmanha[1] || 0)}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-blue-400" /> Loja 02
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasAmanha[2] || 0)}
              </span>
            </div>

            <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Store className="size-3 text-blue-400" /> Loja 03
              </span>
              <span className="text-xs md:text-sm font-extrabold text-white mt-0.5">
                {fmtMoeda(totaisLojasAmanha[3] || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Colunas Lado a Lado: DIA BASE vs PRÓXIMO DIA (SEPARADOS POR LOJA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ==================== COLUNA 1: DIA ATUAL ==================== */}
        <div className="glass-strong rounded-2xl p-4 flex flex-col gap-3 border border-white/10 shadow-lg">
          <div className="flex flex-col gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-cyan-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  {fmtDataExtenso(dataBase)}
                </h4>
              </div>

              {/* Botões de Ações Rápidas de Lojas e Detalhes */}
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                <button
                  onClick={() => setTodasLojasHoje(true)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors"
                  title="Expandir todas as lojas"
                >
                  Abrir Lojas
                </button>
                <button
                  onClick={() => setTodasLojasHoje(false)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors"
                  title="Recolher todas as lojas"
                >
                  Fechar Lojas
                </button>
                {modoVisualizacao === 'lista' && (
                  <>
                    <button
                      onClick={() => expandirTodosItens(diaAtualData.todos)}
                      className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-semibold transition-colors"
                      title="Abrir todos os detalhes dos fornecedores"
                    >
                      Abrir Detalhes
                    </button>
                    <button
                      onClick={recolherTodosItens}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 font-semibold transition-colors"
                      title="Fechar detalhes dos fornecedores"
                    >
                      Fechar Detalhes
                    </button>
                  </>
                )}
              </div>

              {/* Filtro de Categoria */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  onClick={() => setCategoriaAtivaHoje('TODOS')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaHoje === 'TODOS' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCategoriaAtivaHoje('FORNECEDORES')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaHoje === 'FORNECEDORES' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Fornec.
                </button>
                <button
                  onClick={() => setCategoriaAtivaHoje('OUTROS')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaHoje === 'OUTROS' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Outros
                </button>
              </div>
            </div>

            {/* Abas de Lojas da Coluna 1 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <button
                onClick={() => setLojaAtivaHoje('todas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${lojaAtivaHoje === 'todas' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'}`}
              >
                Todas as Lojas
              </button>
              <button
                onClick={() => setLojaAtivaHoje('1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaHoje === '1' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 01 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasHoje[1] || 0)})</span>
              </button>
              <button
                onClick={() => setLojaAtivaHoje('2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaHoje === '2' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 02 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasHoje[2] || 0)})</span>
              </button>
              <button
                onClick={() => setLojaAtivaHoje('3')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaHoje === '3' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 03 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasHoje[3] || 0)})</span>
              </button>
            </div>
          </div>

          {/* Status e Indicador de Quantidade */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Exibindo <strong className="text-cyan-300">{gruposHoje.reduce((acc, g) => acc + g.itens.length, 0)} títulos</strong>
            </span>
            <span className="font-semibold text-emerald-400">
              Total: {fmtMoeda(gruposHoje.reduce((acc, g) => acc + g.total, 0))}
            </span>
          </div>

          {/* Renderização da Lista / Tabela / Cards Agrupados por Loja */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Clock className="size-6 text-cyan-400 animate-spin" />
              Carregando contas do DB2...
            </div>
          ) : gruposHoje.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
              <CheckCircle2 className="size-6 text-emerald-500/60" />
              Nenhum boleto encontrado com os filtros selecionados para este dia.
            </div>
          ) : modoVisualizacao === 'lista' ? (
            <div className={rolagemLivre ? 'flex flex-col gap-3' : 'flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-2'}>
              {renderListaCompactaBoletos(gruposHoje, 'cyan', lojasAbertasHoje, toggleLojaHoje)}
            </div>
          ) : modoVisualizacao === 'tabela' ? (
            <div className={rolagemLivre ? 'flex flex-col gap-3' : 'flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-2'}>
              {renderTabelaBoletos(gruposHoje, 'cyan', lojasAbertasHoje, toggleLojaHoje)}
            </div>
          ) : (
            <div className={rolagemLivre ? 'flex flex-col gap-4' : 'flex flex-col gap-4 max-h-[750px] overflow-y-auto pr-2'}>
              {gruposHoje.map((grupo) => {
                const aberta = lojasAbertasHoje[grupo.loja] ?? true;

                return (
                  <div key={`grupo-hoje-${grupo.loja}`} className="flex flex-col gap-2">
                    {/* Cabeçalho da Loja Interativo */}
                    <button
                      type="button"
                      onClick={() => toggleLojaHoje(grupo.loja)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-cyan-950/40 via-black/40 to-black/20 hover:from-cyan-950/60 border border-cyan-500/30 rounded-xl shadow-sm transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          {aberta ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </span>
                        <Store className="size-4 text-cyan-400" />
                        <span className="font-extrabold text-xs text-cyan-300 uppercase tracking-wider">
                          Loja 0{grupo.loja}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ({grupo.itens.length} {grupo.itens.length === 1 ? 'título' : 'títulos'})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Fornec: <strong className="text-emerald-400">{fmtMoeda(grupo.totalFornec)}</strong>
                        </span>
                        <span className="text-sm font-extrabold text-emerald-400">
                          {fmtMoeda(grupo.total)}
                        </span>
                      </div>
                    </button>

                    {/* Cards dos boletos pertencentes a essa Loja */}
                    {aberta && (
                      <div className="flex flex-col gap-2.5 pl-2 border-l-2 border-cyan-500/30 ml-2">
                        {grupo.itens.map((boleto, idx) => renderCardBoleto(boleto, idx, 'cyan'))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== COLUNA 2: PRÓXIMO DIA (D+1) ==================== */}
        <div className="glass-strong rounded-2xl p-4 flex flex-col gap-3 border border-white/10 shadow-lg">
          <div className="flex flex-col gap-2 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-blue-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  {fmtDataExtenso(proximoDiaData.data)}
                </h4>
              </div>

              {/* Botões de Ações Rápidas de Lojas e Detalhes */}
              <div className="flex items-center gap-1 text-[10px] flex-wrap">
                <button
                  onClick={() => setTodasLojasAmanha(true)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors"
                  title="Expandir todas as lojas"
                >
                  Abrir Lojas
                </button>
                <button
                  onClick={() => setTodasLojasAmanha(false)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-colors"
                  title="Recolher todas as lojas"
                >
                  Fechar Lojas
                </button>
                {modoVisualizacao === 'lista' && (
                  <>
                    <button
                      onClick={() => expandirTodosItens(proximoDiaData.todos)}
                      className="px-2 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold transition-colors"
                      title="Abrir todos os detalhes dos fornecedores"
                    >
                      Abrir Detalhes
                    </button>
                    <button
                      onClick={recolherTodosItens}
                      className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 font-semibold transition-colors"
                      title="Fechar detalhes dos fornecedores"
                    >
                      Fechar Detalhes
                    </button>
                  </>
                )}
              </div>

              {/* Filtro de Categoria */}
              <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  onClick={() => setCategoriaAtivaAmanha('TODOS')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaAmanha === 'TODOS' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setCategoriaAtivaAmanha('FORNECEDORES')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaAmanha === 'FORNECEDORES' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Fornec.
                </button>
                <button
                  onClick={() => setCategoriaAtivaAmanha('OUTROS')}
                  className={`px-2 py-0.5 rounded transition-colors ${categoriaAtivaAmanha === 'OUTROS' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Outros
                </button>
              </div>
            </div>

            {/* Abas de Lojas da Coluna 2 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <button
                onClick={() => setLojaAtivaAmanha('todas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${lojaAtivaAmanha === 'todas' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm' : 'bg-black/30 text-slate-400 hover:text-white border border-white/5'}`}
              >
                Todas as Lojas
              </button>
              <button
                onClick={() => setLojaAtivaAmanha('1')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaAmanha === '1' ? 'bg-blue-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 01 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasAmanha[1] || 0)})</span>
              </button>
              <button
                onClick={() => setLojaAtivaAmanha('2')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaAmanha === '2' ? 'bg-blue-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 02 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasAmanha[2] || 0)})</span>
              </button>
              <button
                onClick={() => setLojaAtivaAmanha('3')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${lojaAtivaAmanha === '3' ? 'bg-blue-500 text-slate-950 shadow-sm' : 'bg-black/30 text-slate-300 hover:text-white border border-white/5'}`}
              >
                🏢 Loja 03 <span className="text-[10px] opacity-75">({fmtMoeda(totaisLojasAmanha[3] || 0)})</span>
              </button>
            </div>
          </div>

          {/* Status e Indicador de Quantidade */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Exibindo <strong className="text-blue-300">{gruposAmanha.reduce((acc, g) => acc + g.itens.length, 0)} títulos</strong>
            </span>
            <span className="font-semibold text-emerald-400">
              Total: {fmtMoeda(gruposAmanha.reduce((acc, g) => acc + g.total, 0))}
            </span>
          </div>

          {/* Renderização da Lista / Tabela / Cards Agrupados por Loja */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Clock className="size-6 text-blue-400 animate-spin" />
              Carregando contas do DB2...
            </div>
          ) : gruposAmanha.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs border border-dashed border-white/10 rounded-xl">
              <CheckCircle2 className="size-6 text-emerald-500/60" />
              Nenhum boleto encontrado com os filtros selecionados para este dia.
            </div>
          ) : modoVisualizacao === 'lista' ? (
            <div className={rolagemLivre ? 'flex flex-col gap-3' : 'flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-2'}>
              {renderListaCompactaBoletos(gruposAmanha, 'blue', lojasAbertasAmanha, toggleLojaAmanha)}
            </div>
          ) : modoVisualizacao === 'tabela' ? (
            <div className={rolagemLivre ? 'flex flex-col gap-3' : 'flex flex-col gap-3 max-h-[750px] overflow-y-auto pr-2'}>
              {renderTabelaBoletos(gruposAmanha, 'blue', lojasAbertasAmanha, toggleLojaAmanha)}
            </div>
          ) : (
            <div className={rolagemLivre ? 'flex flex-col gap-4' : 'flex flex-col gap-4 max-h-[750px] overflow-y-auto pr-2'}>
              {gruposAmanha.map((grupo) => {
                const aberta = lojasAbertasAmanha[grupo.loja] ?? true;

                return (
                  <div key={`grupo-amanha-${grupo.loja}`} className="flex flex-col gap-2">
                    {/* Cabeçalho da Loja Interativo */}
                    <button
                      type="button"
                      onClick={() => toggleLojaAmanha(grupo.loja)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-950/40 via-black/40 to-black/20 hover:from-blue-950/60 border border-blue-500/30 rounded-xl shadow-sm transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-0.5 rounded bg-blue-500/20 text-blue-300">
                          {aberta ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </span>
                        <Store className="size-4 text-blue-400" />
                        <span className="font-extrabold text-xs text-blue-300 uppercase tracking-wider">
                          Loja 0{grupo.loja}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          ({grupo.itens.length} {grupo.itens.length === 1 ? 'título' : 'títulos'})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          Fornec: <strong className="text-emerald-400">{fmtMoeda(grupo.totalFornec)}</strong>
                        </span>
                        <span className="text-sm font-extrabold text-emerald-400">
                          {fmtMoeda(grupo.total)}
                        </span>
                      </div>
                    </button>

                    {/* Cards dos boletos pertencentes a essa Loja */}
                    {aberta && (
                      <div className="flex flex-col gap-2.5 pl-2 border-l-2 border-blue-500/30 ml-2">
                        {grupo.itens.map((boleto, idx) => renderCardBoleto(boleto, idx, 'blue'))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. RELATÓRIO EXECUTIVO EXCLUSIVO PARA IMPRESSÃO / PDF (print-only)        */}
      {/* ========================================================================= */}
      <div className="print-only text-black bg-white p-6 font-sans">
        {/* Cabeçalho do Relatório */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight uppercase text-slate-900">
                HORUS ANALYTICS
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-bold border border-slate-300 text-slate-700">
                FINANCEIRO
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              {statusFiltro === 'T' ? 'RELATÓRIO DE TÍTULOS PAGOS' : statusFiltro === 'F' ? 'RELATÓRIO DE CONTAS A PAGAR' : 'RELATÓRIO GERAL DE CONTAS A PAGAR & PAGOS'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Data de Referência: <strong>{fmtDataCurta(dataBase)} ({fmtDataExtenso(dataBase)})</strong>
              {' | '}Loja: <strong>{lojaGlobal === 'todas' ? 'Todas as Lojas (Consolidado)' : `Loja 0${lojaGlobal}`}</strong>
              {busca.trim() && <> | Filtro de Busca: <strong>"{busca}"</strong></>}
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-500">
            <div>Emissão: <strong>{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</strong></div>
            <div>Status: <strong className="uppercase">{statusFiltro === 'T' ? 'Pagos' : statusFiltro === 'F' ? 'A Pagar' : 'Todos'}</strong></div>
            <div>Total de Registros: <strong>{itensParaImpressao.length} títulos</strong></div>
          </div>
        </div>

        {/* Resumo Consolidado em Cards Limpos */}
        <div className="grid grid-cols-4 gap-3 mb-5 text-center text-xs">
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="text-slate-500 font-medium text-[10px] uppercase">Qtd de Títulos</div>
            <div className="text-base font-bold text-slate-900">{itensParaImpressao.length}</div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="text-slate-500 font-medium text-[10px] uppercase">Total Fornecedores</div>
            <div className="text-base font-bold text-slate-900">
              {fmtMoeda(itensParaImpressao.filter(i => i.grupo === 'FORNECEDOR').reduce((acc, i) => acc + (statusFiltro === 'T' && (i.VALOR_PAGO || 0) > 0 ? (i.VALOR_PAGO || 0) : i.VALOR), 0))}
            </div>
          </div>
          <div className="border border-slate-300 rounded p-2 bg-slate-50">
            <div className="text-slate-500 font-medium text-[10px] uppercase">Total Outras Despesas</div>
            <div className="text-base font-bold text-slate-900">
              {fmtMoeda(itensParaImpressao.filter(i => i.grupo === 'OUTROS').reduce((acc, i) => acc + (statusFiltro === 'T' && (i.VALOR_PAGO || 0) > 0 ? (i.VALOR_PAGO || 0) : i.VALOR), 0))}
            </div>
          </div>
          <div className="border-2 border-slate-900 rounded p-2 bg-slate-100">
            <div className="text-slate-700 font-bold text-[10px] uppercase">TOTAL GERAL</div>
            <div className="text-base font-extrabold text-slate-950">
              {fmtMoeda(itensParaImpressao.reduce((acc, i) => acc + (statusFiltro === 'T' && (i.VALOR_PAGO || 0) > 0 ? (i.VALOR_PAGO || 0) : i.VALOR), 0))}
            </div>
          </div>
        </div>

        {/* Tabela de Títulos Formatada para Impressão */}
        <table className="w-full text-left text-[10px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold uppercase border-b border-slate-300 text-[9px]">
              <th className="p-1.5 border border-slate-300 text-center w-10">Lj</th>
              <th className="p-1.5 border border-slate-300 w-24">Título / Doc</th>
              <th className="p-1.5 border border-slate-300">Favorecido (Fornecedor)</th>
              <th className="p-1.5 border border-slate-300 w-24">Categoria</th>
              <th className="p-1.5 border border-slate-300 text-center w-18">Vencimento</th>
              {statusFiltro === 'T' && (
                <th className="p-1.5 border border-slate-300 text-center w-18">Dt Pagto</th>
              )}
              <th className="p-1.5 border border-slate-300 text-right w-24">Valor (R$)</th>
              <th className="p-1.5 border border-slate-300 text-center w-16">Status</th>
              <th className="p-1.5 border border-slate-300">Código / Linha Digitável / PIX</th>
              <th className="p-1.5 border border-slate-300 w-24">Lançado Por</th>
            </tr>
          </thead>
          <tbody>
            {itensParaImpressao.length === 0 ? (
              <tr>
                <td colSpan={statusFiltro === 'T' ? 10 : 9} className="p-4 text-center text-slate-500 italic">
                  Nenhum título encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : (
              itensParaImpressao.map((item, idx) => {
                const valorFinal = statusFiltro === 'T' && (item.VALOR_PAGO || 0) > 0 ? (item.VALOR_PAGO || 0) : item.VALOR;
                return (
                  <tr key={`print-row-${item.LOJA}-${item.NUMERO_TITULO}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-1.5 border border-slate-300 text-center font-bold">
                      0{item.LOJA}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-mono">
                      <div>Nº {item.NUMERO_TITULO}</div>
                      {item.NRO_DOCUMENTO && (
                        <div className="text-[9px] text-slate-500">Doc: {item.NRO_DOCUMENTO}</div>
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">
                      <div>{limparTexto(item.FAVORECIDO)}</div>
                      {item.OBSERVACAO && (
                        <div className="text-[9px] text-slate-600 font-normal italic mt-0.5">
                          Obs: {limparTexto(item.OBSERVACAO)}
                        </div>
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-300">
                      <div>{item.categoria}</div>
                      {item.ORIGEM && (
                        <div className="text-[9px] text-slate-500">{item.ORIGEM}</div>
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-mono">
                      {fmtDataCurta(item.VENCIMENTO)}
                    </td>
                    {statusFiltro === 'T' && (
                      <td className="p-1.5 border border-slate-300 text-center font-mono font-bold text-slate-800">
                        {fmtDataCurta(item.DATA_PAGAMENTO)}
                      </td>
                    )}
                    <td className="p-1.5 border border-slate-300 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {fmtMoeda(valorFinal)}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-center font-bold text-[9px]">
                      {item.STATUS_BAIXADA === 'T' ? 'PAGO' : 'EM ABERTO'}
                    </td>
                    <td className="p-1.5 border border-slate-300 font-mono text-[9px] break-all max-w-[200px]">
                      {item.CODIGO_BARRAS || item.BOLETO || item.CHAVE_PIX || '—'}
                    </td>
                    <td className="p-1.5 border border-slate-300 text-[9px]">
                      {item.USUARIO_LANCAMENTO || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {itensParaImpressao.length > 0 && (
            <tfoot>
              <tr className="bg-slate-200 font-bold border-t-2 border-slate-900 text-slate-900">
                <td colSpan={statusFiltro === 'T' ? 6 : 5} className="p-2 border border-slate-300 text-right uppercase">
                  Total Geral ({itensParaImpressao.length} títulos):
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono text-xs font-extrabold whitespace-nowrap">
                  {fmtMoeda(itensParaImpressao.reduce((acc, i) => acc + (statusFiltro === 'T' && (i.VALOR_PAGO || 0) > 0 ? (i.VALOR_PAGO || 0) : i.VALOR), 0))}
                </td>
                <td colSpan={3} className="p-2 border border-slate-300"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Rodapé do Relatório */}
        <div className="mt-4 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
          <div>Horus Analytics — Sistema de Gestão Empresarial Inteligente</div>
          <div>Página 1 de 1</div>
        </div>
      </div>
    </div>
  );
}
export default ContasPagarModule;
