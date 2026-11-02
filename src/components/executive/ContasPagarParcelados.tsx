import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, CheckCircle2, Clock, Calendar, Building2, Search, 
  RotateCcw, DollarSign, Store, ChevronDown, ChevronRight, 
  Copy, Check, QrCode, AlertCircle, TrendingDown, ArrowUpRight,
  Filter, Tag, FileText, CheckCircle, CalendarCheck, CalendarDays,
  ListOrdered, LayoutGrid, CheckSquare, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface ContasPagarParceladosProps {
  selectedStore?: string;
}

interface ParcelaItem {
  numeroTitulo: number;
  parcela: string;
  vencimento: string;
  dataEmissao?: string;
  dataPagamento?: string;
  valor: number;
  valorPago: number;
  statusBaixada: boolean;
  observacao: string;
  boleto: string;
  codigoBarras: string;
  chavePix: string;
}

interface ContratoParcelado {
  id: string;
  loja: number;
  idClifor: number;
  favorecido: string;
  documento: string;
  serieNota?: string;
  categoria: string;
  icone: string;
  corBadge: string;
  totalParcelas: number;
  parcelasPagas: number;
  parcelasAbertas: number;
  valorTotalContrato: number;
  valorJaPago: number;
  saldoDevedor: number;
  percentualPago: number;
  primeiroVencimento: string;
  ultimoVencimento: string;
  statusContrato: 'EM_ANDAMENTO' | 'QUITADO';
  proximaParcela: ParcelaItem | null;
  ultimaParcela: ParcelaItem | null;
  parcelas: ParcelaItem[];
}

