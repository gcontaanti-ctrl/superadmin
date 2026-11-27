import { 
  LayoutDashboard, TrendingUp, Package, ShoppingCart, ShoppingBag, Users, Wallet, 
  Building2, Settings, Search, BarChart3, Tag, AlertTriangle, FileCheck, 
  Trophy, ShieldAlert, Scale, Eye, Target, Smartphone, FileSpreadsheet,
  ShieldCheck, LogOut, CreditCard, ClipboardList, Printer, CalendarDays, AlertOctagon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const nav = [
  { icon: LayoutDashboard, label: "Visão Geral", id: "visao-geral", group: "Principal" },
  { icon: BarChart3, label: "Gerencial", id: "gerencial", group: "Principal" },
  { icon: Smartphone, label: "Painel Gerente", id: "painel-gerente", group: "Principal" },
  { icon: Target, label: "Metas de Vendas", id: "metas-vendas", group: "Principal" },
  { icon: Printer, label: "Central de Relatórios", id: "central-relatorios", group: "Principal" },
  { icon: FileSpreadsheet, label: "Compra × Venda Forn.", id: "compra-venda-fornecedor", group: "Principal" },

  { icon: ShoppingBag, label: "Vendas Atacarejo", id: "atacarejo", group: "Vendas & Comercial" },
  { icon: CreditCard, label: "Vendas por Bandeira", id: "vendas-bandeira", group: "Vendas & Comercial" },
  { icon: TrendingUp, label: "Comercial", id: "comercial", group: "Vendas & Comercial" },
  { icon: Tag, label: "Promoções", id: "promocoes", group: "Vendas & Comercial" },
  { icon: Trophy, label: "Campanhas", id: "campanhas", group: "Vendas & Comercial" },

  { icon: Wallet, label: "Contas a Pagar", id: "contas-pagar", group: "Financeiro & Fiscal" },
  { icon: CalendarDays, label: "Calendário Pagamentos", id: "calendario-pagamentos", group: "Financeiro & Fiscal" },
  { icon: FileSpreadsheet, label: "DRE & Despesas", id: "dre-despesas", group: "Financeiro & Fiscal" },
  { icon: FileCheck, label: "Entradas (NF)", id: "entradas", group: "Financeiro & Fiscal" },
  { icon: Scale, label: "Auditor Fiscal", id: "auditor-fiscal", group: "Financeiro & Fiscal" },

  { icon: ClipboardList, label: "Orçamento de Compras", id: "pedidos-compradores", group: "Compras & Estoque" },
  { icon: ShoppingBag, label: "Sugestões Compras", id: "sugestoes-compras", group: "Compras & Estoque" },
  { icon: ShoppingCart, label: "Setor de Compras", id: "compras", group: "Compras & Estoque" },
  { icon: Package, label: "Estoque", id: "estoque", group: "Compras & Estoque" },
  { icon: AlertTriangle, label: "Validade Crítica", id: "validade-critica", group: "Compras & Estoque" },
  { icon: AlertOctagon, label: "Avarias & Perdas", id: "avarias", group: "Compras & Estoque" },
  { icon: ShieldAlert, label: "Prevenção Ruptura", id: "rupturas", group: "Compras & Estoque" },
  { icon: Search, label: "Rastreamento", id: "rastreamento", group: "Compras & Estoque" },

  { icon: Users, label: "RH Inteligente", id: "rh", group: "Administração" },
  { icon: Building2, label: "Multiempresa", id: "multiempresa", group: "Administração" },
  { icon: ShieldCheck, label: "Gestão Usuários", id: "gestao-usuarios", adminOnly: true, group: "Administração" },
  { icon: Settings, label: "Configurações", id: "configuracoes", group: "Administração" },
  { icon: ShieldAlert, label: "Sistema Cybertech", id: "cybertech-admin", adminOnly: true, group: "Administração" },
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
  className, 
  onItemClick,
  currentUser,
  onLogout 
}: SidebarProps) {
  const [menuSearch, setMenuSearch] = useState("");

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
    if (item.id === "dre-despesas" && (perms.includes("dre-despesas") || perms.includes("contas-pagar"))) {
      return true;
    }
    return perms.includes(item.id);
  });

  const filteredNav = menuSearch.trim()
    ? allowedNav.filter((item) =>
        item.label.toLowerCase().includes(menuSearch.trim().toLowerCase())
      )
    : allowedNav;

  const groups = Array.from(new Set(filteredNav.map((i) => i.group)));

  return (
    <aside className={cn("w-full h-full flex flex-col gap-1 overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => {
          setActiveTab("visao-geral");
          if (onItemClick) onItemClick();
        }}
        title="Voltar ao Início (Visão Geral)"
        className="flex items-center justify-center px-2 py-0.5 -mt-1 cursor-pointer hover:opacity-85 transition-opacity shrink-0"
      >
        <img
          src="/cybertech_eagle_hd.png"
          alt="CYBERTECH HORUS"
          className="h-10 w-auto max-w-full object-contain drop-shadow-sm"
        />
      </button>

      {/* Busca Rápida de Tela */}
      <div className="relative px-0.5 shrink-0">
        <Search className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={menuSearch}
          onChange={(e) => setMenuSearch(e.target.value)}
          placeholder="Buscar módulo..."
          className="w-full bg-black/35 border border-white/10 rounded-full pl-8 pr-3 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
        />
      </div>

      <nav className="mt-0.5 flex flex-col gap-1.5 overflow-y-auto no-scrollbar flex-1 pb-2 px-0.5">
        {groups.map((groupName) => (
          <div key={groupName} className="flex flex-col gap-0.5">
            <div className="px-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {groupName}
            </div>
            {filteredNav
              .filter((item) => item.group === groupName)
              .map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onItemClick) onItemClick();
                    }}
                    className={cn(
                      "group flex items-center gap-2 rounded-full px-2.5 py-1 text-[11.5px] transition-all text-left w-full cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-[#0088ff] to-[#0055ff] text-white font-semibold shadow-md shadow-blue-500/25 border border-cyan-300/30"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                    )}
                  >
                    <item.icon className={cn("size-3.5 shrink-0", isActive ? "text-white" : "text-slate-400 group-hover:text-cyan-300")} />
                    <span className="truncate flex-1">{item.label}</span>
                  </button>
                );
              })}
          </div>
        ))}
        {filteredNav.length === 0 && (
          <div className="text-center py-4 text-xs text-slate-500">
            Nenhum módulo encontrado.
          </div>
        )}
      </nav>

      {/* User Info & Logout footer */}
      {currentUser && (
        <div className="pt-2 mt-auto border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
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
