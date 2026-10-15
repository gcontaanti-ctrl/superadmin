import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, PieChart as PieIcon, Layers } from "lucide-react";

const COLOR_PALETTE = [
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
];

const demoData = [
  { name: "Mercearia", value: 38, faturamento: 152000, color: COLOR_PALETTE[0] },
  { name: "Bebidas", value: 22, faturamento: 88000, color: COLOR_PALETTE[1] },
  { name: "Higiene & Limpeza", value: 16, faturamento: 64000, color: COLOR_PALETTE[2] },
  { name: "Perecíveis", value: 14, faturamento: 56000, color: COLOR_PALETTE[3] },
  { name: "Outros", value: 10, faturamento: 40000, color: COLOR_PALETTE[4] },
];

export function CategoryBreakdown({ mode, selectedStore, startDate, endDate }: { mode: "demo" | "real", selectedStore: string, startDate?: string, endDate?: string }) {
  const [realData, setRealData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === "real") {
      setLoading(true);
      let url = `/api/mix-categorias?idEmpresa=${selectedStore}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && Array.isArray(data)) {
            setRealData(data.map((item: any, idx: number) => ({
              ...item,
              color: COLOR_PALETTE[idx % COLOR_PALETTE.length]
            })));
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [mode, selectedStore, startDate, endDate]);

  const rawData = mode === "real" ? realData : demoData;
  const activeData = rawData.map((d, i) => ({
    ...d,
    color: d.color || COLOR_PALETTE[i % COLOR_PALETTE.length]
  }));

  const totalFat = activeData.reduce((acc, c) => acc + (Number(c.faturamento) || 0), 0);
  const formatCurrency = (val: number) => val?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) || "R$ 0";

  return (
    <div className={`glass-strong rounded-2xl p-4 flex flex-col relative transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
      {loading && (
        <div className="absolute top-4 right-4 flex items-center justify-center">
           <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] tracking-executive text-primary">Mix de Categorias</div>
          <h3 className="font-serif text-lg mt-0.5 text-slate-100">Participação na Receita</h3>
        </div>
        {totalFat > 0 && (
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Total Mix</span>
            <span className="text-xs font-bold text-cyan-400 font-serif tabular-nums">{formatCurrency(totalFat)}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex-1 min-h-[240px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : activeData.length === 0 ? (
        <div className="flex-1 min-h-[240px] flex items-center justify-center text-slate-500 text-xs italic">
          Sem dados de mix para o período
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Top Half: Donut Chart with center summary */}
          <div className="relative h-40 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={activeData} 
                  dataKey="value" 
                  innerRadius={45} 
                  outerRadius={65} 
                  paddingAngle={4} 
                  stroke="none"
                >
                  {activeData.map((d: any, i: number) => (
                    <Cell key={d.name || i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => {
                    const val = Number(value).toFixed(1) + "%";
                    const fat = props.payload.faturamento ? ` (${formatCurrency(props.payload.faturamento)})` : '';
                    return [val + fat, String(name).charAt(0).toUpperCase() + String(name).slice(1).toLowerCase()];
                  }}
                  contentStyle={{ background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 11, color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Info */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-400 font-medium">Top {activeData.length}</span>
              <span className="text-xs font-bold text-slate-100 font-serif">Seções</span>
            </div>
          </div>

          {/* Bottom Half: Detailed Category Breakdown List (fills space clean & compact) */}
          <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
            {activeData.map((item: any, i: number) => (
              <div key={item.name || i} className="group bg-black/20 border border-white/[0.04] hover:border-primary/20 rounded-xl px-3 py-2 transition-all">
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="font-semibold text-slate-200 truncate capitalize text-[11px]">
                      {String(item.name).toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.faturamento ? (
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {formatCurrency(item.faturamento)}
                      </span>
                    ) : null}
                    <span className="font-bold text-primary tabular-nums text-[11px]">
                      {Number(item.value).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.max(2, item.value))}%`,
                      backgroundColor: item.color
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
