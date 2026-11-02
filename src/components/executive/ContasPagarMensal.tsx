import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, Clock, AlertCircle, Building2, Search, 
  ArrowRight, ArrowLeft, RotateCcw, Filter, DollarSign, ChevronDown, 
  ChevronRight, Store, User, FileText, QrCode, Table as TableIcon, 
  LayoutGrid, List, Printer, Copy, Check, TrendingUp, BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface ContasPagarMensalProps {
  selectedStore?: string;
}

interface BoletoItem {
  LOJA: number;
  NUMERO_TITULO: number;
  PARCELA?: string;
  IDCLIFOR: number;
  FAVORECIDO: string;
  VENCIMENTO: string;
  DATA_EMISSAO?: string;
  DATA_MOVIMENTO?: string;
  DATA_PAGAMENTO?: string;
  VALOR: number;
  VALOR_PAGO?: number;
  VALOR_EFETIVO: number;
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

interface DiaResumo {
  data: string;
  dia: number;
  total: number;
  pago: number;
  aberto: number;
  qtd: number;
}

interface CategoriaResumo {
  categoria: string;
  grupo: string;
  total: number;
  qtd: number;
  corBadge: string;
  icone: string;
}

export function ContasPagarMensal({ selectedStore = 'todas' }: ContasPagarMensalProps) {
  const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [mesAno, setMesAno] = useState<string>(getCurrentMonthStr());
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'F' | 'T'>('todos');
  const [lojaSelecionada, setLojaSelecionada] = useState<string>(selectedStore || 'todas');
  const [busca, setBusca] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modo de visualização: 'lista' | 'tabela' | 'calendario'
  const [modoVisualizacao, setModoVisualizacao] = useState<'lista' | 'tabela' | 'calendario'>('lista');
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [itensExpandidos, setItensExpandidos] = useState<Set<string>>(new Set());

  // Dados retornados do backend
  const [itens, setItens] = useState<BoletoItem[]>([]);
  const [porDia, setPorDia] = useState<DiaResumo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaResumo[]>([]);
  const [resumoGeral, setResumoGeral] = useState({
    totalGeral: 0,
    totalPago: 0,
    totalAberto: 0,
    qtdTotal: 0,
    qtdPagas: 0,
    qtdAbertas: 0,
    totaisPorLoja: {
      1: { total: 0, pago: 0, aberto: 0, qtd: 0 },
      2: { total: 0, pago: 0, aberto: 0, qtd: 0 },
      3: { total: 0, pago: 0, aberto: 0, qtd: 0 }
    }
  });

  const carregarDadosMes = async () => {
    setLoading(true);
    try {
      const url = `/api/financeiro/contas-pagar-mes?mesAno=${mesAno}&loja=${lojaSelecionada}&status=${statusFiltro}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar visão mensal');
      const data = await res.json();

      setItens(data.itens || []);
      setPorDia(data.porDia || []);
      setCategorias(data.resumo?.totaisPorCategoria || []);
      setResumoGeral(data.resumo || {
        totalGeral: 0, totalPago: 0, totalAberto: 0, qtdTotal: 0, qtdPagas: 0, qtdAbertas: 0,
        totaisPorLoja: { 1: { total: 0, pago: 0, aberto: 0, qtd: 0 }, 2: { total: 0, pago: 0, aberto: 0, qtd: 0 }, 3: { total: 0, pago: 0, aberto: 0, qtd: 0 } }
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao consultar dados do mês');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosMes();
  }, [mesAno, statusFiltro, lojaSelecionada]);

  // Navegar mês
  const mudarMes = (delta: number) => {
    const [anoStr, mesStr] = mesAno.split('-');
    let ano = parseInt(anoStr);
    let mes = parseInt(mesStr) + delta;
    if (mes > 12) {
      mes = 1;
      ano++;
    } else if (mes < 1) {
      mes = 12;
      ano--;
    }
    setMesAno(`${ano}-${String(mes).padStart(2, '0')}`);
    setDiaSelecionado(null);
  };

  // Formatação
  const fmtMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const fmtData = (dt?: string) => {
    if (!dt) return '—';
    const parts = dt.trim().split('-');
    if (parts.length < 3) return dt;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const nomeMesExtenso = useMemo(() => {
    const [ano, mes] = mesAno.split('-');
    const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const m = data.toLocaleString('pt-BR', { month: 'long' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} de ${ano}`;
  }, [mesAno]);

  const toggleItemExpandido = (key: string) => {
    setItensExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copiarTexto = (txt: string, id: number) => {
    if (!txt) {
      toast.info('Código/Chave não informado');
      return;
    }
    navigator.clipboard.writeText(txt);
    setCopiedId(id);
    toast.success('Copiado com sucesso!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Itens filtrados por busca e dia selecionado
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => {
      // Filtro de dia específico no calendário
      if (diaSelecionado !== null) {
        const dRef = item.STATUS_BAIXADA === 'T' && item.DATA_PAGAMENTO ? item.DATA_PAGAMENTO : item.VENCIMENTO;
        const diaItem = parseInt(dRef.split('-')[2]);
        if (diaItem !== diaSelecionado) return false;
      }

      // Busca
      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const fav = (item.FAVORECIDO || '').toLowerCase();
        const num = String(item.NUMERO_TITULO || '');
        const doc = (item.NRO_DOCUMENTO || '').toLowerCase();
        const obs = (item.OBSERVACAO || '').toLowerCase();
        const cat = (item.categoria || '').toLowerCase();
        const user = (item.USUARIO_LANCAMENTO || '').toLowerCase();
        const valStr = String(item.VALOR || '');

        return fav.includes(q) || num.includes(q) || doc.includes(q) || 
               obs.includes(q) || cat.includes(q) || user.includes(q) || valStr.includes(q);
      }

      return true;
    });
  }, [itens, busca, diaSelecionado]);

