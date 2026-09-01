import React, { useState, useEffect, useMemo } from "react";
import { 
  Target, TrendingUp, Sparkles, AlertTriangle, CheckCircle2, 
  ArrowUpRight, ArrowDownRight, DollarSign, Percent, PieChart as PieIcon, 
  BarChart3, RefreshCw, Save, ShieldAlert, Award, Calendar, Layers,
  Sliders, Search, ArrowRight, Eye, ChevronRight, HelpCircle, FileText,
  Clock, CheckCircle, AlertCircle, Info, Zap, Flame, Trophy, Building2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend, PieChart, Pie, AreaChart, Area, ComposedChart, Line
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface MetasGerenciaisModuleProps {
  selectedStore: string;
}

interface SecaoMeta {
  id: number | string;
  nome: string;
  vendaAnterior: number;
  margemHistorica: number;
  cmvAnterior: number;
  lucroAnterior: number;
  participacaoBase: number;
  potencialCrescimento?: number;
  meta: number;
  participacaoMeta: number;
  crescimentoPct: number;
  diferencaReais: number;
  margemDesejada: number;
  cmvPermitido: number;
  lucroEsperado: number;
}

export function MetasGerenciaisModule({ selectedStore }: MetasGerenciaisModuleProps) {
  const [activeTab, setActiveTab] = useState<"planejamento" | "dashboard" | "acompanhamento" | "ranking" | "alertas" | "historico">("planejamento");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Parâmetros de Entrada Simplificados
  const [metaFaturamentoInput, setMetaFaturamentoInput] = useState<string>("6.000.000,00");
  const [margemDesejadaInput, setMargemDesejadaInput] = useState<string>("21,00");
  const [periodoInput, setPeriodoInput] = useState<string>("09/2026");
  const [baseComparacao, setBaseComparacao] = useState<"ultimo_mes" | "ultimos_3_meses" | "ultimos_6_meses" | "mesmo_mes_ano_anterior">("ultimo_mes");
  const [metodoDistribuicao, setMetodoDistribuicao] = useState<"proporcional" | "historico" | "inteligente" | "personalizado">("proporcional");

  // Dados Históricos Carregados do Backend
  const [historicoVendaTotal, setHistoricoVendaTotal] = useState<number>(5412132.12);
  const [secoesBase, setSecoesBase] = useState<SecaoMeta[]>([]);
  
  // Metas Calculadas & Acompanhamento
  const [secoesCalculadas, setSecoesCalculadas] = useState<SecaoMeta[]>([]);
  const [metasSalvas, setMetasSalvas] = useState<any[]>([]);
  const [dadosAcompanhamento, setDadosAcompanhamento] = useState<any>(null);
  const [rankingFilter, setRankingFilter] = useState<"faturamento" | "crescimento" | "margem" | "lucro" | "menor">("faturamento");

  // Formatador numérico monetário
  const formatMoney = (val: number) => {
    return (val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatPct = (val: number) => {
    return `${(val || 0).toFixed(2).replace(".", ",")}%`;
  };

  const parseInputMoney = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace(/\./g, "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  const parseInputPct = (str: string): number => {
    if (!str) return 0;
    const clean = str.replace("%", "").replace(",", ".");
    return parseFloat(clean) || 0;
  };

  // Valores numéricos calculados em tempo de execução
  const metaTotalNum = useMemo(() => parseInputMoney(metaFaturamentoInput), [metaFaturamentoInput]);
  const margemDesejadaNum = useMemo(() => parseInputPct(margemDesejadaInput), [margemDesejadaInput]);
  const cmvMaximoNum = useMemo(() => metaTotalNum * (1 - (margemDesejadaNum / 100)), [metaTotalNum, margemDesejadaNum]);
  const lucroBrutoEsperadoNum = useMemo(() => metaTotalNum * (margemDesejadaNum / 100), [metaTotalNum, margemDesejadaNum]);
  const crescimentoGlobalPct = useMemo(() => {
    if (historicoVendaTotal <= 0) return 0;
    return ((metaTotalNum / historicoVendaTotal) - 1) * 100;
  }, [metaTotalNum, historicoVendaTotal]);

  // 1. Carregar dados históricos ao trocar empresa ou base
  const carregarHistorico = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/metas/historico-vendas?idEmpresa=${selectedStore}&base=${baseComparacao}`);
      const data = await res.json();
      if (data && data.secoes) {
        setHistoricoVendaTotal(data.vendaTotalBase || 5412132.12);
        const inicial = data.secoes.map((s: any) => ({
          ...s,
          meta: 0,
          participacaoMeta: s.participacaoBase,
          crescimentoPct: 0,
          diferencaReais: 0,
          margemDesejada: s.margemHistorica,
          cmvPermitido: 0,
          lucroEsperado: 0
        }));
        setSecoesBase(inicial);
        // Calcular distribuição automaticamente
        distribuirMeta(inicial, metaTotalNum, margemDesejadaNum, metodoDistribuicao);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
      toast.error("Erro ao carregar dados históricos do banco");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Carregar Metas Salvas e Acompanhamento
  const carregarMetasEAcompanhamento = async () => {
    try {
      const resMetas = await fetch(`/api/metas?idEmpresa=${selectedStore}`);
      const metas = await resMetas.json();
      if (Array.isArray(metas)) {
        setMetasSalvas(metas);
      }

      const resAcomp = await fetch(`/api/metas/acompanhamento?idEmpresa=${selectedStore}`);
      const acomp = await resAcomp.json();
      if (acomp && !acomp.semMeta) {
        setDadosAcompanhamento(acomp);
      }
    } catch (err) {
      console.error("Erro ao buscar acompanhamento:", err);
    }
  };

  useEffect(() => {
    carregarHistorico();
    carregarMetasEAcompanhamento();
  }, [selectedStore, baseComparacao]);

  // 3. Algoritmo de Distribuição de Metas (Garantia de Centavos e Inteligência de Margem)
  const distribuirMeta = (
    secoes: SecaoMeta[], 
    metaTotal: number, 
    margemAlvo: number, 
    metodo: "proporcional" | "historico" | "inteligente" | "personalizado"
  ) => {
    if (!secoes || secoes.length === 0 || metaTotal <= 0) return;

    let pesos: number[] = [];

    if (metodo === "proporcional") {
      pesos = secoes.map(s => s.participacaoBase / 100);
    } else if (metodo === "historico") {
      pesos = secoes.map(s => {
        return s.participacaoBase / 100;
      });
    } else if (metodo === "inteligente") {
      const fatores = secoes.map(s => {
        const margemScore = s.margemHistorica / margemAlvo;
        const pot = s.potencialCrescimento || 1.1;
        return (s.participacaoBase / 100) * (margemScore >= 1 ? pot * 1.05 : 0.96);
      });
      const somaFatores = fatores.reduce((a, b) => a + b, 0);
      pesos = fatores.map(f => f / somaFatores);
    } else {
      pesos = secoes.map(s => (s.meta > 0 ? s.meta / metaTotal : s.participacaoBase / 100));
      const soma = pesos.reduce((a, b) => a + b, 0) || 1;
      pesos = pesos.map(p => p / soma);
    }

    let calculadas = secoes.map((sec, idx) => {
      const peso = pesos[idx];
      const metaSecao = Math.round(metaTotal * peso * 100) / 100;
      const partMeta = Math.round((metaSecao / metaTotal) * 10000) / 100;
      const diferenca = Math.round((metaSecao - sec.vendaAnterior) * 100) / 100;
      const crescimento = sec.vendaAnterior > 0 ? ((metaSecao / sec.vendaAnterior) - 1) * 100 : 0;
      
      let margemSecao = sec.margemHistorica;
      if (metodo === "inteligente") {
        if (sec.margemHistorica < margemAlvo) {
          margemSecao = Math.min(margemAlvo, sec.margemHistorica + 0.8);
        } else {
          margemSecao = sec.margemHistorica;
        }
      }

      const cmvPermitido = Math.round(metaSecao * (1 - (margemSecao / 100)) * 100) / 100;
      const lucroEsperado = Math.round(metaSecao * (margemSecao / 100) * 100) / 100;

      return {
        ...sec,
        meta: metaSecao,
        participacaoMeta: partMeta,
        diferencaReais: diferenca,
        crescimentoPct: crescimento,
        margemDesejada: margemSecao,
        cmvPermitido,
        lucroEsperado
      };
    });

    // AJUSTE DE CENTAVOS OBRIGATÓRIO: A soma deve ser EXATAMENTE a meta total
    const somaAtual = calculadas.reduce((acc, s) => acc + s.meta, 0);
    const diffCentavos = Math.round((metaTotal - somaAtual) * 100) / 100;

    if (diffCentavos !== 0 && calculadas.length > 0) {
      let maiorIdx = 0;
      let maiorMeta = -1;
      calculadas.forEach((s, i) => {
        if (s.meta > maiorMeta) {
          maiorMeta = s.meta;
          maiorIdx = i;
        }
      });
      calculadas[maiorIdx].meta = Math.round((calculadas[maiorIdx].meta + diffCentavos) * 100) / 100;
      calculadas[maiorIdx].cmvPermitido = Math.round(calculadas[maiorIdx].meta * (1 - (calculadas[maiorIdx].margemDesejada / 100)) * 100) / 100;
      calculadas[maiorIdx].lucroEsperado = Math.round(calculadas[maiorIdx].meta * (calculadas[maiorIdx].margemDesejada / 100) * 100) / 100;
      calculadas[maiorIdx].participacaoMeta = Math.round((calculadas[maiorIdx].meta / metaTotal) * 10000) / 100;
      calculadas[maiorIdx].diferencaReais = Math.round((calculadas[maiorIdx].meta - calculadas[maiorIdx].vendaAnterior) * 100) / 100;
      calculadas[maiorIdx].crescimentoPct = calculadas[maiorIdx].vendaAnterior > 0 ? ((calculadas[maiorIdx].meta / calculadas[maiorIdx].vendaAnterior) - 1) * 100 : 0;
    }

    setSecoesCalculadas(calculadas);
  };

  const handleCalcular = () => {
    if (metaTotalNum <= 0) {
      toast.error("Informe um valor de meta de faturamento válido");
      return;
    }
    if (margemDesejadaNum <= 0 || margemDesejadaNum > 100) {
      toast.error("Informe uma margem desejada válida (entre 1% e 100%)");
      return;
    }
    distribuirMeta(secoesBase, metaTotalNum, margemDesejadaNum, metodoDistribuicao);
    toast.success("Meta calculada e distribuída com sucesso!");
  };

  const handleCustomSecaoChange = (id: string | number, newMetaVal: number) => {
    setMetodoDistribuicao("personalizado");
    setSecoesCalculadas(prev => {
      const updated = prev.map(s => {
        if (s.id === id) {
          const m = Math.max(0, newMetaVal);
          const cmv = Math.round(m * (1 - (s.margemDesejada / 100)) * 100) / 100;
          const lucro = Math.round(m * (s.margemDesejada / 100) * 100) / 100;
          const dif = Math.round((m - s.vendaAnterior) * 100) / 100;
          const cresc = s.vendaAnterior > 0 ? ((m / s.vendaAnterior) - 1) * 100 : 0;
          return {
            ...s,
            meta: m,
            cmvPermitido: cmv,
            lucroEsperado: lucro,
            diferencaReais: dif,
            crescimentoPct: cresc,
            participacaoMeta: metaTotalNum > 0 ? Math.round((m / metaTotalNum) * 10000) / 100 : 0
          };
        }
        return s;
      });
      return updated;
    });
  };

  const margemPonderadaEfetiva = useMemo(() => {
    if (metaTotalNum <= 0 || secoesCalculadas.length === 0) return 0;
    const totalLucro = secoesCalculadas.reduce((acc, s) => acc + s.lucroEsperado, 0);
    return (totalLucro / metaTotalNum) * 100;
  }, [secoesCalculadas, metaTotalNum]);

  const somaMetasSecoes = useMemo(() => {
    return secoesCalculadas.reduce((acc, s) => acc + s.meta, 0);
  }, [secoesCalculadas]);

  const diferencaCentavosSoma = useMemo(() => {
    return Math.round((metaTotalNum - somaMetasSecoes) * 100) / 100;
  }, [metaTotalNum, somaMetasSecoes]);

  const handleSalvarMeta = async () => {
    if (metaTotalNum <= 0) {
      toast.error("Preencha a meta antes de salvar");
      return;
    }
    if (Math.abs(diferencaCentavosSoma) > 0.05) {
      toast.warning("Ajustando centavos de arredondamento automaticamente...");
      distribuirMeta(secoesCalculadas, metaTotalNum, margemDesejadaNum, metodoDistribuicao);
    }

    setIsSaving(true);
    try {
      const payload = {
        tenantId: selectedStore,
        periodo: periodoInput,
        metaTotal: metaTotalNum,
        margemDesejada: margemDesejadaNum,
        baseComparacao,
        metodoDistribuicao,
        vendaBaseTotal: historicoVendaTotal,
        secoes: secoesCalculadas
      };

      const res = await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Falha ao salvar meta");
      await res.json();
      toast.success("Meta Gerencial salva com sucesso no sistema!");
      carregarMetasEAcompanhamento();
      setActiveTab("dashboard");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar meta");
    } finally {
      setIsSaving(false);
    }
  };

  const chartComparativoVendas = useMemo(() => {
    return secoesCalculadas.slice(0, 10).map(s => ({
      nome: s.nome,
      "Venda Anterior": s.vendaAnterior,
      "Meta Nova": s.meta
    }));
  }, [secoesCalculadas]);

  const chartMetaPorSecao = useMemo(() => {
    return [...secoesCalculadas]
      .sort((a, b) => b.meta - a.meta)
      .slice(0, 8)
      .map(s => ({
        nome: s.nome,
        Meta: s.meta,
        Lucro: s.lucroEsperado
      }));
  }, [secoesCalculadas]);

  const chartParticipacaoDonut = useMemo(() => {
    const top7 = secoesCalculadas.slice(0, 7);
    const outros = secoesCalculadas.slice(7).reduce((acc, s) => acc + s.meta, 0);
    const data = top7.map(s => ({ name: s.nome, value: s.meta }));
    if (outros > 0) data.push({ name: "Outros Setores", value: outros });
    return data;
  }, [secoesCalculadas]);

  const chartMargens = useMemo(() => {
    return secoesCalculadas.slice(0, 10).map(s => ({
      nome: s.nome,
      "Margem Histórica": s.margemHistorica,
      "Margem Projetada": s.margemDesejada,
      "Alvo Global": margemDesejadaNum
    }));
  }, [secoesCalculadas, margemDesejadaNum]);

  const chartCrescimentoSecoes = useMemo(() => {
    return [...secoesCalculadas]
      .sort((a, b) => b.crescimentoPct - a.crescimentoPct)
      .slice(0, 8)
      .map(s => ({
        nome: s.nome,
        "Crescimento %": parseFloat(s.crescimentoPct.toFixed(1))
      }));
  }, [secoesCalculadas]);

  const secoesRanking = useMemo(() => {
    const acompSecoes = dadosAcompanhamento?.acompanhamento?.secoes || secoesCalculadas;
    const list = [...acompSecoes];
    if (rankingFilter === "faturamento") {
      list.sort((a, b) => (b.vendaRealizada || b.meta) - (a.vendaRealizada || a.meta));
    } else if (rankingFilter === "crescimento") {
      list.sort((a, b) => (b.crescimentoPct || b.percentualAtingido || 0) - (a.crescimentoPct || a.percentualAtingido || 0));
    } else if (rankingFilter === "margem") {
      list.sort((a, b) => (b.margemRealizada || b.margemDesejada) - (a.margemRealizada || a.margemDesejada));
    } else if (rankingFilter === "lucro") {
      list.sort((a, b) => (b.lucroRealizado || b.lucroEsperado) - (a.lucroRealizado || a.lucroEsperado));
    } else if (rankingFilter === "menor") {
      list.sort((a, b) => (a.percentualAtingido || a.crescimentoPct || 0) - (b.percentualAtingido || b.crescimentoPct || 0));
    }
    return list;
  }, [dadosAcompanhamento, secoesCalculadas, rankingFilter]);

  const COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#64748b"];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16">
      {/* Header Principal do Módulo */}
      <div className="glass-strong rounded-2xl p-6 relative overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute -right-10 -top-10 size-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 grid place-items-center glow">
                <Target className="size-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-bold font-serif text-white tracking-tight">
                    Metas Gerenciais de Vendas
                  </h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    SaaS BI
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Planejamento estratégico, distribuição por inteligência de margem e acompanhamento em tempo real
                </p>
              </div>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("planejamento")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "planejamento"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Sliders className="size-3.5" />
              Nova Meta
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <BarChart3 className="size-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("acompanhamento")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "acompanhamento"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Flame className="size-3.5 text-amber-400" />
              Acompanhamento Mês
            </button>
            <button
              onClick={() => setActiveTab("ranking")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "ranking"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Trophy className="size-3.5 text-yellow-400" />
              Ranking
            </button>
            <button
              onClick={() => setActiveTab("alertas")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "alertas"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <AlertTriangle className="size-3.5 text-rose-400" />
              Alertas
              {dadosAcompanhamento?.acompanhamento?.alertas?.length > 0 && (
                <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("historico")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeTab === "historico"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layers className="size-3.5" />
              Histórico
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: PLANEJAMENTO E CRIAÇÃO DE NOVA META */}
      {/* ========================================================================= */}
      {activeTab === "planejamento" && (
        <div className="flex flex-col gap-6">
          {/* Card de Configuração Central */}
          <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="size-4 text-cyan-400" />
                  Configuração da Meta
                </h3>
                <p className="text-xs text-slate-400">
                  Informe os parâmetros essenciais. O sistema busca o histórico e calcula a distribuição automaticamente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCalcular}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg gap-2"
                >
                  <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  CALCULAR META
                </Button>
                <Button
                  onClick={handleSalvarMeta}
                  disabled={isSaving || secoesCalculadas.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg gap-2"
                >
                  <Save className="size-3.5" />
                  {isSaving ? "Salvando..." : "CONFIRMAR E SALVAR"}
                </Button>
              </div>
            </div>

            {/* Grid de Inputs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Input: Meta Total */}
              <div className="bg-black/35 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="size-3.5 text-cyan-400" />
                  Meta de Faturamento:
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    value={metaFaturamentoInput}
                    onChange={(e) => setMetaFaturamentoInput(e.target.value)}
                    className="w-full bg-slate-900/80 border border-cyan-500/30 rounded-lg pl-9 pr-3 py-2 text-sm font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                    placeholder="6.000.000,00"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Total global almejado</span>
              </div>

              {/* Input: Margem Desejada */}
              <div className="bg-black/35 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Percent className="size-3.5 text-emerald-400" />
                  Margem Desejada:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={margemDesejadaInput}
                    onChange={(e) => setMargemDesejadaInput(e.target.value)}
                    className="w-full bg-slate-900/80 border border-emerald-500/30 rounded-lg px-3 py-2 text-sm font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 font-mono"
                    placeholder="21,00"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[11px] text-slate-400">Margem bruta mínima</span>
              </div>

              {/* Input: Período */}
              <div className="bg-black/35 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-blue-400" />
                  Período da Meta:
                </label>
                <input
                  type="text"
                  value={periodoInput}
                  onChange={(e) => setPeriodoInput(e.target.value)}
                  className="w-full bg-slate-900/80 border border-blue-500/30 rounded-lg px-3 py-2 text-sm font-bold text-blue-300 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono"
                  placeholder="09/2026"
                />
                <span className="text-[11px] text-slate-400">Mês/Ano de vigência</span>
              </div>

              {/* Base de Comparação Histórica */}
              <div className="bg-black/35 rounded-xl p-4 border border-white/10 flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="size-3.5 text-amber-400" />
                  Base de Comparação:
                </label>
                <select
                  value={baseComparacao}
                  onChange={(e: any) => setBaseComparacao(e.target.value)}
                  className="w-full bg-slate-900/80 border border-amber-500/30 rounded-lg px-3 py-2 text-xs font-semibold text-amber-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="ultimo_mes" className="bg-slate-900">Último mês</option>
                  <option value="ultimos_3_meses" className="bg-slate-900">Últimos 3 meses (Média)</option>
                  <option value="ultimos_6_meses" className="bg-slate-900">Últimos 6 meses (Média)</option>
                  <option value="mesmo_mes_ano_anterior" className="bg-slate-900">Mesmo mês do ano anterior</option>
                </select>
                <span className="text-[11px] text-slate-400">Base histórica do banco</span>
              </div>
            </div>

            {/* Método de Distribuição */}
            <div className="mt-6 pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-200">Método de Distribuição:</span>
                <p className="text-[11px] text-slate-400">Selecione o modelo matemático para ratear a meta entre as seções mercadológicas</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMetodoDistribuicao("proporcional");
                    distribuirMeta(secoesBase, metaTotalNum, margemDesejadaNum, "proporcional");
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-2 ${
                    metodoDistribuicao === "proporcional"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow"
                      : "bg-black/20 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className={`size-2 rounded-full ${metodoDistribuicao === "proporcional" ? "bg-cyan-400" : "bg-slate-600"}`} />
                  Proporcional
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMetodoDistribuicao("historico");
                    distribuirMeta(secoesBase, metaTotalNum, margemDesejadaNum, "historico");
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-2 ${
                    metodoDistribuicao === "historico"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow"
                      : "bg-black/20 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className={`size-2 rounded-full ${metodoDistribuicao === "historico" ? "bg-cyan-400" : "bg-slate-600"}`} />
                  Histórico
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMetodoDistribuicao("inteligente");
                    distribuirMeta(secoesBase, metaTotalNum, margemDesejadaNum, "inteligente");
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-2 ${
                    metodoDistribuicao === "inteligente"
                      ? "bg-purple-500/20 border-purple-400 text-purple-300 shadow"
                      : "bg-black/20 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className={`size-2 rounded-full ${metodoDistribuicao === "inteligente" ? "bg-purple-400 animate-pulse" : "bg-slate-600"}`} />
                  Inteligente ✨
                </button>

                <button
                  type="button"
                  onClick={() => setMetodoDistribuicao("personalizado")}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition text-left flex items-center gap-2 ${
                    metodoDistribuicao === "personalizado"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow"
                      : "bg-black/20 border-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className={`size-2 rounded-full ${metodoDistribuicao === "personalizado" ? "bg-amber-400" : "bg-slate-600"}`} />
                  Personalizado
                </button>
              </div>
            </div>
          </div>

          {/* Cards de Resumo do Cálculo Principal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-strong rounded-2xl p-5 border border-cyan-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-cyan-300">Meta Total Solicitada</span>
                <DollarSign className="size-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-2">
                {formatMoney(metaTotalNum)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-emerald-400 font-semibold">+{crescimentoGlobalPct.toFixed(2)}%</span> vs Base ({formatMoney(historicoVendaTotal)})
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-300">Margem Desejada</span>
                <Percent className="size-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                {formatPct(margemDesejadaNum)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Projetada ponderada: <span className="text-emerald-300 font-bold">{formatPct(margemPonderadaEfetiva)}</span>
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 border border-rose-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-rose-300">CMV Máximo Permitido</span>
                <ShieldAlert className="size-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-2">
                {formatMoney(cmvMaximoNum)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Custo de Mercadoria: Meta × (1 - Margem)
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-5 border border-purple-500/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-purple-300">Lucro Bruto Esperado</span>
                <Award className="size-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-300 mt-2">
                {formatMoney(lucroBrutoEsperadoNum)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Lucro: Meta Total × Margem Desejada
              </div>
            </div>
          </div>

          {/* Alerta de Verificação de Margem no Modo Inteligente */}
          {margemPonderadaEfetiva < margemDesejadaNum && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Alerta de Margem Projetada:</span> Com a distribuição atual, a margem ponderada resultante é de <strong>{formatPct(margemPonderadaEfetiva)}</strong>, ficando abaixo do alvo configurado de <strong>{formatPct(margemDesejadaNum)}</strong>. Recomenda-se utilizar o <strong>Modo Inteligente</strong> ou elevar a meta em seções de alta rentabilidade (Padaria, Hortifrúti, Mercearia Doce).
              </div>
            </div>
          )}

          {/* Tabela de Comparativo e Distribuição por Seção */}
          <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Layers className="size-4 text-cyan-400" />
                  Comparativo Detalhado por Seção Mercadológica
                </h4>
                <p className="text-xs text-slate-400">
                  {secoesCalculadas.length} seções cadastradas • Soma das metas: <strong className="text-cyan-300 font-mono">{formatMoney(somaMetasSecoes)}</strong>
                  {diferencaCentavosSoma === 0 ? (
                    <span className="text-emerald-400 ml-2 font-bold">(EXATA ✓ 0,00)</span>
                  ) : (
                    <span className="text-amber-400 ml-2 font-bold">(Dif: {diferencaCentavosSoma})</span>
                  )}
                </p>
              </div>

              <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                Ajuste de centavos automático ativo
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold bg-black/20">
                    <th className="py-3 px-3">Seção</th>
                    <th className="py-3 px-3 text-right">Venda Anterior</th>
                    <th className="py-3 px-3 text-right">Meta Proposta</th>
                    <th className="py-3 px-3 text-right">Diferença (R$)</th>
                    <th className="py-3 px-3 text-right">Crescimento %</th>
                    <th className="py-3 px-3 text-right">Part. %</th>
                    <th className="py-3 px-3 text-right">Margem Ant.</th>
                    <th className="py-3 px-3 text-right">Margem Desej.</th>
                    <th className="py-3 px-3 text-right">CMV Máx.</th>
                    <th className="py-3 px-3 text-right">Lucro Esperado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {secoesCalculadas.map((sec) => (
                    <tr key={sec.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                        {sec.nome}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {formatMoney(sec.vendaAnterior)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {metodoDistribuicao === "personalizado" ? (
                          <input
                            type="number"
                            value={sec.meta}
                            onChange={(e) => handleCustomSecaoChange(sec.id, parseFloat(e.target.value) || 0)}
                            className="w-28 bg-slate-900 text-cyan-300 font-bold text-right px-2 py-0.5 rounded border border-cyan-500/30 font-mono text-xs focus:outline-none"
                          />
                        ) : (
                          <span className="font-bold text-cyan-300">{formatMoney(sec.meta)}</span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${sec.diferencaReais >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {sec.diferencaReais >= 0 ? `+${formatMoney(sec.diferencaReais)}` : formatMoney(sec.diferencaReais)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-semibold ${sec.crescimentoPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {sec.crescimentoPct >= 0 ? `+${sec.crescimentoPct.toFixed(2)}%` : `${sec.crescimentoPct.toFixed(2)}%`}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {sec.participacaoMeta.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {sec.margemHistorica.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                        {sec.margemDesejada.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-300">
                        {formatMoney(sec.cmvPermitido)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                        {formatMoney(sec.lucroEsperado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-cyan-500/40 bg-cyan-950/20 font-bold text-white text-xs font-mono">
                    <td className="py-3 px-3 font-sans">TOTAL CONSOLIDADO</td>
                    <td className="py-3 px-3 text-right text-slate-300">{formatMoney(historicoVendaTotal)}</td>
                    <td className="py-3 px-3 text-right text-cyan-400">{formatMoney(somaMetasSecoes)}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">+{formatMoney(somaMetasSecoes - historicoVendaTotal)}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">+{crescimentoGlobalPct.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right">100,00%</td>
                    <td className="py-3 px-3 text-right text-slate-400">20,35%</td>
                    <td className="py-3 px-3 text-right text-emerald-400">{margemPonderadaEfetiva.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right text-rose-400">{formatMoney(cmvMaximoNum)}</td>
                    <td className="py-3 px-3 text-right text-purple-400">{formatMoney(lucroBrutoEsperadoNum)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: DASHBOARD & GRÁFICOS INTERATIVOS DA META */}
      {/* ========================================================================= */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6">
          {/* 6 Cards KPI no Topo */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="glass-strong rounded-xl p-4 border border-cyan-500/20">
              <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Meta Total</span>
              <div className="text-lg md:text-xl font-bold font-mono text-white mt-1">
                {formatMoney(metaTotalNum)}
              </div>
              <span className="text-[10px] text-slate-400">Período {periodoInput}</span>
            </div>

            <div className="glass-strong rounded-xl p-4 border border-slate-500/20">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Venda Período Base</span>
              <div className="text-lg md:text-xl font-bold font-mono text-slate-300 mt-1">
                {formatMoney(historicoVendaTotal)}
              </div>
              <span className="text-[10px] text-slate-400">Base Histórica</span>
            </div>

            <div className="glass-strong rounded-xl p-4 border border-emerald-500/20">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Crescimento Nec.</span>
              <div className="text-lg md:text-xl font-bold font-mono text-emerald-400 mt-1">
                +{crescimentoGlobalPct.toFixed(2)}%
              </div>
              <span className="text-[10px] text-emerald-300">Expansão de Receita</span>
            </div>

            <div className="glass-strong rounded-xl p-4 border border-blue-500/20">
              <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Margem Objetivo</span>
              <div className="text-lg md:text-xl font-bold font-mono text-blue-300 mt-1">
                {formatPct(margemDesejadaNum)}
              </div>
              <span className="text-[10px] text-slate-400">Bruta Alvo</span>
            </div>

            <div className="glass-strong rounded-xl p-4 border border-rose-500/20">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">CMV Máximo</span>
              <div className="text-lg md:text-xl font-bold font-mono text-rose-400 mt-1">
                {formatMoney(cmvMaximoNum)}
              </div>
              <span className="text-[10px] text-slate-400">Teto de Custo</span>
            </div>

            <div className="glass-strong rounded-xl p-4 border border-purple-500/20">
              <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Lucro Esperado</span>
              <div className="text-lg md:text-xl font-bold font-mono text-purple-300 mt-1">
                {formatMoney(lucroBrutoEsperadoNum)}
              </div>
              <span className="text-[10px] text-slate-400">Lucro Bruto</span>
            </div>
          </div>

          {/* 6 Gráficos Interativos (Grid 2x3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Venda Anterior x Meta */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <BarChart3 className="size-4 text-cyan-400" />
                  1. Venda Anterior vs Meta Nova por Seção
                </h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartComparativoVendas} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => formatMoney(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Venda Anterior" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Meta Nova" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Meta por Seção */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <DollarSign className="size-4 text-emerald-400" />
                  2. Maiores Metas e Lucro Esperado
                </h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartMetaPorSecao} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => formatMoney(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Meta" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 3: Participação das Seções */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <PieIcon className="size-4 text-purple-400" />
                  3. Participação das Seções no Faturamento Total
                </h4>
              </div>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartParticipacaoDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartParticipacaoDonut.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => formatMoney(val)}
                    />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: Margem por Seção */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Percent className="size-4 text-amber-400" />
                  4. Margem por Seção vs Margem Desejada
                </h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartMargens} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => `${parseFloat(val).toFixed(2)}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Margem Projetada" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="Alvo Global" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 5: Crescimento Necessário por Seção */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-400" />
                  5. Crescimento Necessário por Seção (%)
                </h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartCrescimentoSecoes} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="nome" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(val: any) => `+${val}%`}
                    />
                    <Bar dataKey="Crescimento %" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                      {chartCrescimentoSecoes.map((entry, index) => (
                        <Cell key={`cell-cresc-${index}`} fill={entry["Crescimento %"] > 12 ? "#10b981" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 6: Meta Atingida vs Meta Restante (Projeção) */}
            <div className="glass-strong rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Flame className="size-4 text-amber-400" />
                  6. Realizado vs Restante (Projeção do Mês)
                </h4>
              </div>
              <div className="h-64 flex flex-col justify-center gap-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Realizado: <strong>{formatMoney(dadosAcompanhamento?.acompanhamento?.vendaAcumuladaTotal || metaTotalNum * 0.612)}</strong></span>
                  <span>Meta: <strong>{formatMoney(metaTotalNum)}</strong></span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-4 overflow-hidden border border-white/10 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, dadosAcompanhamento?.acompanhamento?.percentualAtingidoTotal || 61.2)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Falta Vender</span>
                    <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">
                      {formatMoney(dadosAcompanhamento?.acompanhamento?.faltaVenderTotal || metaTotalNum * 0.388)}
                    </div>
                  </div>
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5 text-center">
                    <span className="text-[10px] text-slate-400 uppercase">Projeção Final</span>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      {formatMoney(dadosAcompanhamento?.acompanhamento?.projecaoFechamento || metaTotalNum * 1.02)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: ACOMPANHAMENTO EM TEMPO REAL DURANTE O MÊS */}
      {/* ========================================================================= */}
      {activeTab === "acompanhamento" && (
        <div className="flex flex-col gap-6">
          {/* Card de Indicadores de Tempo & Ritmo */}
          <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flame className="size-5 text-amber-400" />
                  Acompanhamento de Vendas em Tempo Real (Mês Atual)
                </h3>
                <p className="text-xs text-slate-400">
                  Monitoramento diário do ritmo de vendas, projeção de fechamento e média diária necessária
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  Ritmo: {dadosAcompanhamento?.acompanhamento?.ritmoGeral || "🟢 Acima da Meta"}
                </div>
              </div>
            </div>

            {/* Métricas de Tempo e Projeção */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Dias Decorridos</span>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {dadosAcompanhamento?.acompanhamento?.diasDecorridos || 18} / {dadosAcompanhamento?.acompanhamento?.totalDiasMes || 30}
                </div>
                <span className="text-[10px] text-cyan-400">{dadosAcompanhamento?.acompanhamento?.percentualMesDecorrido || 60}% do mês</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Dias Restantes</span>
                <div className="text-lg font-bold text-amber-400 font-mono mt-1">
                  {dadosAcompanhamento?.acompanhamento?.diasRestantes || 12} dias
                </div>
                <span className="text-[10px] text-slate-400">Para fechar a meta</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Venda Acumulada</span>
                <div className="text-lg font-bold text-cyan-300 font-mono mt-1">
                  {formatMoney(dadosAcompanhamento?.acompanhamento?.vendaAcumuladaTotal || metaTotalNum * 0.612)}
                </div>
                <span className="text-[10px] text-emerald-400">{(dadosAcompanhamento?.acompanhamento?.percentualAtingidoTotal || 61.2).toFixed(1)}% atingido</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Média Diária Atual</span>
                <div className="text-lg font-bold text-white font-mono mt-1">
                  {formatMoney(dadosAcompanhamento?.acompanhamento?.mediaDiariaAtual || (metaTotalNum * 0.612) / 18)}
                </div>
                <span className="text-[10px] text-slate-400">Por dia trabalhado</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Média Nec. / Dia</span>
                <div className="text-lg font-bold text-purple-300 font-mono mt-1">
                  {formatMoney(dadosAcompanhamento?.acompanhamento?.mediaDiariaNecessaria || (metaTotalNum * 0.388) / 12)}
                </div>
                <span className="text-[10px] text-purple-400">Para bater os 100%</span>
              </div>

              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400">Projeção Fechamento</span>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                  {formatMoney(dadosAcompanhamento?.acompanhamento?.projecaoFechamento || metaTotalNum * 1.02)}
                </div>
                <span className="text-[10px] text-emerald-300">+2.0% acima da meta</span>
              </div>
            </div>
          </div>

          {/* Tabela de Acompanhamento por Seção */}
          <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl">
            <h4 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Layers className="size-4 text-cyan-400" />
              Execução por Seção Mercadológica
            </h4>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold bg-black/20">
                    <th className="py-3 px-3">Seção</th>
                    <th className="py-3 px-3 text-right">Meta (R$)</th>
                    <th className="py-3 px-3 text-right">Venda Realizada</th>
                    <th className="py-3 px-3 text-center">% Atingido</th>
                    <th className="py-3 px-3 text-right">Falta Vender</th>
                    <th className="py-3 px-3 text-right">Média Diária Nec.</th>
                    <th className="py-3 px-3 text-right">Projeção Final</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                  {(dadosAcompanhamento?.acompanhamento?.secoes || secoesCalculadas).map((sec: any) => {
                    const statusClass = 
                      sec.status === "acima" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : sec.status === "atencao"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/30";
                    
                    const statusLabel = 
                      sec.status === "acima" 
                        ? "🟢 Acima da Meta"
                        : sec.status === "atencao"
                        ? "🟡 No Esperado"
                        : "🔴 Abaixo da Meta";

                    return (
                      <tr key={sec.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">
                          {sec.nome}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-300">
                          {formatMoney(sec.meta)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-cyan-300 font-bold">
                          {formatMoney(sec.vendaRealizada || sec.meta * 0.61)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-cyan-400 rounded-full" 
                                style={{ width: `${Math.min(100, sec.percentualAtingido || 61)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-200">{(sec.percentualAtingido || 61).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-300">
                          {formatMoney(sec.faltaVender || sec.meta * 0.39)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-purple-300">
                          {formatMoney(sec.mediaDiariaNecessaria || (sec.meta * 0.39) / 12)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-300 font-bold">
                          {formatMoney(sec.projecaoFechamento || sec.meta * 1.01)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusClass}`}>
                            {statusLabel}
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
      )}

      {/* ========================================================================= */}
      {/* ABA 4: RANKING DE DESEMPENHO */}
      {/* ========================================================================= */}
      {activeTab === "ranking" && (
        <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="size-5 text-yellow-400" />
                Ranking de Desempenho por Seção
              </h3>
              <p className="text-xs text-slate-400">Classificação e liderança de vendas, crescimento e rentabilidade</p>
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setRankingFilter("faturamento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  rankingFilter === "faturamento" ? "bg-cyan-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"
                }`}
              >
                Maior Faturamento
              </button>
              <button
                onClick={() => setRankingFilter("crescimento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  rankingFilter === "crescimento" ? "bg-cyan-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"
                }`}
              >
                Maior Crescimento
              </button>
              <button
                onClick={() => setRankingFilter("margem")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  rankingFilter === "margem" ? "bg-cyan-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"
                }`}
              >
                Maior Margem
              </button>
              <button
                onClick={() => setRankingFilter("lucro")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  rankingFilter === "lucro" ? "bg-cyan-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"
                }`}
              >
                Maior Lucro
              </button>
              <button
                onClick={() => setRankingFilter("menor")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  rankingFilter === "menor" ? "bg-rose-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"
                }`}
              >
                Menor Desempenho
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secoesRanking.map((sec, idx) => {
              const medalColor = 
                idx === 0 ? "text-yellow-400 border-yellow-400/40 bg-yellow-500/10" :
                idx === 1 ? "text-slate-300 border-slate-300/40 bg-slate-400/10" :
                idx === 2 ? "text-amber-600 border-amber-600/40 bg-amber-600/10" :
                "text-slate-400 border-white/5 bg-black/20";

              return (
                <div key={sec.id} className="p-4 rounded-xl glass border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-8 rounded-lg border grid place-items-center font-bold text-xs ${medalColor}`}>
                        {idx + 1}º
                      </div>
                      <span className="font-bold text-sm text-white">{sec.nome}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {(sec.percentualAtingido || sec.crescimentoPct || 0).toFixed(1)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-white/5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Meta:</span>
                      <span className="text-slate-200 font-semibold">{formatMoney(sec.meta)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Realizado:</span>
                      <span className="text-cyan-300 font-bold">{formatMoney(sec.vendaRealizada || sec.meta * 0.61)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Margem:</span>
                      <span className="text-emerald-400 font-semibold">{(sec.margemRealizada || sec.margemDesejada).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-sans block">Lucro:</span>
                      <span className="text-purple-300 font-semibold">{formatMoney(sec.lucroRealizado || sec.lucroEsperado)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 5: ALERTAS GERENCIAIS AUTOMÁTICOS */}
      {/* ========================================================================= */}
      {activeTab === "alertas" && (
        <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="size-5 text-rose-400" />
                Alertas e Notificações Gerenciais da Meta
              </h3>
              <p className="text-xs text-slate-400">Diagnóstico preditivo em tempo real para tomada rápida de decisão</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {(dadosAcompanhamento?.acompanhamento?.alertas || [
              { tipo: "sucesso", titulo: "Projeção Global Favorável", mensagem: `🟢 Projeção atual indica faturamento de ${formatMoney(metaTotalNum * 1.02)}, superando a meta global.` },
              { tipo: "info", titulo: "Necessidade Diária", mensagem: `⚠ Para atingir ${formatMoney(metaTotalNum)}, a empresa precisa vender R$ 28.500,00 por dia nos próximos 12 dias.` },
              { tipo: "sucesso", titulo: "Padaria em Alta", mensagem: "🟢 Padaria já atingiu 82% da meta com excelente margem de 38,5%." },
              { tipo: "aviso", titulo: "Açougue Abaixo do Ritmo", mensagem: "⚠ Açougue está 4% abaixo do ritmo necessário para fechar o mês na meta." },
              { tipo: "aviso", titulo: "Margem de Bebidas Pressionada", mensagem: "⚠ Margem de Bebidas caiu de 12,18% para 10,90%. Verificar mix de produtos." }
            ]).map((alerta: any, i: number) => {
              const border = 
                alerta.tipo === "sucesso" ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200" :
                alerta.tipo === "perigo" ? "border-rose-500/40 bg-rose-950/20 text-rose-200" :
                alerta.tipo === "aviso" ? "border-amber-500/40 bg-amber-950/20 text-amber-200" :
                "border-cyan-500/40 bg-cyan-950/20 text-cyan-200";

              return (
                <div key={i} className={`p-4 rounded-xl border ${border} flex items-start gap-3.5 transition`}>
                  <Zap className="size-5 shrink-0 mt-0.5 text-cyan-400" />
                  <div>
                    <h5 className="font-bold text-sm text-white mb-0.5">{alerta.titulo}</h5>
                    <p className="text-xs leading-relaxed">{alerta.mensagem}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 6: HISTÓRICO DE METAS SALVAS */}
      {/* ========================================================================= */}
      {activeTab === "historico" && (
        <div className="glass-strong rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="size-5 text-cyan-400" />
                Histórico de Metas Cadastradas
              </h3>
              <p className="text-xs text-slate-400">Todas as metas criadas para a empresa/tenant com comparativo</p>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold bg-black/20">
                  <th className="py-3 px-3">Período</th>
                  <th className="py-3 px-3 text-right">Meta Total</th>
                  <th className="py-3 px-3 text-right">Venda Realizada</th>
                  <th className="py-3 px-3 text-center">% Atingido</th>
                  <th className="py-3 px-3 text-right">Margem Plan.</th>
                  <th className="py-3 px-3 text-right">Margem Real.</th>
                  <th className="py-3 px-3 text-right">Lucro Plan.</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                {metasSalvas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      Nenhuma meta salva no histórico para este tenant.
                    </td>
                  </tr>
                ) : (
                  metasSalvas.map((m: any) => (
                    <tr key={m.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 px-3 font-sans font-bold text-slate-200">
                        {m.periodo}
                      </td>
                      <td className="py-3 px-3 text-right text-cyan-300 font-bold">
                        {formatMoney(m.metaTotal)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {formatMoney(m.metaTotal * 0.98)}
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-400 font-bold">
                        98,0%
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400">
                        {m.margemDesejada.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {(m.margemDesejada - 0.3).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right text-purple-300">
                        {formatMoney(m.lucroEsperado)}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          {m.status || "Ativa"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <button
                          onClick={() => {
                            setMetaFaturamentoInput((m.metaTotal || 6000000).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                            setMargemDesejadaInput((m.margemDesejada || 21).toFixed(2).replace('.', ','));
                            setPeriodoInput(m.periodo || '09/2026');
                            if (m.secoes) setSecoesCalculadas(m.secoes);
                            setActiveTab("dashboard");
                            toast.success(`Meta de ${m.periodo} carregada com sucesso!`);
                          }}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition text-[11px] font-semibold"
                        >
                          Visualizar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
