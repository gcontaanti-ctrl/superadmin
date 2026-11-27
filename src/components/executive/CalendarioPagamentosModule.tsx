import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Package,
  Droplets,
  Zap,
  Users,
  Truck,
  Home,
  Phone,
  Receipt,
  Copy,
  CheckCircle2,
  Clock,
  Printer,
  Loader2,
  Wallet,
  CalendarCheck,
  UserCheck,
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";

interface TituloCP {
  LOJA: number;
  NUMERO_TITULO: number;
  PARCELA: string;
  IDCLIFOR: number;
  FAVORECIDO: string;
  VENCIMENTO: string;
  VALOR: number;
  VALOR_PAGO: number;
  VALOR_EFETIVO: number;
  STATUS_BAIXADA: string;
  OBSERVACAO: string;
  NRO_DOCUMENTO: string;
  BOLETO: string;
  CODIGO_BARRAS: string;
  CHAVE_PIX: string;
  DATA_EMISSAO?: string;
  DATA_PAGAMENTO?: string;
  ORIGEM?: string;
  USUARIO_LANCAMENTO?: string;
  CONTA_CONTABIL?: string;
  IDPLANILHA?: number | null;
  NUMNOTA?: number | null;
  SERIE_NF?: string;
  categoria: string;
  grupo: string;
  icone: string;
  corBadge: string;
}

interface TituloDetalhe {
  nota: {
    IDPLANILHA: number;
    NUMNOTA: number;
    SERIENOTA: string;
    DTMOVIMENTO: string;
    TIPONOTAFISCAL: string;
    USUARIO_NF?: string;
    NUMPEDIDO?: string;
    COMPRADOR?: string;
  } | null;
  itensNota: {
    codigo: number;
    descricao: string;
    unidade: string;
    qtd: number;
    valorTotal: number;
  }[];
  parcelas: {
    IDTITULO: number;
    PARCELA: string;
    VENCIMENTO: string;
    DATA_PAGAMENTO: string;
    VALOR: number;
    STATUS_BAIXADA: string;
  }[];
}

interface DiaResumo {
  data: string;
  dia: number;
  total: number;
  pago: number;
  aberto: number;
  qtd: number;
}

interface MesResponse {
  mesAno: string;
  itens: TituloCP[];
  porDia: DiaResumo[];
  resumo: {
    totalGeral: number;
    totalPago: number;
    totalAberto: number;
    qtdTotal: number;
    qtdPagas: number;
    qtdAbertas: number;
  };
}

