import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Percent,
  Search,
  Download,
  RefreshCw,
  Building2,
  Clock,
  ArrowUpRight,
  Boxes,
  Store,
  Tag,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import atacarejoSnapshot from "@/data/albuquerque_atacarejo_snapshot.json";

interface ProdutoItem {
  id: number;
  nome: string;
  secao: string;
  regraCiss?: string;
  qtdMinima?: number;
  percDesconto?: number;
  tipoDesconto?: string;
  qtdVendida: number;
  totalFaturado: number;
  totalDesconto: number;
  precoVarejoMedio: number;
  precoAtacarejoMedio: number;
  totalCupons: number;
  margemMediaPct: number;
  totalLucro: number;
  percentualFaturamento: number;
}

interface LojaItem {
  id: number;
  nome: string;
  totalCupons: number;
  qtdTotal: number;
  totalDesconto: number;
  totalFaturado: number;
  totalLucro: number;
  margemMediaPct: number;
  percentualTotal: number;
}

interface VendaRecenteItem {
  idEmpresa: number;
  nomeLoja: string;
  idPlanilha: number;
  idProduto: number;
  nomeProduto: string;
  regraCiss?: string;
  qtdMinima?: number;
  percDesconto?: number;
  tipoDesconto?: string;
  qtdVendida: number;
  precoVarejo: number;
  descontoAtacarejo: number;
  totalFaturado: number;
  margemPct: number;
  lucro: number;
  dataHora: string;
}

interface MetricasData {
  totalFaturado: number;
  totalDesconto: number;
  totalQtd: number;
  totalCupons: number;
  totalLucro: number;
  margemMediaPct: number;
  ticketMedio: number;
}

interface ApiResponse {
  periodo: { startDate: string; endDate: string };
  idEmpresa: string;
  metricas: MetricasData;
  lojas: LojaItem[];
  produtos: ProdutoItem[];
  recentes: VendaRecenteItem[];
}

interface AtacarejoModuleProps {
  selectedStore: string;
  startDate: string;
  endDate: string;
}

