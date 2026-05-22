
import { useEffect, useState } from "react";
import { Building2, Users, Package, DollarSign, Wallet, ArrowUpRight } from "lucide-react";

export function KpiCards({ selectedStore }: { selectedStore: string }) {
  const [kpis, setKpis] = useState({
    empresas: 0,
    fornecedores: 0,
    itens_estoque: 0,
    faturamento: "R$ 0,00",
    ticket_medio: "R$ 0,00"
  });

  useEffect(() => {
    fetch(`/api/kpis?idEmpresa=${selectedStore}`)
      .then(res => res.json())
      .then(data => { if (!data.error) setKpis(data); })
      .catch(console.error);
  }, [selectedStore]);

  const cards = [
    { label: "Empresas Ativas", value: kpis.empresas, icon: Building2, desc: "Filiais selecionadas", status: "DB2" },
    { label: "Fornecedores", value: kpis.fornecedores, icon: Users, desc: "Fabricantes vinculados", status: "DB2" },
    { label: "Itens no Estoque", value: kpis.itens_estoque, icon: Package, desc: "Locais cadastrados", status: "DB2" },
    { label: "Faturamento", value: kpis.faturamento, icon: DollarSign, desc: "Último dia operacional", status: "DB2" },
    { label: "Ticket Médio", value: kpis.ticket_medio, icon: Wallet, desc: "Média por nota fiscal", status: "DB2" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="glass-strong rounded-2xl p-5 hover:bg-white/[0.03] transition relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-executive text-muted-foreground uppercase font-bold">{c.label}</span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <ArrowUpRight className="w-2.5 h-2.5" /> {c.status}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-slate-100 tabular-nums">{c.value}</div>
              <div className="text-[10px] text-slate-400 leading-none mt-1">{c.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

