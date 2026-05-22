
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const demoData = [
  { name: "Mercearia", value: 38, color: "var(--chart-1)" },
  { name: "Bebidas", value: 22, color: "var(--chart-2)" },
  { name: "Higiene", value: 16, color: "var(--chart-3)" },
  { name: "Perecíveis", value: 14, color: "var(--chart-4)" },
  { name: "Outros", value: 10, color: "var(--chart-5)" },
];

export function CategoryBreakdown({ mode }: { mode: "demo" | "real" }) {
  if (mode === "real") {
    return (
      <div className="glass-strong rounded-2xl p-5 h-full flex flex-col justify-center items-center text-center min-h-[250px]">
        <div className="text-[10px] tracking-executive text-primary mb-2">Mix de categorias</div>
        <h3 className="font-serif text-lg text-muted-foreground italic mb-2">Mix indisponível</h3>
        <p className="text-xs text-slate-400 max-w-xs">
          A participação das categorias exige a integração com a tabela de itens de venda do ERP.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-2xl p-5 h-full">
      <div className="text-[10px] tracking-executive text-primary">Mix de categorias</div>
      <h3 className="font-serif text-xl mt-1">Participação na receita</h3>
      <div className="relative h-44 mt-2">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={demoData} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={3} stroke="none">
              {demoData.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "oklch(0.2 0.025 262 / 0.95)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

