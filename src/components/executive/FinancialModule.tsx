import React, { useEffect, useState } from "react";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Calendar, 
  Copy, 
  Check, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  Tag,
  X
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { toast } from "sonner";

interface FinancialModuleProps {
  selectedStore: string;
  globalStartDate?: string;
  globalEndDate?: string;
}

export function FinancialModule({ selectedStore, globalStartDate, globalEndDate }: FinancialModuleProps) {
  // Estados de busca e filtros
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("pendente"); // "" (todos), "pendente", "pago"
  const [startDate, setStartDate] = useState(globalStartDate || "");
  const [endDate, setEndDate] = useState(globalEndDate || "");
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [somenteDesconto, setSomenteDesconto] = useState(false);

  useEffect(() => {
    if (globalStartDate) setStartDate(globalStartDate);
  }, [globalStartDate]);

  useEffect(() => {
    if (globalEndDate) setEndDate(globalEndDate);
  }, [globalEndDate]);

  // Dados carregados da API
  const [kpis, setKpis] = useState<any>(null);
  const [fluxo, setFluxo] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertDesconto, setAlertDesconto] = useState(true);

  // Aba ativa interna do Financeiro (Visão Geral, Contas a Pagar, Contas a Receber)
  const [subTab, setSubTab] = useState<"visao" | "pagar" | "receber">("visao");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"detalhe" | "resumo" | "resumo_loja">("detalhe");
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState<string | null>(null);
  const [lojaSelecionada, setLojaSelecionada] = useState<string | null>(null);
  const [selectedBoleto, setSelectedBoleto] = useState<any>(null);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);

  // Carregar KPIs e Fluxo
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. KPIs
      let kpiUrl = `/api/financeiro/kpis?idEmpresa=${selectedStore}`;
      if (startDate) kpiUrl += `&startDate=${startDate}`;
      if (endDate) kpiUrl += `&endDate=${endDate}`;
      
      const kpiRes = await fetch(kpiUrl);
      const kpiJson = await kpiRes.json();
      setKpis(kpiJson);

      // 2. Fluxo
      const fluxoRes = await fetch(`/api/financeiro/fluxo?idEmpresa=${selectedStore}`);
      const fluxoJson = await fluxoRes.json();
      setFluxo(fluxoJson.fluxo);

      // 3. Listagem de acordo com a aba ativa
      if (subTab === "pagar") {
        let pagarUrl = `/api/financeiro/pagar?idEmpresa=${selectedStore}&status=${status}&busca=${busca}`;
        if (startDate) pagarUrl += `&startDate=${startDate}`;
        if (endDate) pagarUrl += `&endDate=${endDate}`;
        const pagarRes = await fetch(pagarUrl);
        const pagarJson = await pagarRes.json();
        setContasPagar(pagarJson.lista);
      } else if (subTab === "receber") {
        let receberUrl = `/api/financeiro/receber?idEmpresa=${selectedStore}&status=${status}&busca=${busca}`;
        if (startDate) receberUrl += `&startDate=${startDate}`;
        if (endDate) receberUrl += `&endDate=${endDate}`;
        const receberRes = await fetch(receberUrl);
        const receberJson = await receberRes.json();
        setContasReceber(receberJson.lista);
      }
    } catch (e) {
      console.error("Erro ao carregar dados financeiro", e);
      toast.error("Não foi possível estabelecer conexão com a base financeira.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedStore, subTab]);

  const handleApplyFilters = () => {
    fetchData();
    toast.success("Filtros aplicados com sucesso!");
  };

  const handleClearFilters = () => {
    setBusca("");
    setStatus("");
    
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const startDefault = d.toISOString().split('T')[0];
    const endDefault = new Date().toISOString().split('T')[0];
    
    setStartDate(startDefault);
    setEndDate(endDefault);
    setDataPagamento(endDefault);
    setSomenteDesconto(false);
    setStoreFilter(null);
    toast.info("Filtros limpos.");
    // Pequeno timeout para dar tempo de limpar os estados antes de buscar
    setTimeout(() => {
      fetchData();
    }, 50);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Código de barras copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtDate = (dStr: string) => {
    if (!dStr) return "S/ Data";
    const date = new Date(dStr);
    // Garantir fuso correto na formatação
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  // Cálculos rápidos de KPIs
  const totalReceitas = kpis?.receber?.recebido + kpis?.receber?.pendente || 0;
  const totalDespesas = kpis?.pagar?.pago + kpis?.pagar?.pendente || 0;
  const saldoLiquido = totalReceitas - totalDespesas;
  
  // Taxa de Adimplência (Receitas Recebidas / Receitas Totais)
  const taxaAdimplencia = totalReceitas > 0 ? (kpis?.receber?.recebido / totalReceitas) * 100 : 100;

  // Boletos com desconto de antecipação
  const boletosComDesconto = contasPagar.filter(cp => {
    if (!cp.TEMDESCONTO || cp.FLAGBAIXADA === 'T') return false;
    if (dataPagamento) {
      // Ajuste de timezone simples para comparação
      const dtVencimento = new Date(cp.DTVENCIMENTO + 'T12:00:00');
      const dtPagto = new Date(dataPagamento + 'T12:00:00');
      return dtVencimento >= dtPagto;
    }
    return true;
  });
  const totalEconomia = boletosComDesconto.reduce((acc, cp) => acc + (cp.VALORDESCONTO || 0), 0);

  // Filtragem local para a tabela
  const contasPagarFiltradas = contasPagar.filter(cp => {
    const cpLojaNome = cp.LOJA || (cp.IDEMPRESA ? `Filial ${cp.IDEMPRESA}` : "Desconhecido");
    if (storeFilter && cpLojaNome !== storeFilter) return false;

    if (somenteDesconto) {
      if (!cp.TEMDESCONTO || cp.FLAGBAIXADA === 'T') return false;
      if (dataPagamento) {
        const dtVencimento = new Date(cp.DTVENCIMENTO + 'T12:00:00');
        const dtPagto = new Date(dataPagamento + 'T12:00:00');
        if (dtVencimento < dtPagto) return false;
      }
    }
    return true;
  });

  // Resumo por Fornecedor/Cliente
  type ResumoItem = { nome: string; total: number; pendente: number; pago: number; atrasado: number; qtd: number; };
  const buildResumo = (lista: any[], nomeKey: string): ResumoItem[] => {
    const map = new Map<string, ResumoItem>();
    for (const item of lista) {
      const nome = nomeKey === "LOJA" 
        ? (item.LOJA || (item.IDEMPRESA ? `Filial ${item.IDEMPRESA}` : "Desconhecido"))
        : (item[nomeKey] || "Desconhecido");
      const vencido = !item.FLAGBAIXADA && new Date(item.DTVENCIMENTO) < new Date();
      if (!map.has(nome)) map.set(nome, { nome, total: 0, pendente: 0, pago: 0, atrasado: 0, qtd: 0 });
      const entry = map.get(nome)!;
      entry.total += item.VALTITULO || 0;
      entry.qtd += 1;
      if (item.FLAGBAIXADA === 'T') entry.pago += item.VALTITULO || 0;
      else if (vencido) entry.atrasado += item.VALTITULO || 0;
      else entry.pendente += item.VALTITULO || 0;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };
  const resumoPagar = buildResumo(contasPagarFiltradas, "FORNECEDOR");
  const resumoPagarLoja = buildResumo(contasPagarFiltradas, "LOJA");
  const resumoReceber = buildResumo(contasReceber, "CLIENTE");

  // Calcula Fluxo Diário
  const resumoDiarioMap = new Map<string, { dataStr: string; dateObj: Date; aReceber: number; aPagar: number; }>();
  
  contasReceber.forEach(cr => {
    const dStr = cr.DTVENCIMENTO;
    if (!dStr) return;
    const key = dStr.split('T')[0];
    if (!resumoDiarioMap.has(key)) resumoDiarioMap.set(key, { dataStr: key, dateObj: new Date(key + 'T12:00:00'), aReceber: 0, aPagar: 0 });
    resumoDiarioMap.get(key)!.aReceber += (cr.VALTITULO || 0);
  });
  
  contasPagar.forEach(cp => {
    const dStr = cp.DTVENCIMENTO;
    if (!dStr) return;
    const key = dStr.split('T')[0];
    if (!resumoDiarioMap.has(key)) resumoDiarioMap.set(key, { dataStr: key, dateObj: new Date(key + 'T12:00:00'), aReceber: 0, aPagar: 0 });
    resumoDiarioMap.get(key)!.aPagar += (cp.VALTITULO || 0);
  });

  const fluxoDiarioList = Array.from(resumoDiarioMap.values())
    .filter(item => {
      const diffDays = Math.round((item.dateObj.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      return diffDays >= -7 && diffDays <= 30; // Show from 7 days ago up to 30 days ahead
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4">

      {/* Banner de Alerta — Boletos com Desconto por Antecipação */}
      {alertDesconto && boletosComDesconto.length > 0 && (
        <div className="relative flex items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-4 shadow-lg shadow-emerald-900/10 animate-fade-in">
          {/* Ícone */}
          <div className="flex-shrink-0 mt-0.5 p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Tag className="w-5 h-5" />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-300">
              💰 {boletosComDesconto.length} {boletosComDesconto.length === 1 ? "boleto com desconto" : "boletos com desconto"} por antecipação!
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Pague até o dia <strong>{fmtDate(dataPagamento)}</strong> e economize{" "}
              <span className="text-emerald-400 font-bold">
                {totalEconomia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {" "}no total. Acesse a aba{" "}
              <button
                onClick={() => {
                  setSubTab("pagar");
                  setSomenteDesconto(true);
                }}
                className="underline text-emerald-400 hover:text-emerald-300 transition font-semibold"
              >
                Boletos a Pagar
              </button>
              {" "}para ver os detalhes.
            </p>
          </div>

          {/* Badge de economia */}
          <div className="hidden md:flex flex-shrink-0 flex-col items-center justify-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Economia</span>
            <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
              {totalEconomia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          {/* Fechar */}
          <button
            onClick={() => setAlertDesconto(false)}
            className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/10 transition"
            title="Fechar alerta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Menu Interno de Abas */}
      <div className="flex border-b border-white/10 gap-4 mb-2">
        <button 
          onClick={() => setSubTab("visao")}
          className={`pb-3 font-serif font-bold text-lg border-b-2 transition ${subTab === "visao" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Painel de Fluxo
        </button>
        <button 
          onClick={() => setSubTab("pagar")}
          className={`pb-3 font-serif font-bold text-lg border-b-2 transition ${subTab === "pagar" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Boletos a Pagar (Despesas)
        </button>
        <button 
          onClick={() => setSubTab("receber")}
          className={`pb-3 font-serif font-bold text-lg border-b-2 transition ${subTab === "receber" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
        >
          Boletos a Receber (Receitas)
        </button>
      </div>

      {/* Visão Geral (Painel de Fluxo) */}
      {subTab === "visao" && (
        <>
          {/* Grid de Cards KPI */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Card Contas a Receber */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-emerald-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block">TOTAL A RECEBER</span>
                  <h2 className="text-2xl font-bold font-serif text-emerald-400 mt-1 tabular-nums">
                    {fmtCurrency(totalReceitas)}
                  </h2>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between">
                <span>Recebido: {fmtCurrency(kpis?.receber?.recebido || 0)}</span>
                <span className="text-amber-400">A vencer: {fmtCurrency(kpis?.receber?.pendente || 0)}</span>
              </div>
            </div>

            {/* Card Contas a Pagar */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-rose-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block">TOTAL A PAGAR</span>
                  <h2 className="text-2xl font-bold font-serif text-rose-400 mt-1 tabular-nums">
                    {fmtCurrency(totalDespesas)}
                  </h2>
                </div>
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between">
                <span>Pago: {fmtCurrency(kpis?.pagar?.pago || 0)}</span>
                <span className="text-amber-400">Pendente: {fmtCurrency(kpis?.pagar?.pendente || 0)}</span>
              </div>
            </div>

            {/* Card Saldo Projetado */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-primary/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block">SALDO LÍQUIDO PROJETADO</span>
                  <h2 className={`text-2xl font-bold font-serif mt-1 tabular-nums ${saldoLiquido >= 0 ? "text-primary" : "text-rose-400"}`}>
                    {fmtCurrency(saldoLiquido)}
                  </h2>
                </div>
                <div className={`p-2 rounded-lg ${saldoLiquido >= 0 ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-400"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex justify-between items-center">
                <span>Resultado Operacional</span>
                <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${saldoLiquido >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {saldoLiquido >= 0 ? "SUPERÁVIT" : "DÉFICIT"}
                </span>
              </div>
            </div>

            {/* Card Índice de Adimplência */}
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-blue-500/20 transition duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] tracking-executive text-slate-400 block">ÍNDICE DE RECEBIMENTO</span>
                  <h2 className="text-2xl font-bold font-serif text-blue-400 mt-1 tabular-nums">
                    {taxaAdimplencia.toFixed(1)}%
                  </h2>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-4 border-t border-white/5 pt-2 flex items-center justify-between">
                <span>Total Receitas Baixadas</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">Realizado</span>
              </div>
            </div>

          </div>

          {/* Gráfico de Projeção de Fluxo de Caixa */}
          <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <span className="text-[10px] tracking-executive text-primary">Projeção Mensal</span>
              <h3 className="font-serif text-xl font-bold mt-1 text-slate-200">
                Fluxo de Caixa Operacional (Histórico & Previsão)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparativo de receitas e despesas por vencimento de duplicatas e boletos bancários
              </p>
            </div>
            
            <div className="h-80 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fluxo} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="label" 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.4)" 
                    fontSize={11} 
                    tickLine={false} 
                    tickFormatter={(v) => `R$ ${v/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "12px" }}
                    labelStyle={{ fontFamily: "serif", fontWeight: "bold", color: "#f8fafc" }}
                    formatter={(value: any) => [fmtCurrency(value), ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Area 
                    name="Receitas (Entradas)"
                    type="monotone" 
                    dataKey="receita" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorReceita)" 
                    strokeWidth={2}
                  />
                  <Area 
                    name="Despesas (Saídas)"
                    type="monotone" 
                    dataKey="despesa" 
                    stroke="#f43f5e" 
                    fillOpacity={1} 
                    fill="url(#colorDespesa)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Tabela de Fluxo Diário */}
            <div className="mt-8 border-t border-white/5 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h4 className="font-serif font-bold text-slate-200">Totais a Receber e a Pagar por Dia</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4 text-right">A Receber</th>
                      <th className="py-3 px-4 text-right">A Pagar</th>
                      <th className="py-3 px-4 text-right">Saldo do Dia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxoDiarioList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 italic">Nenhum título no período.</td>
                      </tr>
                    ) : fluxoDiarioList.map(item => {
                      const saldo = item.aReceber - item.aPagar;
                      const isToday = item.dataStr === new Date().toISOString().split('T')[0];
                      return (
                        <tr key={item.dataStr} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isToday ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
                          <td className="py-3 px-4 font-mono font-medium text-slate-300">
                            {fmtDate(item.dataStr)}
                            {isToday && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground">HOJE</span>}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">{fmtCurrency(item.aReceber)}</td>
                          <td className="py-3 px-4 text-right font-bold text-rose-400 tabular-nums">{fmtCurrency(item.aPagar)}</td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <span className={`font-bold px-2 py-1 rounded-md ${saldo > 0 ? 'bg-emerald-500/10 text-emerald-400' : saldo < 0 ? 'bg-rose-500/10 text-rose-400' : 'text-slate-400'}`}>
                              {fmtCurrency(saldo)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

      {/* Abas Operacionais: Contas a Pagar (Despesas) ou Contas a Receber (Receitas) */}
      {(subTab === "pagar" || subTab === "receber") && (
        <div className="glass-strong rounded-2xl p-6 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-200">
                {subTab === "pagar" ? "Controle de Contas a Pagar" : "Controle de Contas a Receber"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {subTab === "pagar" 
                  ? "Gerencie os boletos, duplicatas e obrigações com fornecedores" 
                  : "Gerencie os boletos, faturas e recebíveis corporativos de clientes"}
              </p>
            </div>
            
            <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary font-mono self-start md:self-auto">
              {subTab === "pagar" ? contasPagar.length : contasReceber.length} registros listados
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            {/* Campo de Busca por Fornecedor / Documento / Código de barras */}
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Buscar Fornecedor ou ID</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder={subTab === "pagar" ? "Nome do fornecedor, Código de barras, ID..." : "Nome do cliente, Observação, ID..."} 
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-primary text-slate-200 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Filtro de Data Início */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Vencimento Inicial</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            {/* Filtro de Data Fim */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Vencimento Final</label>
              <div className="relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 focus:outline-none focus:border-primary text-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            {/* Filtro de Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 font-semibold">Status do Título</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-primary text-slate-300 text-xs"
              >
                <option value="" className="text-slate-100 bg-slate-950">Todos</option>
                <option value="pendente" className="text-slate-100 bg-slate-950">Pendente (Aberto)</option>
                <option value="pago" className="text-slate-100 bg-slate-950">{subTab === "pagar" ? "Pago (Baixado)" : "Recebido (Baixado)"}</option>
              </select>
            </div>
          </div>

          {/* Filtros Extras de Desconto (Apenas em Contas a Pagar) */}
          {subTab === "pagar" && (
            <div className="flex flex-col md:flex-row items-center gap-4 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mt-[-10px] mb-2">
              <div className="flex items-center gap-2 flex-1">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Simulação de Desconto por Antecipação</span>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-emerald-400 font-semibold">Pagamento previsto para:</label>
                  <input 
                    type="date" 
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="bg-black/40 border border-emerald-500/30 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 text-slate-300 text-xs font-mono"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={somenteDesconto}
                    onChange={(e) => setSomenteDesconto(e.target.checked)}
                    className="w-4 h-4 rounded border-emerald-500/30 bg-black/40 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-gray-900"
                  />
                  <span className="text-xs text-emerald-300 font-medium">Somente com Desconto</span>
                </label>
              </div>
            </div>
          )}

          {/* Botões de Ação de Filtros */}
          <div className="flex justify-between items-center gap-2 border-b border-white/5 pb-4">
            {/* Toggle Detalhe / Resumo por Fornecedor */}
            <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode("detalhe")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "detalhe"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Detalhado
              </button>
              <button
                onClick={() => setViewMode("resumo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === "resumo"
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {subTab === "pagar" ? "▤ Resumo Fornecedor" : "▤ Resumo Cliente"}
              </button>
              {subTab === "pagar" && (
                <button
                  onClick={() => setViewMode("resumo_loja")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    viewMode === "resumo_loja"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  ▤ Resumo Loja
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Limpar Filtros
              </button>
              <button
                onClick={handleApplyFilters}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow shadow-primary/20 hover:opacity-90 transition flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                Filtrar
              </button>
            </div>
          </div>

          {/* Botões de Filtro Rápido por Loja */}
          {subTab === "pagar" && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
              <button
                onClick={() => setStoreFilter(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                  !storeFilter ? "bg-primary text-primary-foreground shadow" : "bg-black/40 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                Todas as Lojas
              </button>
              {Array.from(new Set(contasPagar.map(cp => cp.LOJA || (cp.IDEMPRESA ? `Filial ${cp.IDEMPRESA}` : "Desconhecido")))).sort().map(loja => (
                <button
                  key={loja}
                  onClick={() => setStoreFilter(loja)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                    storeFilter === loja ? "bg-primary text-primary-foreground shadow" : "bg-black/40 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {loja}
                </button>
              ))}
            </div>
          )}

          {/* Tabela de Contas */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : subTab === "pagar" ? (
            viewMode === "resumo_loja" ? (
              <div className="overflow-x-auto">
                {resumoPagarLoja.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-500" />
                    <span>Nenhum dado disponível.</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Total Geral", val: resumoPagarLoja.reduce((s,r)=>s+r.total,0), color: "text-slate-200" },
                        { label: "Pendente", val: resumoPagarLoja.reduce((s,r)=>s+r.pendente,0), color: "text-amber-300" },
                        { label: "Atrasado", val: resumoPagarLoja.reduce((s,r)=>s+r.atrasado,0), color: "text-rose-300" },
                        { label: "Pago", val: resumoPagarLoja.reduce((s,r)=>s+r.pago,0), color: "text-emerald-300" },
                      ].map(kpi => (
                        <div key={kpi.label} className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</span>
                          <span className={`text-sm font-bold tabular-nums ${kpi.color}`}>{fmtCurrency(kpi.val)}</span>
                        </div>
                      ))}
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Filial / Loja</th>
                          <th className="py-3 px-4 text-center">Qtd Títulos</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Pendente</th>
                          <th className="py-3 px-4 text-right">Atrasado</th>
                          <th className="py-3 px-4 text-right">Pago</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoPagarLoja.map((r) => {
                          return (
                          <React.Fragment key={r.nome}>
                          <tr
                            className={`border-b border-white/5 hover:bg-primary/10 transition-colors cursor-pointer group ${
                              lojaSelecionada === r.nome ? "bg-primary/10" : ""
                            }`}
                            onClick={() => setLojaSelecionada(lojaSelecionada === r.nome ? null : r.nome)}
                          >
                            <td className="py-3 px-4 font-bold text-primary max-w-[260px] truncate">
                              <span className={`inline-block transition-transform mr-1 text-[9px] ${lojaSelecionada === r.nome ? "rotate-90" : ""}`}>▶</span>
                              {r.nome}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">{r.qtd}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">{fmtCurrency(r.total)}</td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pendente > 0 ? <span className="text-amber-300 font-semibold">{fmtCurrency(r.pendente)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.atrasado > 0 ? <span className="text-rose-400 font-bold">{fmtCurrency(r.atrasado)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pago > 0 ? <span className="text-emerald-400 font-semibold">{fmtCurrency(r.pago)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                              {lojaSelecionada === r.nome ? "▲ fechar" : "ver títulos →"}
                            </td>
                          </tr>
                          {lojaSelecionada === r.nome && (() => {
                            const titulos = contasPagarFiltradas.filter(cp => (cp.LOJA || "Desconhecido") === r.nome);
                            return (
                              <tr key={`det-${r.nome}`}>
                                <td colSpan={7} className="p-0 bg-transparent">
                                  <div className="mx-3 mb-3 bg-black/50 border border-primary/25 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-primary/5">
                                      <span className="text-xs font-bold text-primary flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        {r.nome} — {titulos.length} título(s)
                                      </span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setLojaSelecionada(null); }}
                                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead>
                                        <tr className="border-b border-white/5 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                                          <th className="py-2 px-4">Cód.</th>
                                          <th className="py-2 px-4">Fornecedor</th>
                                          <th className="py-2 px-4">Filial</th>
                                          <th className="py-2 px-4">Emissão</th>
                                          <th className="py-2 px-4">Vencimento</th>
                                          <th className="py-2 px-4 text-right">Valor</th>
                                          <th className="py-2 px-4 text-center">Status</th>
                                          <th className="py-2 px-4">Cód. Barras</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {titulos.map(cp => {
                                          const isVencido = !cp.FLAGBAIXADA && new Date(cp.DTVENCIMENTO) < new Date();
                                          return (
                                            <tr key={cp.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedBoleto(cp)}>
                                              <td className="py-2 px-4 font-mono text-slate-500">#{cp.IDTITULO}</td>
                                              <td className="py-2 px-4 text-slate-400 max-w-[110px] truncate">{cp.FORNECEDOR || "Desconhecido"}</td>
                                              <td className="py-2 px-4 text-slate-500 font-medium text-[10px] truncate max-w-[90px]">{cp.LOJA || `Filial ${cp.IDEMPRESA}`}</td>
                                              <td className="py-2 px-4 text-slate-400 font-mono">{fmtDate(cp.DTEMISSAO)}</td>
                                              <td className="py-2 px-4 font-mono font-semibold text-slate-300">{fmtDate(cp.DTVENCIMENTO)}</td>
                                              <td className="py-2 px-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <span className="font-bold text-rose-300 tabular-nums">{fmtCurrency(cp.VALTITULO)}</span>
                                                  {cp.TEMDESCONTO && <span className="text-[10px] text-emerald-400">desc. {fmtCurrency(cp.VALORDESCONTO)}</span>}
                                                </div>
                                              </td>
                                              <td className="py-2 px-4 text-center">
                                                {cp.FLAGBAIXADA === 'T'
                                                  ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">PAGO</span>
                                                  : isVencido
                                                  ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">ATRASADO</span>
                                                  : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">ABERTO</span>}
                                              </td>
                                              <td className="py-2 px-4">
                                                {cp.CODIGOBARRAS ? (
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-mono text-[10px] text-slate-500 max-w-[110px] truncate">{cp.CODIGOBARRAS}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(cp.CODIGOBARRAS, `cp-${cp.IDTITULO}`); }} className="p-0.5 hover:bg-white/10 rounded transition" title="Copiar">
                                                      {copiedId === `cp-${cp.IDTITULO}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                                    </button>
                                                  </div>
                                                ) : <span className="text-slate-600 text-[10px] italic">Sem código</span>}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ) : viewMode === "resumo" ? (
              /* ─── RESUMO POR FORNECEDOR ─── */
              <div className="overflow-x-auto">
                {resumoPagar.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-500" />
                    <span>Nenhum dado disponível.</span>
                  </div>
                ) : (
                  <>
                    {/* Total geral */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Total Geral", val: resumoPagar.reduce((s,r)=>s+r.total,0), color: "text-slate-200" },
                        { label: "Pendente", val: resumoPagar.reduce((s,r)=>s+r.pendente,0), color: "text-amber-300" },
                        { label: "Atrasado", val: resumoPagar.reduce((s,r)=>s+r.atrasado,0), color: "text-rose-300" },
                        { label: "Pago", val: resumoPagar.reduce((s,r)=>s+r.pago,0), color: "text-emerald-300" },
                      ].map(kpi => (
                        <div key={kpi.label} className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</span>
                          <span className={`text-sm font-bold tabular-nums ${kpi.color}`}>{fmtCurrency(kpi.val)}</span>
                        </div>
                      ))}
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Fornecedor</th>
                          <th className="py-3 px-4 text-center">Qtd Títulos</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Pendente</th>
                          <th className="py-3 px-4 text-right">Atrasado</th>
                          <th className="py-3 px-4 text-right">Pago</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoPagar.map((r) => {
                          return (
                          <React.Fragment key={r.nome}>
                          <tr
                            className={`border-b border-white/5 hover:bg-primary/10 transition-colors cursor-pointer group ${
                              fornecedorSelecionado === r.nome ? "bg-primary/10" : ""
                            }`}
                            onClick={() => setFornecedorSelecionado(fornecedorSelecionado === r.nome ? null : r.nome)}
                          >
                            <td className="py-3 px-4 font-bold text-primary max-w-[260px] truncate">
                              <span className={`inline-block transition-transform mr-1 text-[9px] ${fornecedorSelecionado === r.nome ? "rotate-90" : ""}`}>▶</span>
                              {r.nome}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">{r.qtd}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">{fmtCurrency(r.total)}</td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pendente > 0 ? <span className="text-amber-300 font-semibold">{fmtCurrency(r.pendente)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.atrasado > 0 ? <span className="text-rose-400 font-bold">{fmtCurrency(r.atrasado)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pago > 0 ? <span className="text-emerald-400 font-semibold">{fmtCurrency(r.pago)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                              {fornecedorSelecionado === r.nome ? "▲ fechar" : "ver títulos →"}
                            </td>
                          </tr>
                          {fornecedorSelecionado === r.nome && (() => {
                            const titulos = contasPagarFiltradas.filter(cp => (cp.FORNECEDOR || "Desconhecido") === r.nome);
                            return (
                              <tr key={`det-${r.nome}`}>
                                <td colSpan={7} className="p-0 bg-transparent">
                                  <div className="mx-3 mb-3 bg-black/50 border border-primary/25 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-primary/5">
                                      <span className="text-xs font-bold text-primary flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        {r.nome} — {titulos.length} título(s)
                                      </span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setFornecedorSelecionado(null); }}
                                        className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded transition"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead>
                                        <tr className="border-b border-white/5 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                                          <th className="py-2 px-4">Cód.</th>
                                          <th className="py-2 px-4">Filial</th>
                                          <th className="py-2 px-4">Emissão</th>
                                          <th className="py-2 px-4">Vencimento</th>
                                          <th className="py-2 px-4 text-right">Valor</th>
                                          <th className="py-2 px-4 text-center">Status</th>
                                          <th className="py-2 px-4">Cód. Barras</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {titulos.map(cp => {
                                          const isVencido = !cp.FLAGBAIXADA && new Date(cp.DTVENCIMENTO) < new Date();
                                          return (
                                            <tr key={cp.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedBoleto(cp)}>
                                              <td className="py-2 px-4 font-mono text-slate-500">#{cp.IDTITULO}</td>
                                              <td className="py-2 px-4 text-slate-400 max-w-[110px] truncate">{cp.LOJA || `Filial ${cp.IDEMPRESA}`}</td>
                                              <td className="py-2 px-4 text-slate-400 font-mono">{fmtDate(cp.DTEMISSAO)}</td>
                                              <td className="py-2 px-4 font-mono font-semibold text-slate-300">{fmtDate(cp.DTVENCIMENTO)}</td>
                                              <td className="py-2 px-4 text-right">
                                                <div className="flex flex-col items-end gap-0.5">
                                                  <span className="font-bold text-rose-300 tabular-nums">{fmtCurrency(cp.VALTITULO)}</span>
                                                  {cp.TEMDESCONTO && <span className="text-[10px] text-emerald-400">desc. {fmtCurrency(cp.VALORDESCONTO)}</span>}
                                                </div>
                                              </td>
                                              <td className="py-2 px-4 text-center">
                                                {cp.FLAGBAIXADA === 'T'
                                                  ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">PAGO</span>
                                                  : isVencido
                                                  ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">ATRASADO</span>
                                                  : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">ABERTO</span>}
                                              </td>
                                              <td className="py-2 px-4">
                                                {cp.CODIGOBARRAS ? (
                                                  <div className="flex items-center gap-1">
                                                    <span className="font-mono text-[10px] text-slate-500 max-w-[110px] truncate">{cp.CODIGOBARRAS}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(cp.CODIGOBARRAS, `cp-${cp.IDTITULO}`); }} className="p-0.5 hover:bg-white/10 rounded transition" title="Copiar">
                                                      {copiedId === `cp-${cp.IDTITULO}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                                                    </button>
                                                  </div>
                                                ) : <span className="text-slate-600 text-[10px] italic">Sem código</span>}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ) : (
              /* ─── DETALHADO ─── */
              <div className="overflow-x-auto">
                {contasPagarFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-500" />
                    <span>Nenhum boleto a pagar encontrado com os filtros aplicados.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Cód. Título</th>
                        <th className="py-3 px-4">Fornecedor</th>
                        <th className="py-3 px-4">Filial</th>
                        <th className="py-3 px-4">Emissão</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Código de Barras</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasPagarFiltradas.map((cp) => {
                        const isVencido = !cp.FLAGBAIXADA && new Date(cp.DTVENCIMENTO) < new Date();
                        return (
                          <tr key={cp.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setSelectedBoleto(cp)}>
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-300 tabular-nums">#{cp.IDTITULO}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-200 max-w-[200px] truncate">{cp.FORNECEDOR || "Fornecedor Desconhecido"}</td>
                            <td className="py-3.5 px-4 text-slate-400 max-w-[150px] truncate">{cp.LOJA || `Filial ${cp.IDEMPRESA}`}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">{fmtDate(cp.DTEMISSAO)}</td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">{fmtDate(cp.DTVENCIMENTO)}</td>
                            <td className="py-3.5 px-4 text-right tabular-nums">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-bold text-sm text-rose-300">{fmtCurrency(cp.VALTITULO)}</span>
                                {cp.TEMDESCONTO && (
                                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 whitespace-nowrap" title="Desconto para pagamento antecipado">
                                    <TrendingDown className="w-3 h-3" />
                                    - {fmtCurrency(cp.VALORDESCONTO)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              {cp.FLAGBAIXADA === 'T' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">PAGO</span>
                              ) : isVencido ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">ATRASADO</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">ABERTO</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              {cp.CODIGOBARRAS ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-slate-400 max-w-[150px] truncate bg-black/40 px-2 py-0.5 rounded border border-white/5">
                                    {cp.CODIGOBARRAS}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(cp.CODIGOBARRAS, `cp-${cp.IDTITULO}`)}
                                    className="p-1 hover:bg-white/10 rounded transition text-slate-400 hover:text-slate-200"
                                    title="Copiar código de barras"
                                  >
                                    {copiedId === `cp-${cp.IDTITULO}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Sem código</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          ) : (
            viewMode === "resumo" ? (
              /* ─── RESUMO POR CLIENTE ─── */
              <div className="overflow-x-auto">
                {resumoReceber.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-500" />
                    <span>Nenhum dado disponível.</span>
                  </div>
                ) : (
                  <>
                    {/* Total geral */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Total Geral", val: resumoReceber.reduce((s,r)=>s+r.total,0), color: "text-slate-200" },
                        { label: "Pendente", val: resumoReceber.reduce((s,r)=>s+r.pendente,0), color: "text-amber-300" },
                        { label: "Atrasado", val: resumoReceber.reduce((s,r)=>s+r.atrasado,0), color: "text-rose-300" },
                        { label: "Recebido", val: resumoReceber.reduce((s,r)=>s+r.pago,0), color: "text-emerald-300" },
                      ].map(kpi => (
                        <div key={kpi.label} className="bg-black/30 rounded-xl p-3 border border-white/5 flex flex-col gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{kpi.label}</span>
                          <span className={`text-sm font-bold tabular-nums ${kpi.color}`}>{fmtCurrency(kpi.val)}</span>
                        </div>
                      ))}
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4 text-center">Qtd Títulos</th>
                          <th className="py-3 px-4 text-right">Total</th>
                          <th className="py-3 px-4 text-right">Pendente</th>
                          <th className="py-3 px-4 text-right">Atrasado</th>
                          <th className="py-3 px-4 text-right">Recebido</th>
                          <th className="py-3 px-4"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumoReceber.map((r) => {
                          return (
                          <React.Fragment key={r.nome}>
                          <tr
                            className={`border-b border-white/5 hover:bg-primary/10 transition-colors cursor-pointer group ${
                              fornecedorSelecionado === r.nome ? "bg-primary/10" : ""
                            }`}
                            onClick={() => setFornecedorSelecionado(fornecedorSelecionado === r.nome ? null : r.nome)}
                          >
                            <td className="py-3 px-4 font-bold text-primary max-w-[260px] truncate">
                              <span className={`inline-block transition-transform mr-1 text-[9px] ${fornecedorSelecionado === r.nome ? "rotate-90" : ""}`}>▶</span>
                              {r.nome}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">{r.qtd}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">{fmtCurrency(r.total)}</td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pendente > 0 ? <span className="text-amber-300 font-semibold">{fmtCurrency(r.pendente)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.atrasado > 0 ? <span className="text-rose-400 font-bold">{fmtCurrency(r.atrasado)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              {r.pago > 0 ? <span className="text-emerald-400 font-semibold">{fmtCurrency(r.pago)}</span> : <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[10px] whitespace-nowrap">
                              {fornecedorSelecionado === r.nome ? "▲ fechar" : "ver títulos →"}
                            </td>
                          </tr>
                          {/* Painel de detalhes inline — Clientes */}
                          {fornecedorSelecionado === r.nome && (() => {
                            const titulos = contasReceber.filter(cr => (cr.CLIENTE || "Desconhecido") === r.nome);
                            return (
                              <tr key={`detalhe-${r.nome}`}>
                                <td colSpan={7} className="p-0">
                                  <div className="bg-black/40 border border-primary/20 rounded-xl mx-2 my-2 overflow-hidden animate-[fadeIn_0.15s_ease]">
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/20 bg-primary/5">
                                      <span className="text-xs font-bold text-primary flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5" />
                                        Títulos de {r.nome} — {titulos.length} registro(s)
                                      </span>
                                      <button onClick={(e) => { e.stopPropagation(); setFornecedorSelecionado(null); }} className="text-slate-400 hover:text-slate-200 transition">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <table className="w-full text-left text-[11px] border-collapse">
                                      <thead>
                                        <tr className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider border-b border-white/5">
                                          <th className="py-2 px-4">Cód.</th>
                                          <th className="py-2 px-4">Filial</th>
                                          <th className="py-2 px-4">Emissão</th>
                                          <th className="py-2 px-4">Vencimento</th>
                                          <th className="py-2 px-4 text-right">Valor</th>
                                          <th className="py-2 px-4 text-center">Status</th>
                                          <th className="py-2 px-4">Detalhes</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {titulos.map(cr => {
                                          const isVencido = !cr.FLAGBAIXADA && new Date(cr.DTVENCIMENTO) < new Date();
                                          return (
                                            <tr key={cr.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                              <td className="py-2.5 px-4 font-mono text-slate-400">#{cr.IDTITULO}</td>
                                              <td className="py-2.5 px-4 text-slate-400 max-w-[120px] truncate">{cr.LOJA || `Filial ${cr.IDEMPRESA}`}</td>
                                              <td className="py-2.5 px-4 text-slate-400 font-mono">{fmtDate(cr.DTEMISSAO)}</td>
                                              <td className="py-2.5 px-4 font-mono font-semibold text-slate-300">{fmtDate(cr.DTVENCIMENTO)}</td>
                                              <td className="py-2.5 px-4 text-right font-bold text-emerald-300 tabular-nums">{fmtCurrency(cr.VALTITULO)}</td>
                                              <td className="py-2.5 px-4 text-center">
                                                {cr.FLAGBAIXADA === 'T' ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">RECEBIDO</span>
                                                ) : isVencido ? (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">ATRASADO</span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">ABERTO</span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-4 text-slate-400 italic max-w-[150px] truncate">{cr.DETALHES || "—"}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
                          </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            ) : (
              /* ─── DETALHADO ─── */
              <div className="overflow-x-auto">
                {contasReceber.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-slate-500" />
                    <span>Nenhum boleto a receber encontrado com os filtros aplicados.</span>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4">Cód. Título</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Filial</th>
                        <th className="py-3 px-4">Emissão</th>
                        <th className="py-3 px-4">Vencimento</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contasReceber.map((cr) => {
                        const isVencido = !cr.FLAGBAIXADA && new Date(cr.DTVENCIMENTO) < new Date();
                        return (
                          <tr key={cr.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-300 tabular-nums">#{cr.IDTITULO}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-200 max-w-[200px] truncate">{cr.CLIENTE || "Cliente Balcão"}</td>
                            <td className="py-3.5 px-4 text-slate-400 max-w-[150px] truncate">{cr.LOJA || `Filial ${cr.IDEMPRESA}`}</td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono">{fmtDate(cr.DTEMISSAO)}</td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">{fmtDate(cr.DTVENCIMENTO)}</td>
                            <td className="py-3.5 px-4 text-right font-bold text-sm text-emerald-300 tabular-nums">{fmtCurrency(cr.VALTITULO)}</td>
                            <td className="py-3.5 px-4 text-center">
                              {cr.FLAGBAIXADA === 'T' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">RECEBIDO</span>
                              ) : isVencido ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">ATRASADO</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">ABERTO</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 max-w-[180px] truncate text-slate-400 italic">
                              {cr.DETALHES || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Modal de Boleto */}
      {selectedBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={() => setSelectedBoleto(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center bg-slate-800 px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-serif font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Detalhes do Boleto #{selectedBoleto.IDTITULO}
              </h3>
              <button onClick={() => setSelectedBoleto(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Fornecedor</span>
                  <span className="font-bold text-slate-200 mt-1">{selectedBoleto.FORNECEDOR || "Desconhecido"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Filial</span>
                  <span className="text-slate-200 mt-1">{selectedBoleto.LOJA || `Filial ID ${selectedBoleto.IDEMPRESA}`}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Emissão</span>
                  <span className="font-mono text-slate-200 mt-1">{fmtDate(selectedBoleto.DTEMISSAO)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Vencimento</span>
                  <span className="font-mono font-bold text-amber-400 mt-1">{fmtDate(selectedBoleto.DTVENCIMENTO)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Valor do Título</span>
                  <span className="font-bold text-lg text-rose-400 mt-1">{fmtCurrency(selectedBoleto.VALTITULO)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Status</span>
                  <div className="mt-1">
                    {selectedBoleto.FLAGBAIXADA === 'T'
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PAGO</span>
                      : (!selectedBoleto.FLAGBAIXADA && new Date(selectedBoleto.DTVENCIMENTO) < new Date())
                      ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">ATRASADO</span>
                      : <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">ABERTO</span>}
                  </div>
                </div>
              </div>

              {selectedBoleto.TEMDESCONTO && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Desconto por antecipação</span>
                  </div>
                  <span className="font-bold text-emerald-400">-{fmtCurrency(selectedBoleto.VALORDESCONTO)}</span>
                </div>
              )}

              <div className="mt-2 flex flex-col gap-2">
                <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">Linha Digitável / Código de Barras</span>
                {selectedBoleto.CODIGOBARRAS ? (
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3">
                    <span className="font-mono text-[11px] text-slate-300 break-all select-all">{selectedBoleto.CODIGOBARRAS}</span>
                    <button
                      onClick={() => copyToClipboard(selectedBoleto.CODIGOBARRAS, `modal-${selectedBoleto.IDTITULO}`)}
                      className="flex-shrink-0 ml-4 p-2 bg-primary/20 hover:bg-primary/40 text-primary rounded-lg transition"
                      title="Copiar"
                    >
                      {copiedId === `modal-${selectedBoleto.IDTITULO}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Boleto sem código de barras cadastrado no sistema.</span>
                )}
              </div>
            </div>
            
            {/* Ações */}
            <div className="bg-slate-950 p-4 border-t border-slate-700 flex justify-end gap-3">
              <button onClick={() => setSelectedBoleto(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

