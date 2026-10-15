import { useState, useEffect } from "react";
import { 
  Calculator, BookOpen, FileSpreadsheet, Search, Calendar, Building2, 
  DollarSign, TrendingUp, AlertCircle, Percent, ArrowUpDown, ChevronDown, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface AccountingModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

export function AccountingModule({ selectedStore, globalStartDate, globalEndDate }: AccountingModuleProps) {
  const [subTab, setSubTab] = useState<"balancete" | "lancamentos" | "plano">("balancete");
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  
  // Período local
  const [startDate, setStartDate] = useState(globalStartDate);
  const [endDate, setEndDate] = useState(globalEndDate);

  // Dados
  const [balancete, setBalancete] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [planoContas, setPlanoContas] = useState<any[]>([]);

  // Sincronizar datas globais
  useEffect(() => {
    if (globalStartDate) setStartDate(globalStartDate);
  }, [globalStartDate]);

  useEffect(() => {
    if (globalEndDate) setEndDate(globalEndDate);
  }, [globalEndDate]);

  // Carregar dados
  const fetchData = async () => {
    setLoading(true);
    try {
      if (subTab === "balancete") {
        let url = `/api/contabilidade/balancete?startDate=${startDate}&endDate=${endDate}`;
        if (selectedStore && selectedStore !== "todas") url += `&idEmpresa=${selectedStore}`;
        const res = await fetch(url);
        const data = await res.json();
        setBalancete(data.lista || []);
      } else if (subTab === "lancamentos") {
        let url = `/api/contabilidade/lancamentos?startDate=${startDate}&endDate=${endDate}`;
        if (selectedStore && selectedStore !== "todas") url += `&idEmpresa=${selectedStore}`;
        const res = await fetch(url);
        const data = await res.json();
        setLancamentos(data.lista || []);
      } else if (subTab === "plano") {
        const res = await fetch(`/api/contabilidade/plano-contas`);
        const data = await res.json();
        setPlanoContas(data.lista || []);
      }
    } catch (e) {
      console.error("Erro ao buscar dados contábeis:", e);
      toast.error("Erro ao conectar com as APIs de contabilidade.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [subTab, selectedStore, startDate, endDate]);

  const fmtCurrency = (val: number) => {
    if (val === null || val === undefined || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Filtrar Balancete
  const balanceteFiltrado = balancete.filter(item => 
    item.DESCRCTACONTABIL.toLowerCase().includes(busca.toLowerCase()) ||
    item.CLASSIFICACAO.includes(busca)
  );

  // Filtrar Lançamentos
  const lancamentosFiltrados = lancamentos.filter(item => 
    item.CONTA.toLowerCase().includes(busca.toLowerCase()) ||
    item.HISTORICO.toLowerCase().includes(busca.toLowerCase()) ||
    item.VALLANCAMENTO.toString().includes(busca)
  );

  // Filtrar Plano de Contas
  const planoFiltrado = planoContas.filter(item => 
    item.DESCRCTACONTABIL.toLowerCase().includes(busca.toLowerCase()) ||
    item.CLASSIFICACAO.includes(busca)
  );

  // Cálculos rápidos para o Balancete (Ativo, Passivo, Receitas, Despesas)
  const totalDebitos = balancete.reduce((acc, cur) => acc + (cur.DEBITOS || 0), 0);
  const totalCreditos = balancete.reduce((acc, cur) => acc + (cur.CREDITOS || 0), 0);

  // Achar receita e despesa para lucro estimado
  const totalReceita = balancete
    .filter(item => item.CLASSIFICACAO.startsWith("3"))
    .reduce((acc, cur) => acc + (cur.SALDO_ATUAL || 0), 0);
  const totalDespesa = balancete
    .filter(item => item.CLASSIFICACAO.startsWith("4"))
    .reduce((acc, cur) => acc + (cur.SALDO_ATUAL || 0), 0);
  const lucroEstimado = Math.abs(totalReceita) - Math.abs(totalDespesa);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4">
      
      {/* Menu Interno de Abas */}
      <div className="flex border-b border-white/10 gap-6 mb-2 overflow-x-auto pb-1">
        <button 
          onClick={() => { setSubTab("balancete"); setBusca(""); }}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${subTab === "balancete" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Balancete de Verificação
        </button>
        <button 
          onClick={() => { setSubTab("lancamentos"); setBusca(""); }}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${subTab === "lancamentos" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          <BookOpen className="w-4 h-4" />
          Diário Contábil (Lançamentos)
        </button>
        <button 
          onClick={() => { setSubTab("plano"); setBusca(""); }}
          className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${subTab === "plano" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          <Calculator className="w-4 h-4" />
          Plano de Contas
        </button>
      </div>

      {/* Grid de KPIs Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Débitos do Período */}
        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-cyan-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">TOTAL DE DÉBITOS</span>
              <h2 className="text-2xl font-bold font-serif text-cyan-400 mt-1 tabular-nums">
                {fmtCurrency(totalDebitos)}
              </h2>
            </div>
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
            Movimentação devedora acumulada
          </div>
        </div>

        {/* Créditos do Período */}
        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">TOTAL DE CRÉDITOS</span>
              <h2 className="text-2xl font-bold font-serif text-emerald-400 mt-1 tabular-nums">
                {fmtCurrency(totalCreditos)}
              </h2>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
            Movimentação credora acumulada
          </div>
        </div>

        {/* Receita Líquida Contábil */}
        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-indigo-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">RECEITAS TOTAIS</span>
              <h2 className="text-2xl font-bold font-serif text-indigo-400 mt-1 tabular-nums">
                {fmtCurrency(Math.abs(totalReceita))}
              </h2>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
            Grupo 3 do plano de contas
          </div>
        </div>

        {/* Resultado Contábil Estimado */}
        <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/20 transition duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] tracking-executive text-slate-400 block font-semibold">RESULTADO ESTIMADO (LUCRO)</span>
              <h2 className={`text-2xl font-bold font-serif mt-1 tabular-nums ${lucroEstimado >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {fmtCurrency(lucroEstimado)}
              </h2>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 border-t border-white/5 pt-2">
            Receitas menos custos/despesas (Grupo 3 - 4)
          </div>
        </div>
      </div>

      {/* Seção Filtro e Tabela */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-200">
              {subTab === "balancete" && "Balancete de Verificação Contábil"}
              {subTab === "lancamentos" && "Lançamentos no Livro Diário"}
              {subTab === "plano" && "Plano de Contas Contábil"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {subTab === "balancete" && "Consulte o demonstrativo de saldos iniciais, débitos, créditos e saldos finais de todas as contas corporativas."}
              {subTab === "lancamentos" && "Últimos registros das movimentações contábeis efetuadas em partidas dobradas no período."}
              {subTab === "plano" && "Estrutura organizacional completa das contas patrimoniais e de resultado cadastradas no ERP."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Input de Busca */}
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={subTab === "plano" ? "Buscar por conta ou código..." : "Filtrar resultados..."}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-primary placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 1. ABA DO BALANCETE */}
            {subTab === "balancete" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Código / Classificação</th>
                      <th className="py-3 px-4">Conta Contábil</th>
                      <th className="py-3 px-4 text-center">Tipo</th>
                      <th className="py-3 px-4 text-right">Saldo Inicial</th>
                      <th className="py-3 px-4 text-right">Débito (+)</th>
                      <th className="py-3 px-4 text-right">Crédito (-)</th>
                      <th className="py-3 px-4 text-right">Saldo Atual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceteFiltrado.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500">
                          Nenhuma conta encontrada para o filtro informado.
                        </td>
                      </tr>
                    ) : (
                      balanceteFiltrado.map((item, idx) => (
                        <tr 
                          key={item.IDCTACONTABIL || idx} 
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${item.TIPOCTACONTABIL === 'S' ? 'bg-white/[0.01] font-bold text-slate-100' : 'text-slate-300'}`}
                        >
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400 tabular-nums">
                            {item.CLASSIFICACAO}
                          </td>
                          <td className="py-3 px-4 max-w-[260px] truncate" title={item.DESCRCTACONTABIL}>
                            <span className={item.TIPOCTACONTABIL === 'S' ? '' : 'pl-4 border-l border-white/10'}>
                              {item.DESCRCTACONTABIL}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${item.TIPOCTACONTABIL === 'S' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'}`}>
                              {item.TIPOCTACONTABIL === 'S' ? 'Sintética' : 'Analítica'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium">{fmtCurrency(item.SALDO_INICIAL)}</td>
                          <td className="py-3 px-4 text-right font-mono text-cyan-400">
                            {item.DEBITOS > 0 ? `+ ${fmtCurrency(item.DEBITOS)}` : "—"}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400">
                            {item.CREDITOS > 0 ? `- ${fmtCurrency(item.CREDITOS)}` : "—"}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${item.SALDO_ATUAL < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                            {fmtCurrency(item.SALDO_ATUAL)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. ABA DE LANÇAMENTOS */}
            {subTab === "lancamentos" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Data Movimento</th>
                      <th className="py-3 px-4">Conta</th>
                      <th className="py-3 px-4 text-center">Natureza</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4">Histórico / Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          Nenhum lançamento encontrado para o período ou filtro.
                        </td>
                      </tr>
                    ) : (
                      lancamentosFiltrados.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors text-slate-300">
                          <td className="py-3 px-4 font-mono text-slate-400 shrink-0">
                            {new Date(item.DTMOVIMENTO).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-200 truncate max-w-[200px]" title={item.CONTA}>
                            {item.CONTA}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.TIPONATUREZALCTO === 'D' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {item.TIPONATUREZALCTO === 'D' ? 'DÉBITO' : 'CRÉDITO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                            {fmtCurrency(item.VALLANCAMENTO)}
                          </td>
                          <td className="py-3 px-4 max-w-[320px] truncate text-slate-400 font-serif" title={item.HISTORICO}>
                            {item.HISTORICO}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. ABA DE PLANO DE CONTAS */}
            {subTab === "plano" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Classificação</th>
                      <th className="py-3 px-4">Conta Contábil</th>
                      <th className="py-3 px-4 text-center">Tipo</th>
                      <th className="py-3 px-4 text-center">Natureza</th>
                      <th className="py-3 px-4 text-center">ID CISS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planoFiltrado.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          Nenhuma conta cadastrada encontrada no plano.
                        </td>
                      </tr>
                    ) : (
                      planoFiltrado.map((item, idx) => {
                        const levelClass = item.NIVEL === 1 ? 'font-bold text-slate-100 bg-white/[0.01]' :
                                           item.NIVEL === 2 ? 'font-semibold text-slate-200 pl-4' : 'text-slate-350 pl-8';
                        return (
                          <tr key={item.IDCTACONTABIL || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-2.5 px-4 font-mono text-slate-400 tabular-nums">
                              {item.CLASSIFICACAO}
                            </td>
                            <td className={`py-2.5 px-4 ${levelClass}`}>
                              {item.DESCRCTACONTABIL}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${item.TIPOCTACONTABIL === 'S' ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-400'}`}>
                                {item.TIPOCTACONTABIL === 'S' ? 'Sintética' : 'Analítica'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${item.TIPONATUREZA === 'D' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                {item.TIPONATUREZA === 'D' ? 'Devedora' : 'Credora'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-[10px] text-slate-500 tabular-nums">
                              {item.IDCTACONTABIL}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