  // Percentual pago no mês
  const percPagoMes = useMemo(() => {
    if (resumoGeral.totalGeral <= 0) return 0;
    return Math.round((resumoGeral.totalPago / resumoGeral.totalGeral) * 100);
  }, [resumoGeral]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header do Mês e Controles Principais */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-black/60 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 grid place-items-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Calendar className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold font-serif text-white">
                  Visão Mensal de Contas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {nomeMesExtenso}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhamento completo de vencimentos e quitações em todo o mês
              </p>
            </div>
          </div>

          {/* Navegação entre Meses */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => mudarMes(-1)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors"
              title="Mês Anterior"
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-xl border border-white/10">
              <input
                type="month"
                value={mesAno}
                onChange={(e) => {
                  setMesAno(e.target.value);
                  setDiaSelecionado(null);
                }}
                className="bg-transparent border-none text-slate-100 text-xs font-bold focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            <button
              onClick={() => mudarMes(1)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors"
              title="Próximo Mês"
            >
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Filtros de Status (A Pagar / Pagos / Todos) e Lojas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Seletor de Status */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setStatusFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFiltro === 'todos' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos do Mês ({resumoGeral.qtdTotal})
            </button>
            <button
              onClick={() => setStatusFiltro('F')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFiltro === 'F' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="size-3.5" />
              <span>A Pagar ({resumoGeral.qtdAbertas})</span>
            </button>
            <button
              onClick={() => setStatusFiltro('T')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusFiltro === 'T' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Já Pagos ({resumoGeral.qtdPagas})</span>
            </button>
          </div>

          {/* Filtro por Loja */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setLojaSelecionada('todas')}
              className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === 'todas' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Todas Lojas
            </button>
            <button
              onClick={() => setLojaSelecionada('1')}
              className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '1' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Loja 01
            </button>
            <button
              onClick={() => setLojaSelecionada('2')}
              className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '2' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Loja 02
            </button>
            <button
              onClick={() => setLojaSelecionada('3')}
              className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === '3' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Loja 03
            </button>
          </div>

          {/* Alternador de Modo de Exibição */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setModoVisualizacao('lista')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'lista' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="size-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('calendario')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'calendario' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="size-3.5" />
              <span>Por Dia</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                modoVisualizacao === 'tabela' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <TableIcon className="size-3.5" />
              <span>Tabela</span>
            </button>
          </div>
        </div>

        {/* 2. Cards de Métricas do Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Previsto do Mês */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-slate-400 text-xs font-semibold">Total Geral do Mês</span>
            <div className="text-xl md:text-2xl font-black text-white mt-1">
              {fmtMoeda(resumoGeral.totalGeral)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{resumoGeral.qtdTotal} títulos registrados</span>
          </div>

          {/* Total Já Pago */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> Já Pago ({percPagoMes}%)
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                {resumoGeral.qtdPagas} quitados
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
              {fmtMoeda(resumoGeral.totalPago)}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${percPagoMes}%` }} />
            </div>
          </div>

          {/* Total a Pagar (Em Aberto) */}
          <div className="bg-black/40 p-3.5 rounded-xl border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="size-3.5" /> Saldo a Pagar
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                {resumoGeral.qtdAbertas} pendentes
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-400 mt-1">
              {fmtMoeda(resumoGeral.totalAberto)}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${100 - percPagoMes}%` }} />
            </div>
          </div>

          {/* Divisão por Loja */}
          <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex flex-col justify-between text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mb-1">Por Loja (Total Mês):</span>
            <div className="flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Loja 01:</span>
                <strong className="text-slate-200">{fmtMoeda(resumoGeral.totaisPorLoja[1]?.total || 0)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loja 02:</span>
                <strong className="text-slate-200">{fmtMoeda(resumoGeral.totaisPorLoja[2]?.total || 0)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Loja 03:</span>
                <strong className="text-slate-200">{fmtMoeda(resumoGeral.totaisPorLoja[3]?.total || 0)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Distribuição por Categorias */}
        {categorias.length > 0 && (
          <div className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
            <span className="text-slate-400 text-xs font-semibold flex items-center gap-1.5">
              <BarChart3 className="size-3.5 text-cyan-400" /> Distribuição de Gastos do Mês por Categoria:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
              {categorias.slice(0, 6).map((c, idx) => (
                <div key={idx} className="bg-white/5 p-2 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold truncate" title={c.categoria}>
                    {c.categoria}
                  </span>
                  <div className="font-extrabold text-white text-xs mt-0.5">
                    {fmtMoeda(c.total)}
                  </div>
                  <span className="text-[9px] text-slate-500">{c.qtd} lançamentos</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Campo de Busca Instantânea */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrar por fornecedor, número do documento, título, categoria ou quem lançou..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        {busca && (
          <button 
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 hover:text-white bg-white/10 px-2 py-0.5 rounded"
          >
            Limpar
          </button>
        )}
      </div>

      {/* 5. MODO CALENDÁRIO / DIAS DO MÊS */}
      {modoVisualizacao === 'calendario' && (
        <div className="glass-strong rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <span className="text-slate-300 font-semibold">
              Fluxo Diário do Mês (Clique em um dia para filtrar a lista abaixo)
            </span>
            {diaSelecionado !== null && (
              <button
                onClick={() => setDiaSelecionado(null)}
                className="px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30 text-[11px]"
              >
                Ver Mês Completo
              </button>
            )}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-10 gap-2">
            {porDia.map(d => {
              const selecionado = diaSelecionado === d.dia;
              const temValor = d.total > 0;

              return (
                <button
                  key={d.dia}
                  onClick={() => setDiaSelecionado(selecionado ? null : d.dia)}
                  className={`p-2 rounded-xl text-left transition-all border flex flex-col justify-between ${
                    selecionado
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-md ring-1 ring-cyan-400'
                      : temValor
                        ? 'bg-black/40 hover:bg-white/10 border-white/10'
                        : 'bg-black/20 border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Dia {d.dia}</span>
                    {d.qtd > 0 && (
                      <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-slate-300">
                        {d.qtd}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-extrabold text-white mt-1">
                    {temValor ? fmtMoeda(d.total) : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Listagem de Títulos */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
          <div className="text-slate-300 font-semibold">
            {diaSelecionado !== null ? (
              <span>Filtrando títulos do <strong>Dia {diaSelecionado}</strong> ({itensFiltrados.length} encontrados)</span>
            ) : (
              <span>Exibindo <strong>{itensFiltrados.length}</strong> títulos em {nomeMesExtenso}</span>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RotateCcw className="size-8 animate-spin text-cyan-400" />
            <p className="text-xs font-semibold">Carregando movimentações do mês...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && itensFiltrados.length === 0 && (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Calendar className="size-10 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma conta encontrada com os filtros selecionados.</p>
          </div>
        )}

        {/* MODO LISTA */}
        {!loading && modoVisualizacao !== 'tabela' && itensFiltrados.length > 0 && (
          <div className="flex flex-col gap-2">
            {itensFiltrados.map((item, idx) => {
              const itemKey = `${item.LOJA}-${item.NUMERO_TITULO}`;
              const expandido = itensExpandidos.has(itemKey);
              const quitado = item.STATUS_BAIXADA === 'T';

              return (
                <div 
                  key={`${itemKey}-${idx}`}
                  className="bg-slate-950/60 hover:bg-slate-900/80 border border-white/5 hover:border-cyan-500/30 rounded-xl transition-all shadow-sm overflow-hidden"
                >
                  <div
                    onClick={() => toggleItemExpandido(itemKey)}
                    className="p-3 md:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button className="text-slate-400 hover:text-white transition-colors shrink-0">
                        {expandido ? <ChevronDown className="size-4 text-cyan-400" /> : <ChevronRight className="size-4" />}
                      </button>

                      <div className={`size-8 rounded-lg grid place-items-center shrink-0 border ${
                        quitado 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {quitado ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs md:text-sm text-slate-100 truncate">
                            {item.FAVORECIDO}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                            Loja 0{item.LOJA}
                          </span>
                          {item.categoria && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 shrink-0">
                              {item.categoria}
                            </span>
                          )}
                          {item.PARCELA && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                              Parc. {item.PARCELA}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                          <span>Vencimento: <strong className="text-slate-200">{fmtData(item.VENCIMENTO)}</strong></span>
                          {quitado && item.DATA_PAGAMENTO && (
                            <span>Pago em: <strong className="text-emerald-300">{fmtData(item.DATA_PAGAMENTO)}</strong></span>
                          )}
                          <span>Título: #{item.NUMERO_TITULO}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-sm md:text-base font-extrabold ${quitado ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {fmtMoeda(item.VALOR_EFETIVO)}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${quitado ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {quitado ? '✓ Quitado' : '• A Pagar'}
                      </span>
                    </div>
                  </div>

                  {expandido && (
                    <div className="px-4 pb-4 pt-1 border-t border-white/5 bg-black/40 flex flex-col gap-3 text-xs animate-in fade-in duration-200">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px]">
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Documento</span>
                          <span className="font-bold text-white">{item.NRO_DOCUMENTO || '—'}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Emissão</span>
                          <span className="font-bold text-white">{fmtData(item.DATA_EMISSAO)}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Usuário Lançador</span>
                          <span className="font-bold text-white">{item.USUARIO_LANCAMENTO || '—'}</span>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg">
                          <span className="text-slate-400 block text-[10px]">Status</span>
                          <span className="font-bold text-white">{quitado ? 'Baixado no DB2' : 'Em Aberto'}</span>
                        </div>
                      </div>

                      {item.OBSERVACAO && (
                        <div className="bg-white/5 p-2.5 rounded-lg text-slate-300 text-xs">
                          <strong className="text-slate-400 block text-[10px] mb-0.5">Observação:</strong>
                          {item.OBSERVACAO}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.CODIGO_BARRAS && (
                          <button
                            onClick={() => copiarTexto(item.CODIGO_BARRAS, item.NUMERO_TITULO)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[11px] font-semibold transition-colors"
                          >
                            {copiedId === item.NUMERO_TITULO ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                            <span>Copiar Código de Barras</span>
                          </button>
                        )}
                        {item.CHAVE_PIX && (
                          <button
                            onClick={() => copiarTexto(item.CHAVE_PIX || '', item.NUMERO_TITULO)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold transition-colors"
                          >
                            <QrCode className="size-3.5" />
                            <span>Copiar Chave PIX</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODO TABELA */}
        {!loading && modoVisualizacao === 'tabela' && itensFiltrados.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-black/60 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Loja</th>
                  <th className="py-2.5 px-3">Título</th>
                  <th className="py-2.5 px-3">Favorecido</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Vencimento</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {itensFiltrados.map((item, idx) => {
                  const quitado = item.STATUS_BAIXADA === 'T';
                  return (
                    <tr key={`${item.LOJA}-${item.NUMERO_TITULO}-${idx}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 font-bold text-cyan-400">Loja 0{item.LOJA}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">#{item.NUMERO_TITULO}</td>
                      <td className="py-2 px-3 font-semibold text-slate-200">{item.FAVORECIDO}</td>
                      <td className="py-2 px-3 text-slate-400">{item.categoria}</td>
                      <td className="py-2 px-3 text-slate-300">{fmtData(item.VENCIMENTO)}</td>
                      <td className={`py-2 px-3 text-right font-black ${quitado ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {fmtMoeda(item.VALOR_EFETIVO)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          quitado ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {quitado ? 'PAGO' : 'A PAGAR'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
