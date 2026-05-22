
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const demoData = [
  { d: "Seg", vendas: 980, meta: 900 },
  { d: "Ter", vendas: 1120, meta: 950 },
  { d: "Qua", vendas: 1340, meta: 1000 },
  { d: "Qui", vendas: 1180, meta: 1050 },
  { d: "Sex", vendas: 1620, meta: 1100 },
  { d: "Sáb", vendas: 1980, meta: 1200 },
  { d: "Dom", vendas: 1740, meta: 1150 },
];

export function RevenueChart({ mode, selectedStore }: { mode: "demo" | "real"; selectedStore: string }) {
  const [realData, setRealData] = useState([]);

  useEffect(() => {
    if (mode === "real") {
      fetch(`/api/vendas-curva?idEmpresa=${selectedStore}`)
        .then(res => res.json())
        .then(data => { if (!data.error) setRealData(data); })
        .catch(console.error);
    }
  }, [mode, selectedStore]);

  const activeData = mode === "real" ? realData : demoData;

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-[10px] tracking-executive text-primary">Faturamento diário</div>
          <h3 className="font-serif text-2xl mt-1">
            {mode === "real" ? "Curva Operacional (Real)" : "Modo Demonstrativo"} 
            <span className="text-muted-foreground italic text-base"> (R$ Mil)</span>
          </h3>
        </div>
      </div>
      <div className="h-44 mt-3 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activeData}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
            <XAxis dataKey="d" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.2 0.025 262 / 0.95)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: 12,
                fontSize: 12,
              }}
              itemStyle={{ color: "#f1f5f9" }}
            />
            <Area type="monotone" dataKey="vendas" name="Faturamento (R$ Mil)" stroke="var(--chart-1)" fill="url(#rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