interface Props {
  selectedStore?: string;
  lojas?: any[];
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function renderCategoriaIcon(icone: string) {
  switch (icone) {
    case "Zap": return <Zap className="size-3.5 text-amber-400 shrink-0" />;
    case "Droplets": return <Droplets className="size-3.5 text-cyan-400 shrink-0" />;
    case "Users": return <Users className="size-3.5 text-pink-400 shrink-0" />;
    case "Home": return <Home className="size-3.5 text-purple-400 shrink-0" />;
    case "Phone": return <Phone className="size-3.5 text-blue-400 shrink-0" />;
    case "Receipt": return <Receipt className="size-3.5 text-rose-400 shrink-0" />;
    case "UserCheck": return <UserCheck className="size-3.5 text-indigo-400 shrink-0" />;
    case "CalendarCheck": return <CalendarCheck className="size-3.5 text-teal-400 shrink-0" />;
    default: return <Truck className="size-3.5 text-emerald-400 shrink-0" />;
  }
}

export function CalendarioPagamentosModule({ selectedStore = "todas", lojas = [] }: Props) {
  const hojeIso = new Date().toISOString().slice(0, 10);
  const [mesAno, setMesAno] = useState(hojeIso.slice(0, 7));
  const [idEmpresa, setIdEmpresa] = useState(selectedStore || "todas");
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "F" | "T">("todos");
  const [selectedDay, setSelectedDay] = useState<string>(hojeIso);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("TODAS");
  const [buscaDia, setBuscaDia] = useState<string>("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const [expandedTitulos, setExpandedTitulos] = useState<Record<string, boolean>>({});
  const [tituloDetalheCache, setTituloDetalheCache] = useState<Record<string, TituloDetalhe>>({});
  const [loadingTituloDetalhe, setLoadingTituloDetalhe] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<MesResponse | null>(null);

  const [anoAtual, mesAtual] = mesAno.split("-").map(Number);

  const carregarMes = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        mesAno,
        loja: idEmpresa,
        status: statusFiltro
      });
      const res = await fetch(`/api/financeiro/contas-pagar-mes?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao carregar pagamentos");
      setDados(json);

      // Se o dia selecionado não pertence ao mês carregado, seleciona o 1º dia com movimento (ou dia 1)
      if (!selectedDay.startsWith(mesAno)) {
        const firstDay = json.porDia?.[0]?.data || `${mesAno}-01`;
        setSelectedDay(firstDay);
      }
      setCategoriaFiltro("TODAS");
    } catch (err: any) {
      toast.error(err.message || "Falha ao consultar DB2.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMes();
  }, [mesAno, idEmpresa, statusFiltro]);

  const mudarMes = (delta: number) => {
    const dt = new Date(anoAtual, mesAtual - 1 + delta, 1);
    const nextMes = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    setMesAno(nextMes);
    setSelectedDay(`${nextMes}-01`);
  };

  const irParaHoje = () => {
    setMesAno(hojeIso.slice(0, 7));
    setSelectedDay(hojeIso);
  };

  const fmtBRL = (v: number) =>
    Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtCompact = (v: number) => {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
    return `R$ ${v.toFixed(0)}`;
  };

  // Agrupamento dos itens por data e categorias presentes no dia
  const { itensPorDia, categoriasPorDia } = useMemo(() => {
    const mapItens: Record<string, TituloCP[]> = {};
    const mapCats: Record<string, Set<string>> = {};
    for (const item of dados?.itens || []) {
      const dt = item.VENCIMENTO;
      if (!dt) continue;
      if (!mapItens[dt]) mapItens[dt] = [];
      mapItens[dt].push(item);
      if (!mapCats[dt]) mapCats[dt] = new Set();
      mapCats[dt].add(item.categoria);
    }
    return { itensPorDia: mapItens, categoriasPorDia: mapCats };
  }, [dados]);

  const diaResumoMap = useMemo(() => {
    const m: Record<string, DiaResumo> = {};
    for (const d of dados?.porDia || []) m[d.data] = d;
    return m;
  }, [dados]);

  // Células do calendário (Dom -> Sáb)
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(anoAtual, mesAtual - 1, 1).getDay();
    const totalDays = new Date(anoAtual, mesAtual, 0).getDate();
    const cells: (null | { day: number; iso: string })[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${anoAtual}-${String(mesAtual).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ day: d, iso });
    }
    return cells;
  }, [anoAtual, mesAtual]);

  const maiorDia = useMemo(() => {
    if (!dados?.porDia?.length) return null;
    return [...dados.porDia].sort((a, b) => b.total - a.total)[0];
  }, [dados]);

  // Itens e resumo por categoria do dia selecionado
  const itensDiaSelecionado = useMemo(() => itensPorDia[selectedDay] || [], [itensPorDia, selectedDay]);

  const categoriasDoDia = useMemo(() => {
    const map: Record<string, { categoria: string; icone: string; corBadge: string; total: number; aberto: number; pago: number; qtd: number }> = {};
    for (const item of itensDiaSelecionado) {
      const cat = item.categoria || "Outros";
      const val = item.VALOR_EFETIVO || item.VALOR || 0;
      if (!map[cat]) {
        map[cat] = { categoria: cat, icone: item.icone, corBadge: item.corBadge, total: 0, aberto: 0, pago: 0, qtd: 0 };
      }
      map[cat].total += val;
      map[cat].qtd += 1;
      if (item.STATUS_BAIXADA === "T") map[cat].pago += val;
      else map[cat].aberto += val;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [itensDiaSelecionado]);

  const itensFiltradosDia = useMemo(() => {
    const q = buscaDia.trim().toUpperCase();
    return itensDiaSelecionado.filter(i => {
      if (categoriaFiltro !== "TODAS" && i.categoria !== categoriaFiltro) return false;
      if (q) {
        const hay = `${i.FAVORECIDO} ${i.NUMNOTA || ""} ${i.NUMERO_TITULO} ${i.OBSERVACAO}`.toUpperCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [itensDiaSelecionado, categoriaFiltro, buscaDia]);

  const totalDiaSelecionado = useMemo(() => {
    return itensDiaSelecionado.reduce((acc, i) => acc + (i.VALOR_EFETIVO || i.VALOR || 0), 0);
  }, [itensDiaSelecionado]);

  const lojasOrdenadas = useMemo(() => {
    return [...(lojas || [])].sort((a: any, b: any) => Number(a.id ?? a.IDEMPRESA ?? 0) - Number(b.id ?? b.IDEMPRESA ?? 0));
  }, [lojas]);

  const nomeLoja = (id: number) => {
    const found = lojas.find((l: any) => Number(l.id ?? l.IDEMPRESA) === Number(id));
    return found ? (found.DESCREMPRESA || found.nome || found.NOMEFANTASIA || `Loja ${id}`) : `Loja ${id}`;
  };

  const copiarTexto = (txt: string, label: string) => {
    if (!txt) return;
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copiado!`);
  };

  const toggleTituloDetalhe = async (t: TituloCP, key: string) => {
    const next = !expandedTitulos[key];
    setExpandedTitulos(prev => ({ ...prev, [key]: next }));
    if (!next || tituloDetalheCache[key]) return;

    setLoadingTituloDetalhe(prev => ({ ...prev, [key]: true }));
    try {
      const qs = new URLSearchParams({
        idEmpresa: String(t.LOJA || ""),
        idTitulo: String(t.NUMERO_TITULO || ""),
        idPlanilha: String(t.IDPLANILHA || "")
      });
      const res = await fetch(`/api/financeiro/titulo-detalhe?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao buscar detalhes");
      setTituloDetalheCache(prev => ({ ...prev, [key]: json }));
    } catch (err: any) {
      toast.error(err.message || "Falha ao carregar notas do título");
    } finally {
      setLoadingTituloDetalhe(prev => ({ ...prev, [key]: false }));
    }
  };

  const dataFormatadaDia = useMemo(() => {
    const [y, m, d] = selectedDay.split("-").map(Number);
    if (!y || !m || !d) return selectedDay;
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  }, [selectedDay]);

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #calendario-dia-print, #calendario-dia-print * { visibility: visible; }
          #calendario-dia-print { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #0f172a !important; padding: 14px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Cabeçalho e Filtros Compactos */}
      <Card className="glass-strong border-white/10 rounded-2xl no-print">
        <CardContent className="p-3 sm:p-3.5 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="size-4 text-cyan-400" />
                Calendário de Pagamentos
              </h2>

              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => mudarMes(-1)} className="h-7 px-2 rounded-lg">
                  <ChevronLeft className="size-3.5" />
                </Button>
                <div className="min-w-[115px] text-center text-xs font-bold text-white px-1">
                  {MESES_PT[(mesAtual || 1) - 1]} {anoAtual}
                </div>
                <Button size="sm" variant="outline" onClick={() => mudarMes(1)} className="h-7 px-2 rounded-lg">
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={irParaHoje} className="h-7 px-2.5 rounded-lg text-[11px] ml-0.5">
                  Hoje
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 flex-1 lg:max-w-xl">
              <input
                type="month"
                value={mesAno}
                onChange={(e) => {
                  if (e.target.value) {
                    setMesAno(e.target.value);
                    setSelectedDay(`${e.target.value}-01`);
                  }
                }}
                className="w-full h-8 px-2.5 rounded-xl bg-black/30 border border-white/15 text-[11px] text-white focus:outline-none focus:border-cyan-400"
              />
              <select
                value={idEmpresa}
                onChange={(e) => setIdEmpresa(e.target.value)}
                className="w-full h-8 px-2.5 rounded-xl bg-black/30 border border-white/15 text-[11px] text-white focus:outline-none focus:border-cyan-400"
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
              <select
                value={statusFiltro}
                onChange={(e) => setStatusFiltro(e.target.value as "todos" | "F" | "T")}
                className="w-full h-8 px-2.5 rounded-xl bg-black/30 border border-white/15 text-[11px] text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="todos" className="bg-slate-900">Todos (Agendados + Pagos)</option>
                <option value="F" className="bg-slate-900">Somente Agendados (Em Aberto)</option>
                <option value="T" className="bg-slate-900">Somente Pagos (Baixados)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Área Principal: Coluna Esquerda (4 KPIs Compactos + Calendário) | Coluna Direita (Contas a Pagar do Dia lá em cima) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        <div className="lg:col-span-6 space-y-3 no-print">
          {/* 4 KPIs Compactos cabendo exatamente acima do Calendário */}
          {dados && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Card className="glass border-white/10 rounded-xl">
                <CardContent className="p-2.5">
                  <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
                    <Wallet className="size-3 text-cyan-400 shrink-0" /> Total Mês
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-white mt-0.5 truncate">{fmtBRL(dados.resumo.totalGeral)}</div>
                  <div className="text-[9px] text-slate-400">{dados.resumo.qtdTotal} tít.</div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 rounded-xl">
                <CardContent className="p-2.5">
                  <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
                    <Clock className="size-3 text-amber-400 shrink-0" /> Em Aberto
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-amber-400 mt-0.5 truncate">{fmtBRL(dados.resumo.totalAberto)}</div>
                  <div className="text-[9px] text-slate-400">{dados.resumo.qtdAbertas} a pagar</div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 rounded-xl">
                <CardContent className="p-2.5">
                  <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
                    <CheckCircle2 className="size-3 text-emerald-400 shrink-0" /> Já Pago
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-emerald-400 mt-0.5 truncate">{fmtBRL(dados.resumo.totalPago)}</div>
                  <div className="text-[9px] text-slate-400">{dados.resumo.qtdPagas} pagos</div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 rounded-xl">
                <CardContent className="p-2.5">
                  <div className="text-[9.5px] text-slate-400 uppercase font-semibold flex items-center gap-1 truncate">
                    <CalendarIcon className="size-3 text-rose-400 shrink-0" /> Maior Dia
                  </div>
                  <div className="text-xs sm:text-[13px] font-bold text-white mt-0.5 truncate">
                    {maiorDia ? fmtBRL(maiorDia.total) : "R$ 0,00"}
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {maiorDia ? `Dia ${String(maiorDia.dia).padStart(2, "0")}/${String(mesAtual).padStart(2, "0")} (${maiorDia.qtd})` : "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Grade do Calendário */}
          <Card className="glass border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-2.5 sm:p-4">
            {loading && !dados ? (
              <div className="py-12 flex items-center justify-center gap-2 text-slate-300 text-xs">
                <Loader2 className="size-5 animate-spin text-cyan-400" />
                Carregando calendário real do DB2...
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="text-center text-[10px] sm:text-xs font-bold uppercase text-slate-400 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {calendarCells.map((cell, idx) => {
                    if (!cell) {
                      return <div key={`empty-${idx}`} className="min-h-[58px] sm:min-h-[76px] rounded-xl bg-white/[0.02]" />;
                    }
                    const info = diaResumoMap[cell.iso];
                    const isSelected = selectedDay === cell.iso;
                    const isToday = cell.iso === hojeIso;
                    const isAtrasado = info && info.aberto > 0 && cell.iso < hojeIso;
                    const cats = categoriasPorDia[cell.iso];

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => {
                          setSelectedDay(cell.iso);
                          setCategoriaFiltro("TODAS");
                          setMobileSheetOpen(true);
                        }}
                        className={`min-h-[58px] sm:min-h-[76px] p-1 sm:p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400 ring-1 ring-cyan-400/50"
                            : info
                              ? isAtrasado
                                ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/15"
                                : "bg-white/[0.04] border-white/10 hover:bg-white/10"
                              : "bg-black/20 border-white/5 hover:bg-white/5 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-0.5 w-full">
                          <span className={`text-[11px] font-bold ${
                            isToday
                              ? "px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950"
                              : isSelected
                                ? "text-cyan-300"
                                : "text-slate-200"
                          }`}>
                            {cell.day}
                          </span>
                          {info && (
                            <span className="text-[9px] px-1 py-0.5 rounded-full bg-white/10 text-slate-200 font-semibold">
                              {info.qtd}
                            </span>
                          )}
                        </div>

                        {info ? (
                          <div className="space-y-1 w-full mt-0.5">
                            <div className={`text-[9px] sm:text-[10px] font-mono font-bold truncate ${
                              isAtrasado ? "text-rose-300" : info.aberto > 0 ? "text-amber-300" : "text-emerald-400"
                            }`}>
                              {fmtCompact(info.total)}
                            </div>

                            {cats && (
                              <div className="hidden sm:flex items-center gap-1 flex-wrap">
                                {cats.has("Fornecedor de Mercadorias") && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Fornecedores" />
                                )}
                                {(cats.has("Energia / Luz") || cats.has("Água / Saneamento")) && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Água / Luz" />
                                )}
                                {cats.has("Salários / Folha") && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" title="Salários / Folha" />
                                )}
                                {cats.has("Impostos / Tributos") && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Impostos" />
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-600 hidden sm:block">—</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-3 mt-3 border-t border-white/10">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Fornecedores</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Água / Luz</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-400" /> Salários / Folha</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Impostos / Vencidos</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Painel do Dia Selecionado (Sempre visível ao lado no PC; no Celular abre como gaveta sobreposta) */}
        <div
          id="calendario-dia-print"
          className={`${
            mobileSheetOpen
              ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md overflow-y-auto p-3 lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:overflow-visible lg:p-0"
              : "hidden lg:block"
          } lg:col-span-6 lg:sticky lg:top-4 print:block space-y-3`}
        >
          <Card className="glass-strong border-white/10 rounded-2xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-cyan-400 font-bold">
                    Pagamentos Agendados do Dia
                  </div>
                  <h3 className="text-base font-bold text-white capitalize">
                    {dataFormatadaDia}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <span className="text-slate-400 mr-1">({itensDiaSelecionado.length}):</span>
                    <span className="font-mono font-bold text-white">{fmtBRL(totalDiaSelecionado)}</span>
                  </div>
                  {itensDiaSelecionado.length > 0 && (
                    <Button size="sm" onClick={() => window.print()} className="h-8 gap-1 text-xs bg-blue-600 hover:bg-blue-700 !text-white no-print hidden sm:inline-flex">
                      <Printer className="size-3.5" /> Imprimir
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMobileSheetOpen(false)}
                    className="lg:hidden h-8 px-2.5 rounded-xl text-xs no-print"
                  >
                    <X className="size-4 mr-1" /> Fechar
                  </Button>
                </div>
              </div>

            {itensDiaSelecionado.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum pagamento encontrado para este dia com os filtros selecionados.
              </div>
            ) : (
              <>
                {/* Separação por Categoria (Cards Clicáveis) */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                    <Filter className="size-3.5 text-cyan-400" /> Separação por Categoria (clique para filtrar)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoriaFiltro("TODAS")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        categoriaFiltro === "TODAS"
                          ? "bg-cyan-500/20 border-cyan-400"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="text-[11px] font-bold text-white">Todas as Categorias</div>
                      <div className="text-xs font-mono font-bold text-cyan-300 mt-1">{fmtBRL(totalDiaSelecionado)}</div>
                      <div className="text-[10px] text-slate-400">{itensDiaSelecionado.length} títulos</div>
                    </button>

                    {categoriasDoDia.map(cat => (
                      <button
                        key={cat.categoria}
                        type="button"
                        onClick={() => setCategoriaFiltro(cat.categoria)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          categoriaFiltro === cat.categoria
                            ? "bg-cyan-500/20 border-cyan-400"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5 truncate">
                          {renderCategoriaIcon(cat.icone)}
                          <span className="truncate">{cat.categoria}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-white mt-1">{fmtBRL(cat.total)}</div>
                        <div className="text-[10px] text-slate-400">
                          {cat.qtd} {cat.qtd === 1 ? "título" : "títulos"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Barra de busca rápida no dia */}
                <div className="flex items-center justify-between gap-2 no-print">
                  <input
                    type="text"
                    value={buscaDia}
                    onChange={(e) => setBuscaDia(e.target.value)}
                    placeholder="Filtrar fornecedor, NF ou título neste dia..."
                    className="w-full h-8 px-3 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {itensFiltradosDia.length} itens
                  </span>
                </div>

                {/* Lista em Cards (no PC com scroll interno amplo ao lado do calendário; no Celular dentro da gaveta) */}
                <div className="space-y-2 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1 print:hidden">
                  {itensFiltradosDia.map((t, idx) => {
                    const isPago = t.STATUS_BAIXADA === "T";
                    const tKey = `${t.LOJA}-${t.NUMERO_TITULO}-${t.PARCELA}-${idx}`;
                    const isTitOpen = !!expandedTitulos[tKey];
                    const det = tituloDetalheCache[tKey];
                    const isLoadingDet = !!loadingTituloDetalhe[tKey];

                    return (
                      <div key={`mob-tit-${tKey}`} className={`rounded-xl bg-black/30 border transition-colors ${isTitOpen ? "border-cyan-500/50" : "border-white/10"} p-3 space-y-1.5 text-xs`}>
                        <button
                          type="button"
                          onClick={() => toggleTituloDetalhe(t, tKey)}
                          className="w-full text-left flex items-start justify-between gap-2 cursor-pointer"
                          title="Clique para ver nota fiscal, itens e parcelas"
                        >
                          <div className="font-bold text-white leading-tight flex items-start gap-1.5 min-w-0">
                            {isTitOpen ? <ChevronDown className="size-4 text-cyan-400 shrink-0 mt-0.5" /> : <ChevronRight className="size-4 text-slate-400 shrink-0 mt-0.5" />}
                            <span className="truncate">{t.FAVORECIDO}</span>
                          </div>
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPago ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                          }`}>
                            {isPago ? "Pago" : "Aberto"}
                          </span>
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] pl-5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${t.corBadge}`}>
                            {renderCategoriaIcon(t.icone)}
                            {t.categoria}
                          </span>
                          <span className="text-slate-400">{nomeLoja(t.LOJA)}</span>
                          <span className="text-slate-500">• Título {t.NUMERO_TITULO}/{t.PARCELA}</span>
                          {t.NUMNOTA ? (
                            <span className="text-cyan-300 font-semibold">• NF {t.NUMNOTA}{t.SERIE_NF ? `/${t.SERIE_NF}` : ""}</span>
                          ) : null}
                        </div>

                        {t.OBSERVACAO && (
                          <div className="text-[11px] text-slate-400 pl-5">{t.OBSERVACAO}</div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-white/10">
                          <div className="flex items-center gap-1.5">
                            {t.CHAVE_PIX && (
                              <button
                                type="button"
                                onClick={() => copiarTexto(t.CHAVE_PIX, "Chave PIX")}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 text-[10px] cursor-pointer"
                              >
                                <Copy className="size-3" /> PIX
                              </button>
                            )}
                            {(t.CODIGO_BARRAS || t.BOLETO) && (
                              <button
                                type="button"
                                onClick={() => copiarTexto(t.CODIGO_BARRAS || t.BOLETO, "Código de barras")}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-slate-200 text-[10px] cursor-pointer"
                              >
                                <Copy className="size-3" /> Boleto
                              </button>
                            )}
                          </div>
                          <span className="font-mono font-bold text-sm text-white">
                            {fmtBRL(t.VALOR_EFETIVO || t.VALOR)}
                          </span>
                        </div>

                        {/* NÍVEL EXTRA: DETALHES DO LANÇAMENTO, NOTA FISCAL, ITENS E PARCELAS */}
                        {isTitOpen && (
                          <div className="pt-2 mt-2 border-t border-cyan-500/30 space-y-2.5 text-[11px]">
                            <div className="grid grid-cols-2 gap-1.5 bg-white/[0.03] rounded-lg p-2 border border-white/5 text-[10px]">
                              <div><span className="text-slate-400">Conta:</span> <span className="text-slate-200 font-medium">{t.CONTA_CONTABIL || "—"}</span></div>
                              <div><span className="text-slate-400">Origem:</span> <span className="text-slate-200">{t.ORIGEM || "—"}</span></div>
                              <div><span className="text-slate-400">Emissão:</span> <span className="text-slate-200">{t.DATA_EMISSAO || "—"}</span></div>
                              <div><span className="text-slate-400">Pagamento:</span> <span className="text-emerald-300">{t.DATA_PAGAMENTO || "Em aberto"}</span></div>
                              {t.NRO_DOCUMENTO && (
                                <div className="col-span-2"><span className="text-slate-400">Documento:</span> <span className="text-slate-200 font-mono">{t.NRO_DOCUMENTO}</span></div>
                              )}
                              {t.USUARIO_LANCAMENTO && (
                                <div className="col-span-2"><span className="text-slate-400">Lançado por:</span> <span className="text-slate-200">{t.USUARIO_LANCAMENTO}</span></div>
                              )}
                            </div>

                            {isLoadingDet && (
                              <div className="flex items-center gap-1.5 text-cyan-300 text-[10px]">
                                <Loader2 className="size-3.5 animate-spin" /> Buscando nota fiscal e itens no DB2...
                              </div>
                            )}

                            {!isLoadingDet && det?.nota && (
                              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-cyan-300">
                                  <span className="flex items-center gap-1">
                                    <FileText className="size-3.5" />
                                    Nota Fiscal Nº {det.nota.NUMNOTA} {det.nota.SERIENOTA ? `(Série ${det.nota.SERIENOTA})` : ""}
                                  </span>
                                  <span className="text-slate-300 font-normal">
                                    Entrada: {String(det.nota.DTMOVIMENTO || "").slice(0, 10)}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-200">
                                  <div>
                                    <span className="text-slate-400">Comprador:</span>{" "}
                                    <strong className="text-amber-300">{det.nota.COMPRADOR || "Sem pedido vinculado"}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Pedido Nº:</span>{" "}
                                    <span className="font-mono">{det.nota.NUMPEDIDO || "—"}</span>
                                  </div>
                                  {det.nota.USUARIO_NF && (
                                    <div className="sm:col-span-2">
                                      <span className="text-slate-400">Entrada NF por:</span>{" "}
                                      <span>{det.nota.USUARIO_NF}</span>
                                    </div>
                                  )}
                                </div>

                                {det.itensNota.length > 0 && (
                                  <div className="space-y-1 pt-1 border-t border-cyan-500/20 max-h-40 overflow-y-auto">
                                    <div className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                                      <Package className="size-3" /> Itens da Nota ({det.itensNota.length})
                                    </div>
                                    {det.itensNota.map((it, iIdx) => (
                                      <div key={`${it.codigo}-${iIdx}`} className="flex items-center justify-between gap-2 text-[10px] bg-black/30 rounded px-2 py-1">
                                        <span className="text-slate-200 truncate">
                                          <span className="font-mono text-cyan-300 mr-1">{it.codigo}</span>
                                          {it.descricao}
                                        </span>
                                        <span className="shrink-0 font-mono text-slate-300 whitespace-nowrap">
                                          {it.qtd.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unidade} • <strong className="text-white">{fmtBRL(it.valorTotal)}</strong>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {!isLoadingDet && det && det.parcelas && det.parcelas.length > 1 && (
                              <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2 space-y-1">
                                <div className="text-[10px] font-bold text-slate-300">
                                  Parcelas deste Título ({det.parcelas.length}x)
                                </div>
                                <div className="space-y-1">
                                  {det.parcelas.map((p, pIdx) => (
                                    <div key={`parc-${p.PARCELA}-${pIdx}`} className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-300">
                                        Parc. {p.PARCELA} • Venc. {String(p.VENCIMENTO || "").trim()}
                                      </span>
                                      <span className="flex items-center gap-2">
                                        <span className={p.STATUS_BAIXADA === "T" ? "text-emerald-400" : "text-amber-300"}>
                                          {p.STATUS_BAIXADA === "T" ? "Pago" : "Aberto"}
                                        </span>
                                        <span className="font-mono font-semibold text-white">{fmtBRL(p.VALOR)}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Tabela exclusiva para Impressão */}
                <div className="hidden print:block overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-300">
                        <th className="py-2.5 px-3">Favorecido / Fornecedor</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Loja</th>
                        <th className="py-2.5 px-3">Doc. / Observação</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-center no-print">Copiar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {itensFiltradosDia.map((t, idx) => {
                        const isPago = t.STATUS_BAIXADA === "T";
                        return (
                          <tr key={`desk-tit-${t.NUMERO_TITULO}-${t.PARCELA}-${idx}`} className="hover:bg-white/5">
                            <td className="py-2 px-3 font-medium text-white">
                              {t.FAVORECIDO}
                              <span className="block text-[10px] text-slate-400">Título {t.NUMERO_TITULO}/{t.PARCELA}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${t.corBadge}`}>
                                {renderCategoriaIcon(t.icone)}
                                {t.categoria}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300">{nomeLoja(t.LOJA)}</td>
                            <td className="py-2 px-3 text-slate-400 max-w-[260px] truncate" title={t.OBSERVACAO || t.NRO_DOCUMENTO}>
                              {t.NRO_DOCUMENTO ? `Doc ${t.NRO_DOCUMENTO}` : ""}{t.NRO_DOCUMENTO && t.OBSERVACAO ? " • " : ""}{t.OBSERVACAO || (!t.NRO_DOCUMENTO ? "—" : "")}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isPago ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                              }`}>
                                {isPago ? "Pago" : "Aberto"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-white">
                              {fmtBRL(t.VALOR_EFETIVO || t.VALOR)}
                            </td>
                            <td className="py-2 px-3 text-center no-print">
                              <div className="flex items-center justify-center gap-1">
                                {t.CHAVE_PIX && (
                                  <button
                                    type="button"
                                    onClick={() => copiarTexto(t.CHAVE_PIX, "Chave PIX")}
                                    className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] hover:bg-cyan-500/25 cursor-pointer"
                                  >
                                    PIX
                                  </button>
                                )}
                                {(t.CODIGO_BARRAS || t.BOLETO) && (
                                  <button
                                    type="button"
                                    onClick={() => copiarTexto(t.CODIGO_BARRAS || t.BOLETO, "Código de barras")}
                                    className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] hover:bg-white/20 cursor-pointer"
                                  >
                                    Boleto
                                  </button>
                                )}
                                {!t.CHAVE_PIX && !t.CODIGO_BARRAS && !t.BOLETO && (
                                  <span className="text-slate-600">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
