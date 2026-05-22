
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Building2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface LojaRanking {
  idEmpresa: number;
  name: string;
  faturamento: number;
  numNotas: number;
  custo: number | null;
  margemPct: number | null;
  margemReais: number | null;
  pct: number;
  mes: number;
  ano: number;
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function StoreRanking({ mode }: { mode: "demo" | "real" }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [lojas, setLojas] = useState<LojaRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMargin, setHasMargin] = useState(false);

  const fetchData = async (m: number, a: number) => {
    if (mode !== "real") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ranking-lojas?mes=${m}&ano=${a}`);
      const data = await res.json();
      if (!data.error && Array.isArray(data)) {
        setLojas(data);
        setHasMargin(data.some((l: LojaRanking) => l.margemPct !== null));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(mes, ano);
  }, [mes, ano, mode]);

  const prevMes = () => {
    if (mes === 1) { setMes(12); setAno(a => a - 1); }
    else setMes(m => m - 1);
  };
  const nextMes = () => {
    const nowM = now.getMonth() + 1;
    const nowA = now.getFullYear();
    if (ano > nowA || (ano === nowA && mes >= nowM)) return;
    if (mes === 12) { setMes(1); setAno(a => a + 1); }
    else setMes(m => m + 1);
  };

  const totalFat = lojas.reduce((acc, l) => acc + l.faturamento, 0);
  const totalMargem = hasMargin
    ? lojas.reduce((acc, l) => acc + (l.margemReais ?? 0), 0)
    : null;
  const margemGeral = totalFat > 0 && totalMargem !== null
    ? (totalMargem / totalFat) * 100
    : null;

  if (mode !== "real") {
    return (
      <div className="glass-strong rounded-2xl p-5 h-full flex flex-col justify-center items-center text-center min-h-[250px]">
        <div className="text-[10px] tracking-executive text-primary mb-2">Ranking de filiais</div>
        <h3 className="font-serif text-lg text-muted-foreground italic">Disponível apenas em Dados Reais</h3>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl p-5 h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-executive text-primary">Faturamento Mensal por Filial</div>
          <h3 className="font-serif text-xl mt-0.5 text-slate-100">Ranking de Lojas</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMes}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-100 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-primary font-mono px-1 min-w-[56px] text-center">
            {MESES[mes - 1]}/{ano}
          </span>
          <button
            onClick={nextMes}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-100 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => fetchData(mes, ano)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-100 transition ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Totais Consolidados */}
      {lojas.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/30 border border-white/5 rounded-xl p-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Total Faturado</div>
            <div className="text-base font-bold font-serif text-primary tabular-nums">{fmt(totalFat)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{lojas.length} filiais ativas</div>
          </div>
          {margemGeral !== null && totalMargem !== null ? (
            <div className="bg-black/30 border border-white/5 rounded-xl p-3">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Margem Geral</div>
              <div className={`text-base font-bold font-serif tabular-nums ${margemGeral >= 20 ? "text-emerald-400" : margemGeral >= 10 ? "text-amber-400" : "text-rose-400"}`}>
                {fmtPct(margemGeral)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{fmt(totalMargem)} lucro bruto</div>
            </div>
          ) : (
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex items-center justify-center">
              <span className="text-[10px] text-slate-500 italic text-center">Custo indisponível<br />na view DB2</span>
            </div>
          )}
        </div>
      )}

      {/* Lista de Lojas */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lojas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm italic">
          Sem dados para {MESES[mes - 1]}/{ano}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-0.5">
          {lojas.map((loja, i) => (
            <li key={loja.idEmpresa ?? i} className="group bg-black/20 border border-white/[0.04] hover:border-primary/20 rounded-xl px-4 py-3 transition-all duration-200">
              <div className="flex items-center justify-between gap-3">
                {/* Rank + Nome */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="size-6 grid place-items-center rounded-full border border-primary/30 text-[10px] font-bold text-primary font-serif shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-sm text-slate-100 group-hover:text-white transition-colors">
                      {loja.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {loja.numNotas > 0 ? `${loja.numNotas} notas` : ""}
                    </div>
                  </div>
                </div>

                {/* Faturamento */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold tabular-nums text-primary">{fmt(loja.faturamento)}</div>
                  {/* Margem */}
                  {loja.margemPct !== null ? (
                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold mt-0.5 ${loja.margemPct >= 20 ? "text-emerald-400" : loja.margemPct >= 10 ? "text-amber-400" : "text-rose-400"}`}>
                      {loja.margemPct >= 0
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />
                      }
                      {fmtPct(loja.margemPct)} margem
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 mt-0.5">margem indisponível</div>
                  )}
                </div>
              </div>

              {/* Barra de progresso do faturamento */}
              <div className="mt-2.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${loja.pct}%`,
                    background: loja.margemPct !== null
                      ? loja.margemPct >= 20 ? "linear-gradient(90deg, #10b981, #34d399)"
                        : loja.margemPct >= 10 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                        : "linear-gradient(90deg, #f43f5e, #fb7185)"
                      : "linear-gradient(90deg, var(--color-primary), color-mix(in oklch, var(--color-primary) 70%, white))"
                  }}
                />
              </div>

              {/* Margem em reais (se disponível) */}
              {loja.margemReais !== null && (
                <div className="mt-1.5 text-[10px] text-slate-500 text-right font-mono">
                  Lucro bruto: <span className={loja.margemReais >= 0 ? "text-emerald-500" : "text-rose-500"}>{fmt(loja.margemReais)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