export function ContasPagarParcelados({ selectedStore = 'todas' }: ContasPagarParceladosProps) {
  const [lojaSelecionada, setLojaSelecionada] = useState<string>(selectedStore || 'todas');
  const [statusContratoFiltro, setStatusContratoFiltro] = useState<'aberto' | 'todos' | 'quitado'>('aberto');
  const [busca, setBusca] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [contratosExpandidos, setContratosExpandidos] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Modo de visualização: 'contratos' (por fornecedor com régua de todas as parcelas) ou 'cronograma' (todas as datas mês a mês)
  const [modoVisualizacao, setModoVisualizacao] = useState<'contratos' | 'cronograma'>('contratos');
  // Filtro de parcelamentos reais (2 ou mais parcelas)
  const [apenasMultiplasParcelas, setApenasMultiplasParcelas] = useState<boolean>(true);
  // Mês selecionado no modo cronograma (null para todos os meses)
  const [mesFiltroCronograma, setMesFiltroCronograma] = useState<string | null>(null);

  const [contratos, setContratos] = useState<ContratoParcelado[]>([]);
  const [resumo, setResumo] = useState({
    totalContratos: 0,
    totalDividasGeral: 0,
    totalJaPagoGeral: 0,
    totalSaldoRestanteGeral: 0,
    totalParcelasRestantesGeral: 0
  });

  const carregarParcelados = async () => {
    setLoading(true);
    try {
      const url = `/api/financeiro/parcelados?loja=${lojaSelecionada}&status=${statusContratoFiltro}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao carregar compras parceladas');
      const data = await res.json();

      setContratos(data.contratos || []);
      setResumo(data.resumo || {
        totalContratos: 0,
        totalDividasGeral: 0,
        totalJaPagoGeral: 0,
        totalSaldoRestanteGeral: 0,
        totalParcelasRestantesGeral: 0
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao conectar com a base de parcelamentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarParcelados();
  }, [lojaSelecionada, statusContratoFiltro]);

  const toggleContrato = (id: string) => {
    setContratosExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandirTodos = () => {
    const keys = contratosFiltrados.map(c => c.id);
    setContratosExpandidos(new Set(keys));
  };

  const recolherTodos = () => {
    setContratosExpandidos(new Set());
  };

  // Formatações
  const fmtMoeda = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const fmtData = (dt?: string) => {
    if (!dt) return '—';
    const parts = dt.trim().split('-');
    if (parts.length < 3) return dt;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const fmtMesAnoExtenso = (anoMes: string) => {
    if (!anoMes || !anoMes.includes('-')) return anoMes;
    const [ano, mes] = anoMes.split('-');
    const d = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const m = d.toLocaleString('pt-BR', { month: 'long' });
    return `${m.charAt(0).toUpperCase() + m.slice(1)} de ${ano}`;
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

  // Filtragem local por texto e múltiplos parcelamentos
  const contratosFiltrados = useMemo(() => {
    return contratos.filter(c => {
      // Filtrar contratos de apenas 1 parcela se a flag estiver ativa
      if (apenasMultiplasParcelas && c.totalParcelas <= 1) {
        return false;
      }

      if (busca.trim()) {
        const q = busca.toLowerCase().trim();
        const fav = (c.favorecido || '').toLowerCase();
        const doc = (c.documento || '').toLowerCase();
        const cat = (c.categoria || '').toLowerCase();
        const temNaBusca = fav.includes(q) || doc.includes(q) || cat.includes(q);
        if (!temNaBusca) return false;
      }

      return true;
    });
  }, [contratos, busca, apenasMultiplasParcelas]);

  // Cronograma consolidado de parcelas agrupadas por mês de vencimento
  const cronogramaMensal = useMemo(() => {
    const mapaMeses: Record<string, {
      anoMes: string;
      totalValor: number;
      totalPago: number;
      totalAberto: number;
      qtdParcelas: number;
      parcelas: Array<{
        contratoId: string;
        favorecido: string;
        loja: number;
        categoria: string;
        documento: string;
        numeroTitulo: number;
        parcela: string;
        totalParcelas: number;
        vencimento: string;
        valor: number;
        statusBaixada: boolean;
        dataPagamento?: string;
        codigoBarras: string;
        chavePix: string;
      }>;
    }> = {};

    contratosFiltrados.forEach(c => {
      c.parcelas.forEach(p => {
        if (!p.vencimento) return;
        const anoMes = p.vencimento.substring(0, 7); // YYYY-MM
        if (!mapaMeses[anoMes]) {
          mapaMeses[anoMes] = {
            anoMes,
            totalValor: 0,
            totalPago: 0,
            totalAberto: 0,
            qtdParcelas: 0,
            parcelas: []
          };
        }

        mapaMeses[anoMes].totalValor += p.valor;
        if (p.statusBaixada) {
          mapaMeses[anoMes].totalPago += (p.valorPago > 0 ? p.valorPago : p.valor);
        } else {
          mapaMeses[anoMes].totalAberto += p.valor;
        }
        mapaMeses[anoMes].qtdParcelas++;

        mapaMeses[anoMes].parcelas.push({
          contratoId: c.id,
          favorecido: c.favorecido,
          loja: c.loja,
          categoria: c.categoria,
          documento: c.documento,
          numeroTitulo: p.numeroTitulo,
          parcela: p.parcela,
          totalParcelas: c.totalParcelas,
          vencimento: p.vencimento,
          valor: p.valor,
          statusBaixada: p.statusBaixada,
          dataPagamento: p.dataPagamento,
          codigoBarras: p.codigoBarras,
          chavePix: p.chavePix
        });
      });
    });

    // Ordenar os meses cronologicamente
    const mesesOrdenados = Object.values(mapaMeses).sort((a, b) => a.anoMes.localeCompare(b.anoMes));

    // Ordenar parcelas dentro de cada mês por data de vencimento
    mesesOrdenados.forEach(m => {
      m.parcelas.sort((a, b) => a.vencimento.localeCompare(b.vencimento));
    });

    return mesesOrdenados;
  }, [contratosFiltrados]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header do Módulo de Parcelados */}
      <div className="glass-strong rounded-2xl p-4 md:p-5 border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-slate-900/60 to-black/60 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 grid place-items-center text-white shadow-lg shadow-purple-500/20 shrink-0">
              <Layers className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg md:text-xl font-bold font-serif text-white">
                  Dívidas & Pagamentos Parcelados
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Todas as Datas Mensais
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanhe compras parceladas, todas as datas de vencimento mês a mês e o saldo devedor
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={carregarParcelados}
              disabled={loading}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 transition-colors"
              title="Atualizar dados do DB2"
            >
              <RotateCcw className={`size-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Linha de Filtros: Status do Contrato, Loja e Alternador de Modo de Visualização */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Alternador de Modo: Por Fornecedor vs Cronograma de Todas as Datas por Mês */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setModoVisualizacao('contratos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                modoVisualizacao === 'contratos' ? 'bg-purple-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              <span>Por Fornecedor & Contrato</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('cronograma')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                modoVisualizacao === 'cronograma' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="size-3.5 text-purple-200" />
              <span>Cronograma Mensal (Todas as Datas)</span>
            </button>
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setStatusContratoFiltro('aberto')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusContratoFiltro === 'aberto' ? 'bg-purple-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="size-3.5" />
              <span>Em Aberto</span>
            </button>
            <button
              onClick={() => setStatusContratoFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusContratoFiltro === 'todos' ? 'bg-purple-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusContratoFiltro('quitado')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                statusContratoFiltro === 'quitado' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Quitados</span>
            </button>
          </div>

          {/* Filtro por Loja */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setLojaSelecionada('todas')}
              className={`px-2.5 py-1 rounded-lg transition-all ${lojaSelecionada === 'todas' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Todas
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

          {/* Toggle: Apenas Parcelados Reais (2+ parcelas) */}
          <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold transition-colors">
            <input
              type="checkbox"
              checked={apenasMultiplasParcelas}
              onChange={(e) => setApenasMultiplasParcelas(e.target.checked)}
              className="accent-purple-500 rounded cursor-pointer size-4"
            />
            <span className="text-slate-200">Apenas Compras Parceladas (2+ parcelas)</span>
          </label>
        </div>

        {/* 2. Cards de Métricas Consolidadas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card Saldo Devedor Restante */}
          <div className="bg-black/50 p-4 rounded-xl border border-rose-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rose-400 font-semibold flex items-center gap-1.5">
                <AlertCircle className="size-3.5" /> Saldo Devedor a Liquidar
              </span>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">
                {resumo.totalParcelasRestantesGeral} parcelas
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-rose-400 mt-1">
              {fmtMoeda(resumo.totalSaldoRestanteGeral)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Total pendente no banco de dados</span>
          </div>

          {/* Total Já Pago */}
          <div className="bg-black/40 p-4 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> Total Já Pago
            </span>
            <div className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
              {fmtMoeda(resumo.totalJaPagoGeral)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Parcelas liquidadas no DB2</span>
          </div>

          {/* Valor Total Contratado */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-slate-400 text-xs font-semibold">Valor Total Contratado</span>
            <div className="text-xl md:text-2xl font-black text-white mt-1">
              {fmtMoeda(resumo.totalDividasGeral)}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Soma de todas as parcelas</span>
          </div>

          {/* Quantidade de Contratos */}
          <div className="bg-black/40 p-4 rounded-xl border border-white/10 flex flex-col justify-between">
            <span className="text-slate-400 text-xs font-semibold">Contratos Filtrados</span>
            <div className="text-xl md:text-2xl font-black text-purple-400 mt-1">
              {contratosFiltrados.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {cronogramaMensal.length} meses com vencimentos
            </span>
          </div>
        </div>
      </div>

      {/* 3. Campo de Busca Instantânea */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por fornecedor, número do documento/contrato, parcela ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-24 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
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

      {/* ========================================================================= */}
      {/* 4. VISUALIZAÇÃO A: CRONOGRAMA MENSAL (TODAS AS DATAS AGRUPADAS POR MÊS)   */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'cronograma' && (
        <div className="flex flex-col gap-4">
          {/* Seletor Rápido de Meses */}
          <div className="glass-strong rounded-2xl p-4 border border-white/10 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <CalendarDays className="size-4 text-purple-400" />
                Linha do Tempo dos Meses com Pagamentos (Clique em um mês para filtrar):
              </span>
              {mesFiltroCronograma && (
                <button
                  onClick={() => setMesFiltroCronograma(null)}
                  className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold hover:bg-purple-500/30 text-[11px]"
                >
                  Ver Todos os Meses
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {cronogramaMensal.map(m => {
                const selecionado = mesFiltroCronograma === m.anoMes;
                return (
                  <button
                    key={m.anoMes}
                    onClick={() => setMesFiltroCronograma(selecionado ? null : m.anoMes)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                      selecionado 
                        ? 'bg-purple-500/30 border-purple-400 ring-2 ring-purple-400 shadow-lg' 
                        : 'bg-black/40 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 capitalize">
                        {fmtMesAnoExtenso(m.anoMes).split(' de ')[0]}
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold">
                        {m.anoMes.split('-')[0]}
                      </span>
                    </div>

                    <div className="text-xs font-black text-rose-400 mt-1">
                      {fmtMoeda(m.totalAberto > 0 ? m.totalAberto : m.totalValor)}
                    </div>

                    <div className="text-[10px] text-slate-400 flex justify-between mt-1 pt-1 border-t border-white/5">
                      <span>{m.qtdParcelas} parcelas</span>
                      {m.totalAberto === 0 && <span className="text-emerald-400 font-bold">✓ 100% Pago</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listagem dos Meses e suas Parcelas */}
          <div className="flex flex-col gap-4">
            {cronogramaMensal
              .filter(m => mesFiltroCronograma ? m.anoMes === mesFiltroCronograma : true)
              .map(m => (
                <div 
                  key={m.anoMes}
                  className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 shadow-lg flex flex-col gap-3"
                >
                  {/* Cabeçalho do Mês */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-xl bg-purple-500/20 border border-purple-500/30 grid place-items-center text-purple-300 font-bold shrink-0">
                        <Calendar className="size-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white capitalize">
                          {fmtMesAnoExtenso(m.anoMes)}
                        </h4>
                        <span className="text-xs text-slate-400">
                          {m.qtdParcelas} vencimentos programados
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs self-end sm:self-auto">
                      <div>
                        <span className="text-slate-400 block text-[10px]">A Pagar no Mês:</span>
                        <strong className="text-rose-400 text-sm font-black">{fmtMoeda(m.totalAberto)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Já Quitado:</span>
                        <strong className="text-emerald-400 text-sm font-black">{fmtMoeda(m.totalPago)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Parcelas que Vencem Neste Mês */}
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-black/60 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-3">Data Vencimento</th>
                          <th className="py-2.5 px-3">Fornecedor / Favorecido</th>
                          <th className="py-2.5 px-3">Loja</th>
                          <th className="py-2.5 px-3">Parcela</th>
                          <th className="py-2.5 px-3">Documento</th>
                          <th className="py-2.5 px-3 text-right">Valor da Parcela</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {m.parcelas.map((parc, idx) => {
                          const quitado = parc.statusBaixada;

                          return (
                            <tr key={`${parc.numeroTitulo}-${idx}`} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-white">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="size-3.5 text-purple-400 shrink-0" />
                                  <span>{fmtData(parc.vencimento)}</span>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-semibold text-slate-100">
                                <div>{parc.favorecido}</div>
                                <div className="text-[10px] text-slate-400">{parc.categoria}</div>
                              </td>

                              <td className="py-2.5 px-3 font-bold text-cyan-400">
                                Loja 0{parc.loja}
                              </td>

                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[11px] border border-purple-500/30">
                                  Parc. {parc.parcela} de {parc.totalParcelas}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 font-mono text-slate-300 text-[11px]">
                                {parc.documento || `#${parc.numeroTitulo}`}
                              </td>

                              <td className="py-2.5 px-3 text-right font-black text-sm text-slate-100">
                                {fmtMoeda(parc.valor)}
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  quitado 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {quitado ? 'PAGA' : 'A PAGAR'}
                                </span>
                              </td>

                              <td className="py-2.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {parc.codigoBarras && (
                                    <button
                                      onClick={() => copiarTexto(parc.codigoBarras, parc.numeroTitulo)}
                                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                      title="Copiar código de barras"
                                    >
                                      {copiedId === parc.numeroTitulo ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                    </button>
                                  )}
                                  {parc.chavePix && (
                                    <button
                                      onClick={() => copiarTexto(parc.chavePix, parc.numeroTitulo)}
                                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                                      title="Copiar PIX"
                                    >
                                      <QrCode className="size-3.5" />
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
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISUALIZAÇÃO B: POR CONTRATO / FORNECEDOR COM TODAS AS PARCELAS VISÍVEIS */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'contratos' && (
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <div className="text-slate-300 font-semibold">
              Exibindo <strong className="text-purple-400">{contratosFiltrados.length}</strong> contratos com todas as datas mensais discriminadas
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={expandirTodos}
                className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold transition-colors"
              >
                Abrir Todas as Tabelas
              </button>
              <button
                onClick={recolherTodos}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 font-semibold transition-colors"
              >
                Recolher
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RotateCcw className="size-8 animate-spin text-purple-400" />
              <p className="text-xs font-semibold">Carregando parcelas e contratos do banco...</p>
            </div>
          )}

          {/* Empty */}
          {!loading && contratosFiltrados.length === 0 && (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Layers className="size-10 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Nenhum contrato parcelado encontrado com os filtros selecionados.</p>
            </div>
          )}

          {/* Lista de Contratos */}
          {!loading && contratosFiltrados.length > 0 && (
            <div className="flex flex-col gap-3">
              {contratosFiltrados.map((contrato) => {
                const expandido = contratosExpandidos.has(contrato.id);
                const quitado = contrato.statusContrato === 'QUITADO';

                return (
                  <div
                    key={contrato.id}
                    className="bg-slate-950/60 hover:bg-slate-900/80 border border-white/5 hover:border-purple-500/30 rounded-xl transition-all shadow-sm overflow-hidden"
                  >
                    {/* Cabeçalho do Contrato */}
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button 
                            onClick={() => toggleContrato(contrato.id)}
                            className="text-slate-400 hover:text-white transition-colors shrink-0 mt-1"
                            title="Ver tabela completa com detalhes"
                          >
                            {expandido ? <ChevronDown className="size-4 text-purple-400" /> : <ChevronRight className="size-4" />}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-slate-100 truncate">
                                {contrato.favorecido}
                              </h4>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Loja 0{contrato.loja}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5">
                                Doc: {contrato.documento}
                              </span>
                              {contrato.categoria && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                  {contrato.categoria}
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                quitado ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                              }`}>
                                {quitado ? 'QUITADO' : 'EM ANDAMENTO'}
                              </span>
                            </div>

                            {/* Barra de Progresso das Parcelas */}
                            <div className="mt-2 flex flex-col gap-1 max-w-md">
                              <div className="flex justify-between text-[11px] text-slate-400">
                                <span>
                                  Progresso: <strong className="text-white">{contrato.parcelasPagas}</strong> de <strong className="text-white">{contrato.totalParcelas}</strong> parcelas pagas
                                </span>
                                <span className="font-bold text-purple-300">{contrato.percentualPago}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${quitado ? 'bg-emerald-400' : 'bg-purple-500'}`}
                                  style={{ width: `${contrato.percentualPago}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bloco de Valores Financeiros */}
                        <div className="text-right shrink-0 flex flex-row md:flex-col justify-between items-end gap-1 border-t md:border-t-0 pt-2 md:pt-0 border-white/5">
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase">Saldo Devedor:</span>
                            <div className={`text-base md:text-xl font-black ${contrato.saldoDevedor > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {fmtMoeda(contrato.saldoDevedor)}
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-400">
                            <span>Total: <strong className="text-slate-200">{fmtMoeda(contrato.valorTotalContrato)}</strong></span>
                            <span className="mx-1.5">•</span>
                            <span>Pago: <strong className="text-emerald-400">{fmtMoeda(contrato.valorJaPago)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* ========================================================================= */}
                      {/* ESTEIRA COMPLETA COM TODAS AS DATAS DE PAGAMENTOS MENSAIS                  */}
                      {/* ========================================================================= */}
                      <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-purple-400" />
                            Todas as {contrato.parcelas.length} Datas de Vencimento / Pagamento:
                          </span>
                          <button
                            onClick={() => toggleContrato(contrato.id)}
                            className="text-[11px] text-purple-300 hover:text-white font-semibold flex items-center gap-1"
                          >
                            <span>{expandido ? 'Ocultar Tabela' : 'Ver Tabela Completa'}</span>
                            {expandido ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </button>
                        </div>

                        {/* Grade com Todas as Parcelas e suas Datas Exatas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1">
                          {contrato.parcelas.map((parc, pIdx) => {
                            const isUltima = pIdx === contrato.parcelas.length - 1;
                            const isPaga = parc.statusBaixada;

                            return (
                              <div
                                key={`${parc.numeroTitulo}-${pIdx}`}
                                className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                                  isUltima 
                                    ? 'bg-purple-950/30 border-purple-500/50 ring-1 ring-purple-500/30 shadow-md' 
                                    : isPaga 
                                      ? 'bg-emerald-950/20 border-emerald-500/30' 
                                      : 'bg-black/50 border-white/10 hover:border-white/20'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-200">
                                    Parc. {parc.parcela}
                                  </span>
                                  {isUltima && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40">
                                      ⭐ ÚLTIMA
                                    </span>
                                  )}
                                  {isPaga && !isUltima && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      PAGA
                                    </span>
                                  )}
                                  {!isPaga && !isUltima && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                      A PAGAR
                                    </span>
                                  )}
                                </div>

                                {/* DATA DE PAGAMENTO / VENCIMENTO EM DESTAQUE */}
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar className="size-3.5 text-purple-400 shrink-0" />
                                  <span className="text-xs font-black text-white">
                                    {fmtData(parc.vencimento)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between mt-1 text-xs">
                                  <span className="font-extrabold text-slate-200">
                                    {fmtMoeda(parc.valor)}
                                  </span>
                                  {parc.codigoBarras && (
                                    <button
                                      onClick={() => copiarTexto(parc.codigoBarras, parc.numeroTitulo)}
                                      className="text-slate-400 hover:text-white transition-colors"
                                      title="Copiar código de barras"
                                    >
                                      {copiedId === parc.numeroTitulo ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                                    </button>
                                  )}
                                </div>

                                {isPaga && parc.dataPagamento && (
                                  <div className="text-[10px] text-emerald-400 mt-1 pt-1 border-t border-white/5">
                                    Pago em: {fmtData(parc.dataPagamento)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Tabela de Todas as Parcelas Individuais (Expandida) */}
                    {expandido && (
                      <div className="p-4 border-t border-white/5 bg-black/60 flex flex-col gap-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between text-xs pb-1">
                          <span className="font-bold text-slate-200">
                            Detalhamento Completo das Parcelas do Contrato:
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            Vencimentos de {fmtData(contrato.primeiroVencimento)} até {fmtData(contrato.ultimoVencimento)}
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-white/10">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-black/60 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                                <th className="py-2 px-3">Parcela</th>
                                <th className="py-2 px-3">Título DB2</th>
                                <th className="py-2 px-3">Vencimento</th>
                                <th className="py-2 px-3">Valor da Parcela</th>
                                <th className="py-2 px-3">Data Pagamento</th>
                                <th className="py-2 px-3 text-center">Status</th>
                                <th className="py-2 px-3">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                              {contrato.parcelas.map((parc, pIdx) => {
                                const isUltima = pIdx === contrato.parcelas.length - 1;

                                return (
                                  <tr 
                                    key={`${parc.numeroTitulo}-${pIdx}`} 
                                    className={`hover:bg-white/5 transition-colors ${
                                      isUltima ? 'bg-purple-950/20' : ''
                                    }`}
                                  >
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-white">Parc. {parc.parcela}</span>
                                        {isUltima && (
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            ÚLTIMA
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 font-mono text-slate-400">
                                      #{parc.numeroTitulo}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-200">
                                      {fmtData(parc.vencimento)}
                                    </td>
                                    <td className="py-2 px-3 font-black text-slate-100">
                                      {fmtMoeda(parc.valor)}
                                    </td>
                                    <td className="py-2 px-3 text-emerald-400 font-semibold">
                                      {parc.statusBaixada ? fmtData(parc.dataPagamento || parc.vencimento) : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        parc.statusBaixada
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      }`}>
                                        {parc.statusBaixada ? 'PAGA' : 'A PAGAR'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1">
                                        {parc.codigoBarras && (
                                          <button
                                            onClick={() => copiarTexto(parc.codigoBarras, parc.numeroTitulo)}
                                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                            title="Copiar código de barras"
                                          >
                                            {copiedId === parc.numeroTitulo ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                                          </button>
                                        )}
                                        {parc.chavePix && (
                                          <button
                                            onClick={() => copiarTexto(parc.chavePix, parc.numeroTitulo)}
                                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-cyan-300 transition-colors"
                                            title="Copiar PIX"
                                          >
                                            <QrCode className="size-3.5" />
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
