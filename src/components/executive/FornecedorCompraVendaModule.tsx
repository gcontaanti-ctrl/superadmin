import React, { useState, useEffect, Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search, Printer, FileSpreadsheet, Loader2, Plus, X, Building2, Calendar, TrendingUp, ShoppingCart, DollarSign, Percent,
  ChevronRight, ChevronDown, Layers, Package
} from "lucide-react";
import { toast } from "sonner";

interface FornecedorOption {
  id: number;
  nome: string;
  cnpj?: string;
}

interface LinhaMetrica {
  fornId: number;
  fornNome: string;
  idEmpresa: number;
  lojaNome: string;
  ano?: number;
  mes?: number;
  mesLabel?: string;
  compra: number;
  venda: number;
  cmv: number;
  cmvPct: number;
  lucro: number;
  margemPct: number;
  markupCmvPct: number;
}

interface SecaoMetrica {
  idSecao: number;
  secao: string;
  compra: number;
  venda: number;
  cmv: number;
  cmvPct: number;
  lucro: number;
  margemPct: number;
}

interface ProdutoMetrica {
  codigo: number;
  descricao: string;
  unidade?: string;
  qtdVenda: number;
  compra: number;
  venda: number;
  cmv: number;
  cmvPct: number;
  lucro: number;
  margemPct: number;
}

interface RelatorioResponse {
  fornecedores: { id: number; nome: string }[];
  startDate: string;
  endDate: string;
  totaisGeral: {
    compra: number;
    venda: number;
    cmv: number;
    cmvPct: number;
    lucro: number;
    margemPct: number;
    markupCmvPct: number;
  };
  resumoPorLoja: LinhaMetrica[];
  mensal: LinhaMetrica[];
}

interface Props {
  selectedStore?: string;
  startDate?: string;
  endDate?: string;
  lojas?: any[];
}

