import { useEffect, useState } from "react";
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
  const [status, setStatus] = useState(""); // "" (todos), "pendente", "pago"
  const [startDate, setStartDate] = useState(globalStartDate || "");
  const [endDate, setEndDate] = useState(globalEndDate || "");

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
    setStartDate("");
    setEndDate("");
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
  const boletosComDesconto = contasPagar.filter(cp => cp.TEMDESCONTO && cp.FLAGBAIXADA !== 'T');
  const totalEconomia = boletosComDesconto.reduce((acc, cp) => acc + (cp.VALORDESCONTO || 0), 0);

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
              Pague antes do vencimento e economize{" "}
              <span className="text-emerald-400 font-bold">
                {totalEconomia.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {" "}no total. Acesse a aba{" "}
              <button
                onClick={() => setSubTab("pagar")}
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
                <option value="">Todos</option>
                <option value="pendente">Pendente (Aberto)</option>
                <option value="pago">{subTab === "pagar" ? "Pago (Baixado)" : "Recebido (Baixado)"}</option>
              </select>
            </div>
          </div>

          {/* Botões de Ação de Filtros */}
          <div className="flex justify-end gap-2 border-b border-white/5 pb-4">
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

          {/* Tabela de Contas */}
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : subTab === "pagar" ? (
            <div className="overflow-x-auto">
              {contasPagar.length === 0 ? (
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
                    {contasPagar.map((cp) => {
                      const isVencido = !cp.FLAGBAIXADA && new Date(cp.DTVENCIMENTO) < new Date();
                      return (
                        <tr key={cp.IDTITULO} className="border-b border-white/5 hover:bg-white/5 transition-colors">
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
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                PAGO
                              </span>
                            ) : isVencido ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">
                                ATRASADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">
                                ABERTO
                              </span>
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
          ) : (
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
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                RECEBIDO
                              </span>
                            ) : isVencido ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">
                                ATRASADO
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400">
                                ABERTO
                              </span>
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
          )}
        </div>
      )}

    </div>
  );
}

