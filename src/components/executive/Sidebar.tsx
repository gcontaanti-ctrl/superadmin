
import { LayoutDashboard, TrendingUp, Package, ShoppingCart, Users, Wallet, Brain, Building2, Settings, Sparkles, Search, BarChart3, Tag, AlertTriangle, FileCheck, Trophy, ShieldAlert, BookOpen, Scale, Eye, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const nav = [
  { icon: LayoutDashboard, label: "Visão Geral", id: "visao-geral" },
  { icon: Target, label: "Metas de Vendas", id: "metas-vendas", badge: "ESTRATÉGICO" },
  { icon: BarChart3, label: "Gerencial", id: "gerencial" },
  { icon: Tag, label: "Promoções", id: "promocoes" },
  { icon: AlertTriangle, label: "Validade Crítica", id: "validade-critica" },
  { icon: FileCheck, label: "Notas Fiscais", id: "comparar-xml", badge: "XML" },
  { icon: FileCheck, label: "Entradas", id: "entradas", badge: "NF" },
  { icon: Scale, label: "Auditor Fiscal", id: "auditor-fiscal", badge: "NOVO" },
  { icon: TrendingUp, label: "Comercial", id: "comercial" },
  { icon: Trophy, label: "Campanhas", id: "campanhas", badge: "SAAS" },
  { icon: BookOpen, label: "Contabilidade", id: "contabilidade" },
  { icon: Wallet, label: "Financeiro", id: "financeiro" },
  { icon: Package, label: "Estoque", id: "estoque" },
  { icon: ShieldAlert, label: "Prevenção Ruptura", id: "rupturas", badge: "NOVO" },
  { icon: ShoppingCart, label: "Compras", id: "compras" },
  { icon: Users, label: "RH Inteligente", id: "rh" },
  { icon: Search, label: "Rastreamento", id: "rastreamento", badge: "NOVO" },
  { icon: Sparkles, label: "Gerador de Relatórios", id: "ai-report", badge: "IA" },
  { icon: ShieldAlert, label: "SmartCatalog AI", id: "smartcatalog", badge: "NOVO" },

  { icon: Building2, label: "Multiempresa", id: "multiempresa" },
  { icon: Settings, label: "Configurações", id: "configuracoes" },
  { icon: ShieldAlert, label: "Sistema Cybertech", id: "cybertech-admin", badge: "ADMIN" },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  className?: string;
  onItemClick?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, selectedStore, setSelectedStore, className, onItemClick }: SidebarProps) {
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => { if (!data.error) setEmpresas(data); })
      .catch(console.error);
  }, []);

  return (
    <aside className={cn("hidden lg:flex w-64 shrink-0 flex-col glass-strong rounded-2xl p-4 gap-2 h-[calc(100vh-2rem)] sticky top-4 overflow-y-auto no-scrollbar", className)}>
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="size-11 rounded-lg bg-black/40 border border-white/10 grid place-items-center glow overflow-hidden shrink-0">
          <Eye className="size-6 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 font-serif text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-bold">
            HORUS
          </div>
          <div className="text-[11px] text-cyan-200 font-sans tracking-[0.2em] font-light uppercase">Analytics</div>
        </div>
      </div>

      <nav className="mt-3 flex flex-col gap-1 overflow-y-auto flex-1 pb-4 pr-1">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (onItemClick) onItemClick();
            }}
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