export function FornecedorCompraVendaModule({
  selectedStore: propStore = "todas",
  startDate: propStartDate,
  endDate: propEndDate,
  lojas = []
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const [startDate, setStartDate] = useState(propStartDate || yearStart);
  const [endDate, setEndDate] = useState(propEndDate || today);
  const [idEmpresa, setIdEmpresa] = useState(propStore || "todas");

  const [searchTerm, setSearchTerm] = useState("");
  const [sugestoes, setSugestoes] = useState<FornecedorOption[]>([]);
  const [searchingForn, setSearchingForn] = useState(false);
  const [selecionados, setSelecionados] = useState<FornecedorOption[]>([]);

  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<RelatorioResponse | null>(null);
  const [viewMode, setViewMode] = useState<"resumo" | "mensal">("resumo");

  // Nível 2 (Seções por Loja) e Nível 3 (Produtos por Seção)
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [secoesCache, setSecoesCache] = useState<Record<string, SecaoMetrica[]>>({});
  const [loadingSecoes, setLoadingSecoes] = useState<Record<string, boolean>>({});

  const [expandedSecoes, setExpandedSecoes] = useState<Record<string, boolean>>({});
  const [produtosCache, setProdutosCache] = useState<Record<string, ProdutoMetrica[]>>({});
  const [loadingProdutos, setLoadingProdutos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearchingForn(true);
      try {
        const res = await fetch(`/api/fornecedores/busca?q=${encodeURIComponent(searchTerm.trim())}`);
        if (res.ok) {
          const list = await res.json();
          setSugestoes(Array.isArray(list) ? list : []);
        }
      } catch {
        setSugestoes([]);
      } finally {
        setSearchingForn(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const adicionarFornecedor = (f: FornecedorOption) => {
    if (!selecionados.some(s => s.id === f.id)) {
      setSelecionados(prev => [...prev, f]);
    }
    setSearchTerm("");
  };

  const removerFornecedor = (id: number) => {
    setSelecionados(prev => prev.filter(s => s.id !== id));
  };

  const gerarRelatorio = async () => {
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos 1 fornecedor / marca para consultar.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Informe a data inicial e a data final.");
      return;
    }
    setLoading(true);
    try {
      const ids = selecionados.map(s => s.id).join(",");
      const res = await fetch(
        `/api/relatorios/fornecedor-compra-venda?fornecedores=${ids}&startDate=${startDate}&endDate=${endDate}&idEmpresa=${idEmpresa}`
      );
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao consultar DB2");
      setDados(json);
      setExpandedRows({});
      setSecoesCache({});
      setExpandedSecoes({});
      setProdutosCache({});
      toast.success("Relatório carregado direto do DB2!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao buscar dados no DB2.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRowSecoes = async (r: LinhaMetrica) => {
    const rowKey = viewMode === "mensal" ? `${r.fornId}|${r.ano}|${r.mes}|${r.idEmpresa}` : `${r.fornId}|${r.idEmpresa}`;
    const nextOpen = !expandedRows[rowKey];
    setExpandedRows(prev => ({ ...prev, [rowKey]: nextOpen }));
    if (!nextOpen || secoesCache[rowKey]) return;

    setLoadingSecoes(prev => ({ ...prev, [rowKey]: true }));
    try {
      const qs = new URLSearchParams({
        fornecedor: String(r.fornId),
        idEmpresa: String(r.idEmpresa),
        startDate,
        endDate
      });
      if (viewMode === "mensal" && r.ano && r.mes) {
        qs.set("ano", String(r.ano));
        qs.set("mes", String(r.mes));
      }
      const res = await fetch(`/api/relatorios/fornecedor-compra-venda/secoes?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao carregar seções");
      setSecoesCache(prev => ({ ...prev, [rowKey]: json.secoes || [] }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir seções");
    } finally {
      setLoadingSecoes(prev => ({ ...prev, [rowKey]: false }));
    }
  };

  const toggleSecaoProdutos = async (r: LinhaMetrica, sec: SecaoMetrica) => {
    const rowKey = viewMode === "mensal" ? `${r.fornId}|${r.ano}|${r.mes}|${r.idEmpresa}` : `${r.fornId}|${r.idEmpresa}`;
    const secKey = `${rowKey}|sec-${sec.idSecao}`;
    const nextOpen = !expandedSecoes[secKey];
    setExpandedSecoes(prev => ({ ...prev, [secKey]: nextOpen }));
    if (!nextOpen || produtosCache[secKey]) return;

    setLoadingProdutos(prev => ({ ...prev, [secKey]: true }));
    try {
      const qs = new URLSearchParams({
        fornecedor: String(r.fornId),
        idEmpresa: String(r.idEmpresa),
        idSecao: String(sec.idSecao),
        startDate,
        endDate
      });
      if (viewMode === "mensal" && r.ano && r.mes) {
        qs.set("ano", String(r.ano));
        qs.set("mes", String(r.mes));
      }
      const res = await fetch(`/api/relatorios/fornecedor-compra-venda/produtos?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao carregar produtos");
      setProdutosCache(prev => ({ ...prev, [secKey]: json.produtos || [] }));
    } catch (err: any) {
      toast.error(err.message || "Erro ao abrir produtos");
    } finally {
      setLoadingProdutos(prev => ({ ...prev, [secKey]: false }));
    }
  };

  const fmtBRL = (v: number) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const exportarCSV = () => {
    if (!dados) return;
    const rows = viewMode === "resumo" ? dados.resumoPorLoja : dados.mensal;
    const header = viewMode === "resumo"
      ? "FORNECEDOR;LOJA;COMPRA_R$;VENDA_R$;CMV_R$;CMV_PCT;LUCRO_R$;MARGEM_VENDA_PCT"
      : "FORNECEDOR;MES;LOJA;COMPRA_R$;VENDA_R$;CMV_R$;CMV_PCT;LUCRO_R$;MARGEM_VENDA_PCT";

    const lines = rows.map(r => {
      const base = viewMode === "resumo" ? `${r.fornNome};${r.lojaNome}` : `${r.fornNome};${r.mesLabel};${r.lojaNome}`;
      return `${base};${r.compra.toFixed(2).replace(".", ",")};${r.venda.toFixed(2).replace(".", ",")};${r.cmv.toFixed(2).replace(".", ",")};${r.cmvPct.toFixed(2).replace(".", ",")}%;${r.lucro.toFixed(2).replace(".", ",")};${r.margemPct.toFixed(2).replace(".", ",")}%`;
    });

    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Compra_Venda_Fornecedor_${startDate}_a_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const imprimirRelatorio = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fornecedor-print-area, #fornecedor-print-area * { visibility: visible; }
          #fornecedor-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #ffffff !important; color: #0f172a !important; padding: 12px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Filtros (não aparece na impressão) */}
      <Card className="glass-strong border-white/10 rounded-2xl no-print">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart className="size-5 text-cyan-400" />
                Compra × Venda × CMV e Lucro por Fornecedor / Marca
              </h2>
              <p className="text-xs text-slate-400">
                Selecione um ou mais fornecedores, informe o período e gere ou imprima direto do DB2.
              </p>
            </div>
            {dados && (
              <div className="flex items-center gap-2">
                <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <FileSpreadsheet className="size-3.5 text-emerald-400" />
                  Exportar Excel (CSV)
                </Button>
                <Button onClick={imprimirRelatorio} size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 !text-white">
                  <Printer className="size-3.5" />
                  Imprimir Relatório
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
            {/* Busca de Fornecedor */}
            <div className="lg:col-span-5 relative">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                Buscar Fornecedor / Marca (Código ou Nome)
              </label>
              <div className="relative">
                <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ex: 10014, NESTLE, 10839, TRES CORACOES..."
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                {searchingForn && <Loader2 className="size-3.5 animate-spin text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2" />}
              </div>
              {searchTerm.trim().length > 0 && sugestoes.length > 0 && (
                <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl bg-slate-900 border border-white/15 shadow-2xl divide-y divide-white/5">
                  {sugestoes.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => adicionarFornecedor(f)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-cyan-500/15 flex items-center justify-between gap-2 text-slate-200 cursor-pointer"
                    >
                      <span className="truncate font-medium">
                        <strong className="text-cyan-400">{f.id}</strong> — {f.nome}
                      </span>
                      <Plus className="size-3.5 text-cyan-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Data Inicial */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                <Calendar className="size-3" /> Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white"
              />
            </div>

            {/* Data Final */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                <Calendar className="size-3" /> Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white"
              />
            </div>

            {/* Loja */}
            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                <Building2 className="size-3" /> Loja
              </label>
              <select
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(e.target.value)}
                className="w-full h-9 px-2.5 rounded-xl bg-black/30 border border-white/15 text-xs text-white"
              >
                <option value="todas">Todas as Lojas</option>
                {lojas.map((l: any) => (
                  <option key={l.IDEMPRESA} value={String(l.IDEMPRESA)}>
                    {l.IDEMPRESA} - {l.NOMEFANTASIA}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Buscar */}
            <div className="lg:col-span-1">
              <Button
                onClick={gerarRelatorio}
                disabled={loading}
                className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 !text-white font-semibold text-xs"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Gerar"}
              </Button>
            </div>
          </div>

          {/* Fornecedores Selecionados */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-medium">Selecionados:</span>
            {selecionados.length === 0 ? (
              <span className="text-[11px] text-slate-500 italic">
                Nenhum fornecedor adicionado ainda — digite o código ou nome acima para adicionar.
              </span>
            ) : (
              selecionados.map(f => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-xs text-cyan-300 font-medium"
                >
                  <span>{f.id} - {f.nome}</span>
                  <button
                    type="button"
                    onClick={() => removerFornecedor(f.id)}
                    className="hover:text-rose-400 cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Área Imprimível do Relatório */}
      {dados && (
        <div id="fornecedor-print-area" className="space-y-4">
          {/* Cabeçalho visível na impressão */}
          <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
            <h1 className="text-lg font-bold text-slate-900">
              RELATÓRIO COMPRA × VENDA × CMV × LUCRO POR FORNECEDOR
            </h1>
            <p className="text-xs text-slate-600">
              Fornecedores: {dados.fornecedores.map(f => `${f.id} - ${f.nome}`).join(" | ")} • Período: {dados.startDate} até {dados.endDate}
            </p>
          </div>

          {/* KPIs Totais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3.5">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <ShoppingCart className="size-3.5 text-blue-400" /> Total Compra
                </div>
                <div className="text-lg font-bold text-white mt-1">{fmtBRL(dados.totaisGeral.compra)}</div>
              </CardContent>
            </Card>
            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3.5">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <DollarSign className="size-3.5 text-cyan-400" /> Total Venda
                </div>
                <div className="text-lg font-bold text-white mt-1">{fmtBRL(dados.totaisGeral.venda)}</div>
              </CardContent>
            </Card>
            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3.5">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Percent className="size-3.5 text-amber-400" /> CMV (% s/ Venda)
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {fmtBRL(dados.totaisGeral.cmv)} <span className="text-xs text-amber-400">({dados.totaisGeral.cmvPct.toFixed(2)}%)</span>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3.5">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <TrendingUp className="size-3.5 text-emerald-400" /> Lucro (Margem %)
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  {fmtBRL(dados.totaisGeral.lucro)} <span className="text-xs">({dados.totaisGeral.margemPct.toFixed(2)}%)</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alternador Resumo por Loja vs Detalhe Mês a Mês */}
          <div className="flex items-center gap-2 no-print">
            <Button
              size="sm"
              variant={viewMode === "resumo" ? "default" : "outline"}
              onClick={() => setViewMode("resumo")}
              className="text-xs rounded-xl"
            >
              Consolidado por Fornecedor e Loja
            </Button>
            <Button
              size="sm"
              variant={viewMode === "mensal" ? "default" : "outline"}
              onClick={() => setViewMode("mensal")}
              className="text-xs rounded-xl"
            >
              Detalhamento Mês a Mês por Loja ({dados.mensal.length})
            </Button>
          </div>

          {/* Tabela */}
          <Card className="glass border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-slate-300">
                    <th className="py-2.5 px-3">Fornecedor</th>
                    {viewMode === "mensal" && <th className="py-2.5 px-3">Mês</th>}
                    <th className="py-2.5 px-3">Loja</th>
                    <th className="py-2.5 px-3 text-right">Compra</th>
                    <th className="py-2.5 px-3 text-right">Venda</th>
                    <th className="py-2.5 px-3 text-right">CMV (R$)</th>
                    <th className="py-2.5 px-3 text-right">% CMV</th>
                    <th className="py-2.5 px-3 text-right">Lucro (R$)</th>
                    <th className="py-2.5 px-3 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(viewMode === "resumo" ? dados.resumoPorLoja : dados.mensal).map((r, i) => {
                    const rowKey = viewMode === "mensal" ? `${r.fornId}|${r.ano}|${r.mes}|${r.idEmpresa}` : `${r.fornId}|${r.idEmpresa}`;
                    const isOpen = !!expandedRows[rowKey];
                    const secoes = secoesCache[rowKey] || [];
                    const isLoadingSec = !!loadingSecoes[rowKey];
                    const colSpan = viewMode === "mensal" ? 9 : 8;

                    return (
                      <Fragment key={rowKey + "-" + i}>
                        <tr
                          onClick={() => toggleRowSecoes(r)}
                          className={`cursor-pointer transition-colors ${isOpen ? "bg-cyan-500/10" : "hover:bg-white/5"}`}
                          title="Clique para abrir as Seções"
                        >
                          <td className="py-2.5 px-3 font-medium text-slate-200 flex items-center gap-1.5">
                            {isOpen ? <ChevronDown className="size-4 text-cyan-400 shrink-0" /> : <ChevronRight className="size-4 text-slate-400 shrink-0" />}
                            <span>{r.fornNome}</span>
                          </td>
                          {viewMode === "mensal" && <td className="py-2.5 px-3 text-cyan-300 font-semibold">{r.mesLabel}</td>}
                          <td className="py-2.5 px-3 text-slate-300">{r.idEmpresa} - {r.lojaNome}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{fmtBRL(r.compra)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">{fmtBRL(r.venda)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">{fmtBRL(r.cmv)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-400">{r.cmvPct.toFixed(2)}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400">{fmtBRL(r.lucro)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">{r.margemPct.toFixed(2)}%</td>
                        </tr>

                        {/* NÍVEL 2: SEÇÕES */}
                        {isOpen && (
                          <tr className="bg-slate-950/45">
                            <td colSpan={colSpan} className="p-0">
                              <div className="pl-6 pr-3 py-2 border-l-2 border-cyan-500/50 space-y-1">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 pb-1">
                                  <Layers className="size-3.5" />
                                  Nível 2 — Seções ({r.idEmpresa} - {r.lojaNome}) {isLoadingSec && <Loader2 className="size-3.5 animate-spin ml-1" />}
                                </div>
                                {!isLoadingSec && secoes.length === 0 && (
                                  <div className="text-[11px] text-slate-400 py-1">Nenhuma seção movimentada neste filtro.</div>
                                )}
                                {secoes.length > 0 && (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="text-slate-400 border-b border-white/10">
                                        <th className="py-1 px-2 text-left">Seção</th>
                                        <th className="py-1 px-2 text-right">Compra</th>
                                        <th className="py-1 px-2 text-right">Venda</th>
                                        <th className="py-1 px-2 text-right">CMV (R$)</th>
                                        <th className="py-1 px-2 text-right">% CMV</th>
                                        <th className="py-1 px-2 text-right">Lucro (R$)</th>
                                        <th className="py-1 px-2 text-right">Margem %</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {secoes.map(sec => {
                                        const secKey = `${rowKey}|sec-${sec.idSecao}`;
                                        const isSecOpen = !!expandedSecoes[secKey];
                                        const prods = produtosCache[secKey] || [];
                                        const isLoadingProd = !!loadingProdutos[secKey];
                                        return (
                                          <Fragment key={secKey}>
                                            <tr
                                              onClick={(e) => { e.stopPropagation(); toggleSecaoProdutos(r, sec); }}
                                              className={`cursor-pointer ${isSecOpen ? "bg-blue-500/10" : "hover:bg-white/5"}`}
                                              title="Clique para abrir os Produtos desta Seção"
                                            >
                                              <td className="py-1.5 px-2 font-medium text-slate-200 flex items-center gap-1.5">
                                                {isSecOpen ? <ChevronDown className="size-3.5 text-blue-400 shrink-0" /> : <ChevronRight className="size-3.5 text-slate-400 shrink-0" />}
                                                <span>{sec.idSecao} - {sec.secao}</span>
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-mono">{fmtBRL(sec.compra)}</td>
                                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-white">{fmtBRL(sec.venda)}</td>
                                              <td className="py-1.5 px-2 text-right font-mono text-slate-300">{fmtBRL(sec.cmv)}</td>
                                              <td className="py-1.5 px-2 text-right text-amber-400 font-semibold">{sec.cmvPct.toFixed(2)}%</td>
                                              <td className="py-1.5 px-2 text-right font-mono text-emerald-400 font-semibold">{fmtBRL(sec.lucro)}</td>
                                              <td className="py-1.5 px-2 text-right text-emerald-400 font-semibold">{sec.margemPct.toFixed(2)}%</td>
                                            </tr>

                                            {/* NÍVEL 3: PRODUTOS DA SEÇÃO */}
                                            {isSecOpen && (
                                              <tr className="bg-black/30">
                                                <td colSpan={7} className="pl-6 pr-2 py-2 border-l-2 border-blue-500/40">
                                                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1 pb-1">
                                                    <Package className="size-3" />
                                                    Nível 3 — Produtos ({sec.secao}) {isLoadingProd && <Loader2 className="size-3 animate-spin ml-1" />}
                                                  </div>
                                                  {!isLoadingProd && prods.length > 0 && (
                                                    <table className="w-full text-[10px]">
                                                      <thead>
                                                        <tr className="text-slate-400 border-b border-white/10">
                                                          <th className="py-1 px-2 text-left">Código</th>
                                                          <th className="py-1 px-2 text-left">Produto</th>
                                                          <th className="py-1 px-2 text-right">Qtd. / Medida</th>
                                                          <th className="py-1 px-2 text-right">Compra</th>
                                                          <th className="py-1 px-2 text-right">Venda</th>
                                                          <th className="py-1 px-2 text-right">CMV</th>
                                                          <th className="py-1 px-2 text-right">% CMV</th>
                                                          <th className="py-1 px-2 text-right">Lucro</th>
                                                          <th className="py-1 px-2 text-right">Margem %</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-white/5">
                                                        {prods.map(pr => (
                                                          <tr key={pr.codigo} className="hover:bg-white/5">
                                                            <td className="py-1 px-2 font-mono text-cyan-300">{pr.codigo}</td>
                                                            <td className="py-1 px-2 text-slate-200">{pr.descricao}</td>
                                                            <td className="py-1 px-2 text-right font-mono whitespace-nowrap">
                                                              <span>
                                                                {pr.unidade === "KG"
                                                                  ? pr.qtdVenda.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                                                                  : pr.qtdVenda.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                                                              </span>
                                                              <span className={`ml-1.5 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                                pr.unidade === "KG"
                                                                  ? "bg-amber-500/20 text-amber-300"
                                                                  : "bg-cyan-500/20 text-cyan-300"
                                                              }`}>
                                                                {pr.unidade || "UN"}
                                                              </span>
                                                            </td>
                                                            <td className="py-1 px-2 text-right font-mono">{fmtBRL(pr.compra)}</td>
                                                            <td className="py-1 px-2 text-right font-mono font-semibold text-white">{fmtBRL(pr.venda)}</td>
                                                            <td className="py-1 px-2 text-right font-mono text-slate-300">{fmtBRL(pr.cmv)}</td>
                                                            <td className="py-1 px-2 text-right text-amber-400">{pr.cmvPct.toFixed(2)}%</td>
                                                            <td className="py-1 px-2 text-right font-mono text-emerald-400">{fmtBRL(pr.lucro)}</td>
                                                            <td className="py-1 px-2 text-right text-emerald-400 font-semibold">{pr.margemPct.toFixed(2)}%</td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                          </Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
