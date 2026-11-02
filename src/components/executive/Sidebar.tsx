import { 
  LayoutDashboard, TrendingUp, Package, ShoppingCart, ShoppingBag, Users, Wallet, Brain, 
  Building2, Settings, Sparkles, Search, BarChart3, Tag, AlertTriangle, FileCheck, 
  Trophy, ShieldAlert, BookOpen, Scale, Eye, Target, Smartphone, FileSpreadsheet,
  ShieldCheck, LogOut, UserCheck, CreditCard, BatteryCharging
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const nav = [
  { icon: LayoutDashboard, label: "Visão Geral", id: "visao-geral" },
  { icon: CreditCard, label: "Vendas por Bandeira", id: "vendas-bandeira", badge: "TEF" },
  { icon: Wallet, label: "Contas a Pagar", id: "contas-pagar", badge: "BOLETOS" },
  { icon: ShieldCheck, label: "Gestão Usuários", id: "gestao-usuarios", badge: "ADMIN", adminOnly: true },
  { icon: BatteryCharging, label: "Orçamento de Compras", id: "pedidos-compradores", badge: "BATERIAS" },
  { icon: ShoppingBag, label: "Sugestões Compras", id: "sugestoes-compras", badge: "GERENTES" },
  { icon: Smartphone, label: "Painel Gerente", id: "painel-gerente", badge: "MOBILE" },
  { icon: Target, label: "Metas de Vendas", id: "metas-vendas", badge: "ESTRATÉGICO" },
  { icon: BarChart3, label: "Gerencial", id: "gerencial" },
  { icon: Tag, label: "Promoções", id: "promocoes" },
  { icon: AlertTriangle, label: "Validade Crítica", id: "validade-critica" },
  { icon: FileCheck, label: "Entradas", id: "entradas", badge: "NF" },
  { icon: Scale, label: "Auditor Fiscal", id: "auditor-fiscal", badge: "NOVO" },
  { icon: TrendingUp, label: "Comercial", id: "comercial" },
  { icon: Trophy, label: "Campanhas", id: "campanhas", badge: "SAAS" },
  { icon: Package, label: "Estoque", id: "estoque" },
  { icon: ShieldAlert, label: "Prevenção Ruptura", id: "rupturas", badge: "NOVO" },
  { icon: ShoppingCart, label: "Setor de Compras", id: "compras", badge: "BATERIAS" },
  { icon: Users, label: "RH Inteligente", id: "rh" },
  { icon: Search, label: "Rastreamento", id: "rastreamento", badge: "NOVO" },
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
  currentUser?: any;
  onLogout?: () => void;
}

export function Sidebar({ 
  activeTab, 
  setActiveTab, 
  selectedStore, 
  setSelectedStore, 
  className, 
  onItemClick,
  currentUser,
  onLogout 
}: SidebarProps) {
  const [empresas, setEmpresas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => { if (!data.error && Array.isArray(data)) setEmpresas(data); })
      .catch(console.error);
  }, []);

  const isSuperAdmin = !currentUser || 
    currentUser?.role === "superadmin" || 
    currentUser?.username?.toLowerCase() === "cristiano" || 
    currentUser?.permissions?.includes("*");

  const allowedNav = nav.filter((item) => {
    // Se for o superusuário Cristiano ou usuário padrão, tem acesso a tudo!
    if (!currentUser || isSuperAdmin) {
      return true;
    }
    // Gestão de Usuários é exclusiva do superadmin
    if (item.adminOnly) {
      return isSuperAdmin;
    }
    // Se o usuário tiver lista de permissões específicas liberadas pelo Cristiano
    const perms = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    if (perms.length === 0) return true; // Segurança para não deixar o menu vazio
    return perms.includes(item.id);
  });

  return (
    <aside className={cn("w-full flex flex-col gap-2 overflow-y-auto no-scrollbar", className)}>
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

      <nav className="mt-2 flex flex-col gap-1 overflow-y-auto flex-1 pb-2 pr-1">
        {allowedNav.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              if (onItemClick) onItemClick();
            }}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-xs transition text-left w-full cursor-pointer",
              activeTab === item.id
                ? "bg-primary/10 text-primary border-l-2 border-primary -ml-px font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border-l-2 border-transparent -ml-px"
            )}
          >
            <item.icon className={cn("size-4", activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className={cn(
                "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0",
                item.badge === "ADMIN" 
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                  : "bg-primary/20 text-primary"
              )}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User Info & Logout footer */}
      {currentUser && (
        <div className="pt-3 mt-auto border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={`size-7 rounded-lg grid place-items-center text-xs font-bold shrink-0 ${isSuperAdmin ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/10 text-slate-300'}`}>
              {currentUser.nome?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser.nome}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {isSuperAdmin ? "Super Admin" : `@${currentUser.username}`}
              </p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sair da conta"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