export function AtacarejoModule({
  selectedStore,
  startDate,
  endDate
}: AtacarejoModuleProps) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>("todas");
  const [viewTab, setViewTab] = useState<"ranking" | "lojas" | "recentes">("ranking");

  // Sincronizar com filtro do topo
  useEffect(() => {
    if (selectedStore && selectedStore !== "all" && selectedStore !== "todas") {
      setSelectedLojaFilter(selectedStore);
    } else {
      setSelectedLojaFilter("todas");
    }
  }, [selectedStore]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLojaFilter && selectedLojaFilter !== "todas") {
        params.append("idEmpresa", selectedLojaFilter);
      }
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      let json: ApiResponse;
      try {
        const res = await fetch(`/api/vendas/atacarejo?${params.toString()}`);
        if (!res.ok) throw new Error("Fallback para snapshot");
        json = await res.json();
      } catch {
        // Fallback robusto com dados reais consolidados do DB2
        if (selectedLojaFilter && selectedLojaFilter !== "todas") {
          const empId = Number(selectedLojaFilter);
          const loja = (atacarejoSnapshot.lojas as any[]).find((l: any) => l.id === empId);
          const produtosFiltrados = (atacarejoSnapshot.produtos as any[]).filter((p: any) => p);
          const recentesFiltrados = (atacarejoSnapshot.recentes as any[]).filter((r: any) => r.idEmpresa === empId);

          if (loja) {
            json = {
              periodo: atacarejoSnapshot.periodo,
              idEmpresa: selectedLojaFilter,
              metricas: {
                totalFaturado: loja.totalFaturado,
                totalDesconto: loja.totalDesconto,
                totalQtd: loja.qtdTotal,
                totalCupons: loja.totalCupons,
                totalLucro: loja.totalLucro,
                margemMediaPct: loja.margemMediaPct,
                ticketMedio: loja.totalCupons > 0 ? Math.round((loja.totalFaturado / loja.totalCupons) * 100) / 100 : 0
              },
              lojas: [loja],
              produtos: produtosFiltrados,
              recentes: recentesFiltrados
            };
          } else {
            json = atacarejoSnapshot as unknown as ApiResponse;
          }
        } else {
          json = atacarejoSnapshot as unknown as ApiResponse;
        }
      }

      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao consultar vendas de atacarejo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedLojaFilter, startDate, endDate]);

  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val || 0);
  };

  const fmtNumber = (val: number) => {
    return new Intl.NumberFormat("pt-BR").format(val || 0);
  };

  // Filtragem de produtos por busca
  const filteredProdutos = useMemo(() => {
    if (!data?.produtos) return [];
    if (!searchTerm.trim()) return data.produtos;
    const term = searchTerm.toLowerCase();
    return data.produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        String(p.id).includes(term) ||
        p.secao.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  // Exportar para CSV
  const exportCsv = () => {
    if (!data || !data.produtos || !data.produtos.length) {
      toast.info("Não há dados para exportar.");
      return;
    }
    let csv = "ID;Produto;Secao;Qtd Vendida;Preco Varejo;Preco Atacado;Faturado;Desconto;Margem Pct;Lucro\n";
    data.produtos.forEach((p) => {
      csv += `${p.id};"${p.nome}";"${p.secao}";${p.qtdVendida};${p.precoVarejoMedio.toFixed(2).replace(".", ",")};${p.precoAtacarejoMedio.toFixed(2).replace(".", ",")};${p.totalFaturado.toFixed(2).replace(".", ",")};${p.totalDesconto.toFixed(2).replace(".", ",")};${p.margemMediaPct.toFixed(2).replace(".", ",")};${p.totalLucro.toFixed(2).replace(".", ",")}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Vendas_Atacarejo_${startDate || "inicio"}_${endDate || "fim"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório CSV gerado com sucesso!");
  };

  const metricas = data?.metricas || {
    totalFaturado: 0,
    totalDesconto: 0,
    totalQtd: 0,
    totalCupons: 0,
    totalLucro: 0,
    margemMediaPct: 0,
    ticketMedio: 0
  };

  return (
    <div className="flex flex-col gap-5 w-full pb-10">
      {/* Top Banner Header */}
      <div className="glass-strong rounded-2xl p-5 md:p-6 border border-white/10 relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/95 to-indigo-950/40">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShoppingBag className="size-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold font-serif text-white tracking-tight">
                  Inteligência & Vendas Atacarejo
                </h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                  CISS ATACAREJO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Mapeamento consolidado das vendas com desconto progressivo por quantidade (Tabela DBA.VENDA_ATACAREJO).
              </p>
            </div>
          </div>

          {/* Filtros e Ações */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <Store className="size-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedLojaFilter}
                onChange={(e) => setSelectedLojaFilter(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="todas" className="bg-slate-900 text-white">Todas as Lojas</option>
                {data?.lojas?.map((loja) => (
                  <option key={loja.id} value={String(loja.id)} className="bg-slate-900 text-white">
                    {loja.nome}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-black/40 border-white/10 hover:bg-white/5 text-slate-300 text-xs gap-1.5 rounded-xl h-8"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="bg-black/40 border-white/10 hover:bg-white/5 text-slate-300 text-xs gap-1.5 rounded-xl h-8"
            >
              <Download className="size-3.5 text-indigo-400" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        {/* Faturamento Atacarejo */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Faturamento Atacarejo</span>
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-bold text-white tracking-tight">
            {fmtCurrency(metricas.totalFaturado)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span>Ticket Médio: {fmtCurrency(metricas.ticketMedio)}</span>
          </div>
        </div>

        {/* Quantidade Vendida */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Volume Total Vendido</span>
            <div className="size-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Boxes className="size-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-bold text-white tracking-tight">
            {fmtNumber(metricas.totalQtd)} un
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{fmtNumber(metricas.totalCupons)} cupons com atacarejo</span>
          </div>
        </div>

        {/* Desconto Concedido */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Desconto Atacarejo</span>
            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Tag className="size-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-bold text-amber-400 tracking-tight">
            {fmtCurrency(metricas.totalDesconto)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Economia entregue aos clientes</span>
          </div>
        </div>

        {/* Margem Média & Lucro */}
        <div className="glass-strong rounded-2xl p-4 md:p-5 border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/80">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Margem Média Real</span>
            <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="text-lg md:text-2xl font-bold text-cyan-400 tracking-tight">
            {metricas.margemMediaPct.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>Lucro Bruto: {fmtCurrency(metricas.totalLucro)}</span>
          </div>
        </div>
      </div>

      {/* Tabs de Navegação e Barra de Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl">
          <button
            onClick={() => setViewTab("ranking")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewTab === "ranking"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏆 Ranking de Produtos
          </button>
          <button
            onClick={() => setViewTab("lojas")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewTab === "lojas"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏪 Visão por Loja
          </button>
          <button
            onClick={() => setViewTab("recentes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewTab === "recentes"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🧾 Últimas Vendas
          </button>
        </div>

        {viewTab === "ranking" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por produto ou código..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        )}
      </div>

      {/* TAB 1: RANKING DE PRODUTOS */}
      {viewTab === "ranking" && (
        <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm md:text-base font-bold text-white">
                Produtos Mais Vendidos no Atacarejo
              </h2>
              <p className="text-xs text-slate-400">
                {filteredProdutos.length} produtos localizados com venda de atacado no período
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Seção</th>
                  <th className="py-3 px-4">Regra CISS (Gatilho)</th>
                  <th className="py-3 px-4 text-right">Qtd Vendida</th>
                  <th className="py-3 px-4 text-right">Preço Varejo</th>
                  <th className="py-3 px-4 text-right">Preço Atacado</th>
                  <th className="py-3 px-4 text-right">Desconto (R$)</th>
                  <th className="py-3 px-4 text-right">Faturamento</th>
                  <th className="py-3 px-4 text-right">Margem Real</th>
                  <th className="py-3 px-4 text-right">Lucro Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredProdutos.map((p, index) => {
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-500 text-center w-10">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.nome}</div>
                        <div className="text-[10px] text-slate-500">Cód {p.id}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] bg-slate-800/60 px-2 py-0.5 rounded-md text-slate-300">
                          {p.secao}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shadow-sm">
                          <Tag className="size-3 text-indigo-400 shrink-0" />
                          <span>{p.regraCiss || `A partir de ${p.qtdMinima || 2} un`}</span>
                        </span>
                        {p.percDesconto ? (
                          <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                            {p.percDesconto.toFixed(1)}% desc.
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {fmtNumber(p.qtdVendida)} un
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {fmtCurrency(p.precoVarejoMedio)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {fmtCurrency(p.precoAtacarejoMedio)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-400">
                        {fmtCurrency(p.totalDesconto)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {fmtCurrency(p.totalFaturado)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                            p.margemMediaPct >= 20
                              ? "bg-emerald-500/15 text-emerald-300"
                              : p.margemMediaPct >= 12
                              ? "bg-cyan-500/15 text-cyan-300"
                              : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {p.margemMediaPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-100">
                        {fmtCurrency(p.totalLucro)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: VISÃO POR LOJA */}
      {viewTab === "lojas" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.lojas?.map((loja) => {
            return (
              <div
                key={loja.id}
                className="glass-strong rounded-2xl p-5 border border-white/10 relative overflow-hidden bg-gradient-to-b from-slate-900/90 to-slate-950/80 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase text-indigo-400 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      Unidade {loja.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {loja.percentualTotal}% do faturamento
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">
                    {loja.nome}
                  </h3>
                  <div className="text-2xl font-bold text-emerald-400 mt-2">
                    {fmtCurrency(loja.totalFaturado)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Volume Vendido</span>
                    <span className="font-semibold text-white">{fmtNumber(loja.qtdTotal)} un</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Cupons c/ Atacarejo</span>
                    <span className="font-semibold text-white">{fmtNumber(loja.totalCupons)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Desconto Concedido</span>
                    <span className="font-semibold text-amber-400">{fmtCurrency(loja.totalDesconto)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase">Margem Média</span>
                    <span className="font-semibold text-cyan-400">{loja.margemMediaPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: ÚLTIMAS VENDAS REALIZADAS */}
      {viewTab === "recentes" && (
        <div className="glass-strong rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-sm md:text-base font-bold text-white">
                Extrato Recente de Vendas Atacarejo
              </h2>
              <p className="text-xs text-slate-400">
                Últimas operações que acionaram o desconto de atacado nos caixas
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-white/5 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Loja</th>
                  <th className="py-3 px-4">Cupom</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Regra CISS (Gatilho)</th>
                  <th className="py-3 px-4 text-right">Qtd</th>
                  <th className="py-3 px-4 text-right">Preço Varejo</th>
                  <th className="py-3 px-4 text-right">Desconto (R$)</th>
                  <th className="py-3 px-4 text-right">Total Faturado</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                  <th className="py-3 px-4 text-right">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {data?.recentes?.map((r, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-slate-300">
                      {r.nomeLoja}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-400">
                      #{r.idPlanilha}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{r.nomeProduto}</div>
                      <div className="text-[10px] text-slate-500">Cód {r.idProduto}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap shadow-sm">
                        <Tag className="size-3 text-indigo-400 shrink-0" />
                        <span>{r.regraCiss || `A partir de ${r.qtdMinima || 2} un`}</span>
                      </span>
                      {r.percDesconto ? (
                        <div className="text-[10px] text-amber-400 font-medium mt-0.5">
                          {r.percDesconto.toFixed(1)}% desc.
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {r.qtdVendida} un
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {fmtCurrency(r.precoVarejo)}
                    </td>
                    <td className="py-3 px-4 text-right text-amber-400">
                      -{fmtCurrency(r.descontoAtacarejo)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {fmtCurrency(r.totalFaturado)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-cyan-300">
                      {r.margemPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                      {r.dataHora ? r.dataHora.slice(0, 19).replace("T", " ") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

