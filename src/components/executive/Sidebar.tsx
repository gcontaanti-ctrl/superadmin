
import { LayoutDashboard, TrendingUp, Package, ShoppingCart, Users, Wallet, Brain, Building2, Settings, Sparkles, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const nav = [
  { icon: LayoutDashboard, label: "Visão Geral", id: "visao-geral" },
  { icon: TrendingUp, label: "Comercial", id: "comercial" },
  { icon: Wallet, label: "Financeiro", id: "financeiro" },
  { icon: Package, label: "Estoque", id: "estoque" },
  { icon: ShoppingCart, label: "Compras", id: "compras" },
  { icon: Users, label: "RH Inteligente", id: "rh" },
  { icon: Search, label: "Rastreamento", id: "rastreamento", badge: "NOVO" },
  { icon: Brain, label: "Análise com IA", id: "ia-analytics", badge: "IA" },
  { icon: Building2, label: "Multiempresa", id: "multiempresa" },
  { icon: Settings, label: "Configurações", id: "configuracoes" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
}

export function Sidebar({ activeTab, setActiveTab, selectedStore, setSelectedStore }: SidebarProps) {
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => { if (!data.error) setEmpresas(data); })
      .catch(console.error);
  }, []);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col glass-strong rounded-2xl p-4 gap-2 h-[calc(100vh-2rem)] sticky top-4">
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="size-10 rounded-lg bg-[image:var(--gradient-primary)] grid place-items-center glow">
          <Sparkles className="size-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-serif text-lg leading-none tracking-tight">IA Executiva</div>
          <div className="text-[10px] text-primary tracking-executive mt-1">Plataforma ERP</div>
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition text-left w-full cursor-pointer",
              activeTab === item.id
                ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border-l-2 border-transparent -ml-px"
            )}
          >
            <item.icon className={cn("size-4", activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="ml-auto text-[9px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}

