import { Fragment, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertOctagon,
  Calendar,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  MapPin,
  Package,
  Printer,
  Search,
  ShieldAlert,
  Store,
  Truck,
  User,
  Wrench,
  X,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface GrupoAvaria {
  nome: string;
  valor: number;
  qtd: number;
  registros: number;
}

interface ItemAvaria {
  idAvaria: number;
  idEmpresa: number;
  loja: string;
  dtHora: string;
  codigo: number;
  produto: string;
  unidade: string;
  secao: string;
  qtd: number;
  valorUnitario: number;
  valorTotal: number;
  saldo: number;
  valorSaldo: number;
  origem: string;
  ocorrencia: string;
  motivo: string;
  fornecedor: string;
  usuario: string;
  observacao: string;
}

interface BaixaPerda {
  idEmpresa: number;
  loja: string;
  idOperacao: number;
  operacao: string;
  qtdRegistros: number;
  qtdItens: number;
  valorTotal: number;
  isBonificacao: boolean;
}

interface BaixaRegistro {
  dtHora: string;
  idPlanilha: number;
  numNota: number | null;
  codigo: number;
  produto: string;
  unidade: string;
  qtd: number;
  valorTotal: number;
  usuario: string;
}

interface AvariasResponse {
  startDate: string;
  endDate: string;
  resumo: {
    totalRegistros: number;
    totalQtdItens: number;
    totalValor: number;
    saldoParadoQtd: number;
    saldoParadoValor: number;
    totalBonificacao: number;
    totalPerdasBaixadas: number;
  };
  porLoja: GrupoAvaria[];
  porOrigem: GrupoAvaria[];
  porOcorrencia: GrupoAvaria[];
  porMotivo: GrupoAvaria[];
  porSecao: GrupoAvaria[];
  porFornecedor: GrupoAvaria[];
  porUsuario: GrupoAvaria[];
  baixasPerdas: BaixaPerda[];
  itens: ItemAvaria[];
}

interface Props {
  selectedStore?: string;
  lojas?: any[];
}

export function AvariasModule({ selectedStore = "todas", lojas = [] }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [idEmpresa, setIdEmpresa] = useState(selectedStore || "todas");
  const [aba, setAba] = useState<"avarias" | "baixas">("avarias");

  const [busca, setBusca] = useState("");
  const [filtroOrigem, setFiltroOrigem] = useState<string>("");
  const [filtroOcorrencia, setFiltroOcorrencia] = useState<string>("");
  const [filtroMotivo, setFiltroMotivo] = useState<string>("");
  const [filtroFornecedor, setFiltroFornecedor] = useState<string>("");
  const [filtroSecao, setFiltroSecao] = useState<string>("");
  const [filtroUsuario, setFiltroUsuario] = useState<string>("");
  const [somenteComSaldo, setSomenteComSaldo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<AvariasResponse | null>(null);
  const [painelAnalise, setPainelAnalise] = useState<"ocorrencia" | "loja" | "fornecedor" | "usuario">("ocorrencia");

  const [expandedBaixas, setExpandedBaixas] = useState<Record<string, boolean>>({});
  const [baixasCache, setBaixasCache] = useState<Record<string, BaixaRegistro[]>>({});
  const [loadingBaixas, setLoadingBaixas] = useState<Record<string, boolean>>({});

  const lojasOrdenadas = useMemo(() => {
    return [...(lojas || [])].sort((a: any, b: any) => Number(a.id ?? a.IDEMPRESA ?? 0) - Number(b.id ?? b.IDEMPRESA ?? 0));
  }, [lojas]);

  const carregar = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ startDate, endDate, idEmpresa });
      const res = await fetch(`/api/estoque/avarias?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao consultar avarias no DB2");
      setDados(json);
      setExpandedBaixas({});
      setBaixasCache({});
    } catch (err: any) {
      toast.error(err.message || "Falha ao carregar avarias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const fmtBRL = (v: number) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const limparFiltrosRapidos = () => {
    setBusca("");
    setFiltroOrigem("");
    setFiltroOcorrencia("");
    setFiltroMotivo("");
    setFiltroFornecedor("");
    setFiltroSecao("");
    setFiltroUsuario("");
    setSomenteComSaldo(false);
  };

  const temFiltroAtivo = !!(busca || filtroOrigem || filtroOcorrencia || filtroMotivo || filtroFornecedor || filtroSecao || filtroUsuario || somenteComSaldo);

  const toggleBaixaDetalhe = async (b: BaixaPerda) => {
    const key = `${b.idEmpresa}-${b.idOperacao}`;
    const next = !expandedBaixas[key];
    setExpandedBaixas(prev => ({ ...prev, [key]: next }));
    if (!next || baixasCache[key]) return;

    setLoadingBaixas(prev => ({ ...prev, [key]: true }));
    try {
      const qs = new URLSearchParams({
        idEmpresa: String(b.idEmpresa),
        idOperacao: String(b.idOperacao),
        startDate,
        endDate
      });
      const res = await fetch(`/api/estoque/avarias/baixa-detalhe?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao carregar registros da perda");
      setBaixasCache(prev => ({ ...prev, [key]: json.registros || [] }));
    } catch (err: any) {
      toast.error(err.message || "Falha ao abrir registros da perda");
    } finally {
      setLoadingBaixas(prev => ({ ...prev, [key]: false }));
    }
  };

  const itensFiltrados = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return (dados?.itens || []).filter(it => {
      if (filtroOrigem && it.origem !== filtroOrigem) return false;
      if (filtroOcorrencia && it.ocorrencia !== filtroOcorrencia) return false;
      if (filtroMotivo && it.motivo !== filtroMotivo) return false;
      if (filtroFornecedor && it.fornecedor !== filtroFornecedor) return false;
      if (filtroSecao && it.secao !== filtroSecao) return false;
      if (filtroUsuario && it.usuario !== filtroUsuario) return false;
      if (somenteComSaldo && it.saldo <= 0) return false;
      if (q) {
        const hay = `${it.codigo} ${it.produto} ${it.fornecedor} ${it.secao} ${it.usuario}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dados, busca, filtroOrigem, filtroOcorrencia, filtroMotivo, filtroFornecedor, filtroSecao, filtroUsuario, somenteComSaldo]);

  const exportarCSV = () => {
    if (!itensFiltrados.length) return;
    const header = "DATA_HORA;LOJA;CODIGO;PRODUTO;QTD;UNIDADE;CUSTO_UNIT;VALOR_TOTAL;SALDO_PENDENTE;ORIGEM;OCORRENCIA;MOTIVO;SECAO;FORNECEDOR;USUARIO";
    const lines = itensFiltrados.map(it =>
      [
        it.dtHora,
        it.loja,
        it.codigo,
        it.produto,
        it.qtd.toFixed(3).replace(".", ","),
        it.unidade,
        it.valorUnitario.toFixed(4).replace(".", ","),
        it.valorTotal.toFixed(2).replace(".", ","),
        it.saldo.toFixed(3).replace(".", ","),
        it.origem,
        it.ocorrencia,
        it.motivo,
        it.secao,
        it.fornecedor,
        it.usuario
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    );
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Avarias_${startDate}_a_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRankingCard = (
    titulo: string,
    icone: React.ReactNode,
    lista: GrupoAvaria[],
    ativo: string,
    onSelect: (val: string) => void,
    barColor: string
  ) => {
    const totalGrupo = lista.reduce((acc, x) => acc + x.valor, 0) || 1;
    const maxVal = lista[0]?.valor || 1;
    return (
      <Card className="glass border-white/10 rounded-2xl">
        <CardContent className="p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              {icone}
              <span>{titulo}</span>
            </div>
            {ativo && (
              <button
                type="button"
                onClick={() => onSelect("")}
                className="text-[10px] text-cyan-300 hover:text-white flex items-center gap-0.5 cursor-pointer"
              >
                <X className="size-3" /> Limpar
              </button>
            )}
          </div>
          <div className="space-y-1">
            {lista.length === 0 ? (
              <div className="text-[11px] text-slate-500 py-2">Sem registros no período.</div>
            ) : (
              lista.slice(0, 6).map(item => {
                const isSel = ativo === item.nome;
                const barPct = Math.max(4, (item.valor / maxVal) * 100);
                const sharePct = (item.valor / totalGrupo) * 100;
                return (
                  <button
                    key={item.nome}
                    type="button"
                    onClick={() => onSelect(isSel ? "" : item.nome)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSel
                        ? "bg-cyan-500/20 border-cyan-400"
                        : "bg-transparent border-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-200 font-medium truncate">{item.nome}</span>
                      <span className="font-mono font-semibold text-white shrink-0">
                        {fmtBRL(item.valor)} <span className="text-[10px] text-slate-400">({sharePct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-[9px] text-slate-500 shrink-0 w-12 text-right">{item.registros} reg.</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #avarias-print-area, #avarias-print-area * { visibility: visible; }
          #avarias-print-area { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #0f172a !important; padding: 12px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Filtros */}
      <Card className="glass-strong border-white/10 rounded-2xl no-print">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertOctagon className="size-5 text-rose-400" />
                Auditoria de Avarias & Perdas
              </h2>
              <p className="text-xs text-slate-400">
                Visão completa em tempo real de onde acontecem as avarias, motivos, ocorrências, fornecedores e baixas por setor.
              </p>
            </div>
            {dados && (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={exportarCSV} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Download className="size-3.5 text-emerald-400" /> Exportar Excel (CSV)
                </Button>
                <Button onClick={() => window.print()} size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 !text-white">
                  <Printer className="size-3.5" /> Imprimir
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
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

            <div className="lg:col-span-3">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
                <Store className="size-3" /> Loja
              </label>
              <select
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white"
              >
                <option value="todas" className="bg-slate-900">Todas as Lojas</option>
                {lojasOrdenadas.map((l: any) => {
                  const id = l.id ?? l.IDEMPRESA;
                  const nome = l.DESCREMPRESA || l.nome || l.NOMEFANTASIA || `Loja ${id}`;
                  return (
                    <option key={id} value={String(id)} className="bg-slate-900">
                      {id} - {nome}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="lg:col-span-3 relative">
              <label className="text-[11px] font-semibold text-slate-400 uppercase mb-1 block">
                Buscar Produto / Fornecedor / Usuário
              </label>
              <div className="relative">
                <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Código, produto, fornecedor..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <Button
                onClick={carregar}
                disabled={loading}
                className="w-full h-9 rounded-xl bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 !text-white font-semibold text-xs"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Atualizar"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={aba === "avarias" ? "default" : "outline"}
                onClick={() => setAba("avarias")}
                className="text-xs rounded-xl"
              >
                Raio-X das Avarias ({dados?.resumo.totalRegistros || 0})
              </Button>
              <Button
                size="sm"
                variant={aba === "baixas" ? "default" : "outline"}
                onClick={() => setAba("baixas")}
                className="text-xs rounded-xl"
              >
                Baixas de Perdas no Estoque ({dados?.baixasPerdas.length || 0})
              </Button>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <input
                type="checkbox"
                checked={somenteComSaldo}
                onChange={(e) => setSomenteComSaldo(e.target.checked)}
                className="accent-rose-400"
              />
              <span>Somente com saldo parado na avaria</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {dados && (
        <div id="avarias-print-area" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3 sm:p-3.5">
                <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <AlertOctagon className="size-3.5 text-rose-400 shrink-0" /> Total Avariado
                </div>
                <div className="text-sm sm:text-lg font-bold text-rose-400 mt-1 truncate">{fmtBRL(dados.resumo.totalValor)}</div>
                <div className="text-[10px] text-slate-400">{dados.resumo.totalRegistros} ocorrências</div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3 sm:p-3.5">
                <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <Package className="size-3.5 text-amber-400 shrink-0" /> Saldo Parado Avaria
                </div>
                <div className="text-sm sm:text-lg font-bold text-amber-300 mt-1 truncate">{fmtBRL(dados.resumo.saldoParadoValor)}</div>
                <div className="text-[10px] text-slate-400">Aguardando baixa/troca</div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3 sm:p-3.5">
                <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <ShieldAlert className="size-3.5 text-orange-400 shrink-0" /> Perdas Baixadas (COI)
                </div>
                <div className="text-sm sm:text-lg font-bold text-white mt-1 truncate">{fmtBRL(dados.resumo.totalPerdasBaixadas)}</div>
                <div className="text-[10px] text-slate-400">Açougue, Horti, Mercearia...</div>
              </CardContent>
            </Card>

            <Card className="glass border-white/10 rounded-2xl">
              <CardContent className="p-3 sm:p-3.5">
                <div className="text-[10px] sm:text-[11px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" /> Pago Bonificação (1079)
                </div>
                <div className="text-sm sm:text-lg font-bold text-emerald-400 mt-1 truncate">{fmtBRL(dados.resumo.totalBonificacao)}</div>
                <div className="text-[10px] text-slate-400">Recuperado via bonificação</div>
              </CardContent>
            </Card>
          </div>

          {aba === "avarias" ? (
            <>
              {/* Painel de Análise Compacto com Abas (sem caixas gigantes com scroll) */}
              <div className="space-y-2.5 no-print">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPainelAnalise("ocorrencia")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      painelAnalise === "ocorrencia" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Ocorrências & Motivos
                  </button>
                  <button
                    type="button"
                    onClick={() => setPainelAnalise("loja")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      painelAnalise === "loja" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Lojas & Origens
                  </button>
                  <button
                    type="button"
                    onClick={() => setPainelAnalise("fornecedor")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      painelAnalise === "fornecedor" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Fornecedores & Seções
                  </button>
                  <button
                    type="button"
                    onClick={() => setPainelAnalise("usuario")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      painelAnalise === "usuario" ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    Usuários
                  </button>
                </div>

                {painelAnalise === "ocorrencia" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderRankingCard("O que Aconteceu (Top Ocorrências)", <AlertOctagon className="size-3.5 text-rose-400" />, dados.porOcorrencia, filtroOcorrencia, setFiltroOcorrencia, "bg-rose-400")}
                    {renderRankingCard("Por que Aconteceu (Top Motivos)", <Wrench className="size-3.5 text-orange-400" />, dados.porMotivo, filtroMotivo, setFiltroMotivo, "bg-orange-400")}
                  </div>
                )}

                {painelAnalise === "loja" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderRankingCard("Por Loja", <Store className="size-3.5 text-cyan-400" />, dados.porLoja, "", (v) => {
                      const id = v.split(" - ")[0];
                      setIdEmpresa(id || "todas");
                    }, "bg-cyan-400")}
                    {renderRankingCard("Onde Aconteceu (Origem)", <MapPin className="size-3.5 text-amber-400" />, dados.porOrigem, filtroOrigem, setFiltroOrigem, "bg-amber-400")}
                  </div>
                )}

                {painelAnalise === "fornecedor" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderRankingCard("Top Fornecedores (Troca / Bonificação)", <Truck className="size-3.5 text-emerald-400" />, dados.porFornecedor, filtroFornecedor, setFiltroFornecedor, "bg-emerald-400")}
                    {renderRankingCard("Top Seções", <Package className="size-3.5 text-blue-400" />, dados.porSecao, filtroSecao, setFiltroSecao, "bg-blue-400")}
                  </div>
                )}

                {painelAnalise === "usuario" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderRankingCard("Quem Mais Registrou (Usuário)", <User className="size-3.5 text-purple-400" />, dados.porUsuario, filtroUsuario, setFiltroUsuario, "bg-purple-400")}
                    {renderRankingCard("Onde Aconteceu (Origem)", <MapPin className="size-3.5 text-amber-400" />, dados.porOrigem, filtroOrigem, setFiltroOrigem, "bg-amber-400")}
                  </div>
                )}
              </div>

              {/* Barra de filtros ativos */}
              {temFiltroAtivo && (
                <div className="flex flex-wrap items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-2.5 text-xs no-print">
                  <Filter className="size-3.5 text-cyan-400" />
                  <span className="text-cyan-200 font-semibold">Filtros ativos ({itensFiltrados.length} itens):</span>
                  {filtroOrigem && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">Origem: {filtroOrigem}</span>}
                  {filtroOcorrencia && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">Ocorrência: {filtroOcorrencia}</span>}
                  {filtroMotivo && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">Motivo: {filtroMotivo}</span>}
                  {filtroFornecedor && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">Fornecedor: {filtroFornecedor}</span>}
                  {filtroUsuario && <span className="px-2 py-0.5 rounded-full bg-white/10 text-white">Usuário: {filtroUsuario}</span>}
                  <Button size="sm" variant="outline" onClick={limparFiltrosRapidos} className="h-6 px-2 text-[10px] ml-auto">
                    Limpar tudo
                  </Button>
                </div>
              )}

              {/* Lista Mobile (Cards sem rolagem lateral) */}
              <div className="md:hidden space-y-2 no-print">
                {itensFiltrados.slice(0, 200).map(it => (
                  <Card key={`mob-av-${it.idAvaria}`} className="glass border-white/10 rounded-xl">
                    <CardContent className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-white leading-tight">
                          <span className="font-mono text-cyan-300 mr-1">{it.codigo}</span>
                          {it.produto}
                        </div>
                        <span className="font-mono font-bold text-rose-400 shrink-0">{fmtBRL(it.valorTotal)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{it.origem}</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300">{it.ocorrencia}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200">{it.motivo}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                        <span>{it.loja} • {it.dtHora}</span>
                        <span className="font-mono text-white">
                          {it.qtd} {it.unidade} {it.saldo > 0 ? `(Saldo: ${it.saldo})` : ""}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        Forn: {it.fornecedor} • Reg: {it.usuario}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Tabela Desktop / Impressão */}
              <Card className="hidden md:block print:block glass border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-300">
                        <th className="py-2.5 px-3">Data / Hora</th>
                        <th className="py-2.5 px-3">Loja</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3 text-right">Qtd.</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-right">Saldo</th>
                        <th className="py-2.5 px-3">Origem</th>
                        <th className="py-2.5 px-3">Ocorrência</th>
                        <th className="py-2.5 px-3">Motivo</th>
                        <th className="py-2.5 px-3">Fornecedor</th>
                        <th className="py-2.5 px-3">Usuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {itensFiltrados.slice(0, 300).map(it => (
                        <tr key={`desk-av-${it.idAvaria}`} className="hover:bg-white/5">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">{it.dtHora}</td>
                          <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{it.loja}</td>
                          <td className="py-2 px-3 text-white">
                            <span className="font-mono text-cyan-300 mr-1">{it.codigo}</span>
                            {it.produto}
                          </td>
                          <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                            {it.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} <span className="text-[10px] text-slate-400">{it.unidade}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-400 whitespace-nowrap">{fmtBRL(it.valorTotal)}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-300 whitespace-nowrap">{it.saldo > 0 ? it.saldo : "—"}</td>
                          <td className="py-2 px-3 text-[11px] text-amber-200">{it.origem}</td>
                          <td className="py-2 px-3 text-[11px] text-rose-300">{it.ocorrencia}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-300">{it.motivo}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-300 max-w-[180px] truncate" title={it.fornecedor}>{it.fornecedor}</td>
                          <td className="py-2 px-3 text-[11px] text-slate-400 whitespace-nowrap">{it.usuario}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            /* ABA 2: BAIXAS DE PERDAS NO ESTOQUE (COM DRILL-DOWN DE REGISTROS) */
            <div className="space-y-2.5">
              {/* Cards Mobile */}
              <div className="md:hidden space-y-2 no-print">
                {dados.baixasPerdas.map((b, idx) => {
                  const key = `${b.idEmpresa}-${b.idOperacao}`;
                  const isOpen = !!expandedBaixas[key];
                  const regs = baixasCache[key] || [];
                  const isLoadingReg = !!loadingBaixas[key];

                  return (
                    <Card key={`mob-bx-${key}-${idx}`} className={`glass border-white/10 rounded-xl ${isOpen ? "ring-1 ring-cyan-500/40" : ""}`}>
                      <CardContent className="p-3 space-y-2 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleBaixaDetalhe(b)}
                          className="w-full text-left flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className={`font-bold flex items-center gap-1 ${b.isBonificacao ? "text-emerald-400" : "text-rose-300"}`}>
                              {isOpen ? <ChevronDown className="size-4 shrink-0 text-cyan-400" /> : <ChevronRight className="size-4 shrink-0 text-slate-400" />}
                              <span className="truncate">{b.operacao}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-5">
                              COI {b.idOperacao} • {b.loja}
                            </div>
                          </div>
                          <span className="font-mono font-bold text-white shrink-0">{fmtBRL(b.valorTotal)}</span>
                        </button>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pl-5">
                          <span>{b.qtdRegistros} registros</span>
                          <span className="font-mono">{b.qtdItens.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} itens</span>
                        </div>

                        {isOpen && (
                          <div className="pt-2 border-t border-cyan-500/30 space-y-1.5">
                            {isLoadingReg && (
                              <div className="flex items-center gap-1.5 text-[10px] text-cyan-300">
                                <Loader2 className="size-3.5 animate-spin" /> Carregando registros...
                              </div>
                            )}
                            {!isLoadingReg && regs.map((rg, rIdx) => (
                              <div key={`mob-rg-${rIdx}`} className="rounded-lg bg-black/30 border border-white/5 p-2 space-y-0.5 text-[10px]">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-slate-100 font-medium">
                                    <span className="font-mono text-cyan-300 mr-1">{rg.codigo}</span>
                                    {rg.produto}
                                  </span>
                                  <span className="font-mono font-bold text-white shrink-0">{fmtBRL(rg.valorTotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-400">
                                  <span>{rg.dtHora} • {rg.usuario}</span>
                                  <span className="font-mono">{rg.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {rg.unidade}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Tabela Desktop / Impressão */}
              <Card className="hidden md:block print:block glass border-white/10 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-300">
                        <th className="py-2.5 px-3">Loja</th>
                        <th className="py-2.5 px-3">COI</th>
                        <th className="py-2.5 px-3">Operação de Baixa / Perda</th>
                        <th className="py-2.5 px-3 text-right">Registros</th>
                        <th className="py-2.5 px-3 text-right">Qtd. Itens</th>
                        <th className="py-2.5 px-3 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {dados.baixasPerdas.map((b, idx) => {
                        const key = `${b.idEmpresa}-${b.idOperacao}`;
                        const isOpen = !!expandedBaixas[key];
                        const regs = baixasCache[key] || [];
                        const isLoadingReg = !!loadingBaixas[key];

                        return (
                          <Fragment key={`${key}-${idx}`}>
                            <tr
                              onClick={() => toggleBaixaDetalhe(b)}
                              className={`cursor-pointer transition-colors ${isOpen ? "bg-cyan-500/10" : "hover:bg-white/5"}`}
                              title="Clique para abrir os registros individuais desta perda"
                            >
                              <td className="py-2.5 px-3 text-slate-200 flex items-center gap-1.5">
                                {isOpen ? <ChevronDown className="size-4 text-cyan-400 shrink-0" /> : <ChevronRight className="size-4 text-slate-400 shrink-0" />}
                                <span>{b.loja}</span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-cyan-300">{b.idOperacao}</td>
                              <td className="py-2.5 px-3 font-medium">
                                <span className={b.isBonificacao ? "text-emerald-400" : "text-rose-300"}>
                                  {b.operacao}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">{b.qtdRegistros}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{b.qtdItens.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{fmtBRL(b.valorTotal)}</td>
                            </tr>

                            {isOpen && (
                              <tr className="bg-slate-950/50">
                                <td colSpan={6} className="p-0">
                                  <div className="pl-8 pr-4 py-2.5 border-l-2 border-cyan-500/50 space-y-2">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                      <Package className="size-3.5" />
                                      Registros individuais ({b.operacao} — {b.loja}) {isLoadingReg && <Loader2 className="size-3.5 animate-spin ml-1" />}
                                    </div>
                                    {!isLoadingReg && regs.length === 0 && (
                                      <div className="text-[11px] text-slate-400">Nenhum registro encontrado.</div>
                                    )}
                                    {regs.length > 0 && (
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="text-slate-400 border-b border-white/10">
                                            <th className="py-1 px-2 text-left">Data / Hora</th>
                                            <th className="py-1 px-2 text-left">Nota / Planilha</th>
                                            <th className="py-1 px-2 text-left">Código</th>
                                            <th className="py-1 px-2 text-left">Produto</th>
                                            <th className="py-1 px-2 text-right">Qtd.</th>
                                            <th className="py-1 px-2 text-right">Valor</th>
                                            <th className="py-1 px-2 text-left">Usuário</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                          {regs.map((rg, rIdx) => (
                                            <tr key={`desk-rg-${rIdx}`} className="hover:bg-white/5">
                                              <td className="py-1.5 px-2 font-mono text-slate-300 whitespace-nowrap">{rg.dtHora}</td>
                                              <td className="py-1.5 px-2 font-mono text-slate-400 whitespace-nowrap">
                                                {rg.numNota ? `NF ${rg.numNota}` : `Plan. ${rg.idPlanilha}`}
                                              </td>
                                              <td className="py-1.5 px-2 font-mono text-cyan-300">{rg.codigo}</td>
                                              <td className="py-1.5 px-2 text-slate-100">{rg.produto}</td>
                                              <td className="py-1.5 px-2 text-right font-mono whitespace-nowrap">
                                                {rg.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} <span className="text-[10px] text-slate-400">{rg.unidade}</span>
                                              </td>
                                              <td className="py-1.5 px-2 text-right font-mono font-semibold text-white whitespace-nowrap">{fmtBRL(rg.valorTotal)}</td>
                                              <td className="py-1.5 px-2 text-slate-300 whitespace-nowrap">{rg.usuario}</td>
                                            </tr>
                                          ))}
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
      )}
    </div>
  );
}
