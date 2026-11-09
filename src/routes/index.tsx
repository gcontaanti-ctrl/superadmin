import { useState, useEffect, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/executive/Sidebar";
import { KpiCards } from "@/components/executive/KpiCards";
import { PaymentMethodsCard } from "@/components/executive/PaymentMethodsCard";
import { VendasPorBandeiraModule } from "@/components/executive/VendasPorBandeiraModule";
import { DepartmentMarginPanel } from "@/components/executive/DepartmentMarginPanel";
import { StoreRanking } from "@/components/executive/StoreRanking";
import { CategoryBreakdown } from "@/components/executive/CategoryBreakdown";
import { ProductTracking } from "@/components/executive/ProductTracking";
import { FinancialModule } from "@/components/executive/FinancialModule";
import { CommercialModule } from "@/components/executive/CommercialModule";
import { PurchasesModule } from "@/components/executive/PurchasesModule";
import { DatabaseSettings } from "@/components/executive/DatabaseSettings";
import { Estoque } from "@/components/executive/Estoque";
import { AccountingModule } from "@/components/executive/AccountingModule";
import { AuditorFiscalModule } from "@/components/executive/AuditorFiscalModule";
import { GerencialModule } from "@/components/executive/GerencialModule";
import { PromocoesModule } from "@/components/executive/PromocoesModule";
import { SalesCampaignsModule } from "@/components/executive/SalesCampaignsModule";
import { ValidadeCritica } from "@/components/executive/ValidadeCritica";
import { XmlCompareModule } from "@/components/executive/XmlCompareModule";
import { CybertechAdminModule } from "@/components/executive/CybertechAdminModule";
import { RupturasModule } from "@/components/executive/RupturasModule";
import { EntradasModule } from "@/components/executive/EntradasModule";
import { AiReportModule } from "@/components/executive/AiReportModule";
import { SmartCatalogAuditor } from "@/components/executive/SmartCatalogAuditor";
import { MetasGerenciaisModule } from "@/components/executive/MetasGerenciaisModule";
import { SugestoesComprasModule } from "@/components/executive/SugestoesComprasModule";
import { PainelGerenteMobileModule } from "@/components/executive/PainelGerenteMobileModule";
import { PedidosCompradoresModule } from "@/components/executive/PedidosCompradoresModule";
import { UserManagementModule } from "@/components/executive/UserManagementModule";
import { ContasPagarModule } from "@/components/executive/ContasPagarModule";
import { AtacarejoModule } from "@/components/executive/AtacarejoModule";
import { WhatsNewModal, SYSTEM_VERSION } from "@/components/executive/WhatsNewModal";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { 
  Building2, Package, Database, Shield, Calendar, Loader2, LockKeyhole, LogIn, LogOut,
  Menu, X, Sparkles, Settings, Eye, LayoutDashboard, ShoppingBag, CreditCard, Wallet,
  UserPlus, CheckCircle2, Clock, Store, ArrowLeft, AlertTriangle
} from "lucide-react";
import { nav } from "@/components/executive/Sidebar";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const getTodayStr = () => new Date().toISOString().split('T')[0];
const get30DaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem("horus_session_user") : null;
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authChecked, setAuthChecked] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' ? !!localStorage.getItem("horus_session_user") : false;
    } catch {
      return false;
    }
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  const isSuperAdmin = currentUser?.role === "superadmin" || 
    currentUser?.username?.toLowerCase() === "cristiano" || 
    currentUser?.permissions?.includes("*");

  // Inicia sempre na Visão Geral completa, no celular e no computador
  const [activeTab, setActiveTab] = useState("visao-geral");
  const viewMode = "real";
  const [selectedStore, setSelectedStore] = useState("todas");
  const [startDate, setStartDate] = useState<string>(get30DaysAgoStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [dbLojas, setDbLojas] = useState<any[]>([]);
  const [dbEstoque, setDbEstoque] = useState<any[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);

  // Exibe novidades do sistema automaticamente se for o primeiro login pós-atualização
  useEffect(() => {
    if (authenticated) {
      try {
        const lastSeen = localStorage.getItem("horus_last_seen_version");
        if (lastSeen !== SYSTEM_VERSION) {
          setIsWhatsNewOpen(true);
        }
      } catch (_) {}
    }
  }, [authenticated]);

  // Redireciona para o primeiro módulo liberado caso o usuário não tenha acesso à aba atual
  useEffect(() => {
    if (!currentUser || isSuperAdmin) return;
    const perms = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];
    if (perms.length > 0 && !perms.includes(activeTab)) {
      setActiveTab(perms[0]);
    }
  }, [currentUser, activeTab, isSuperAdmin]);

  useEffect(() => {
    if (!authenticated) return;
    const performSync = () => {
      Promise.all([
        fetch('/api/empresas').then(res => res.json()).then(data => { if (!data.error && Array.isArray(data)) setDbLojas(data); }),
        fetch('/api/estoque').then(res => res.json()).then(data => { if (!data.error && Array.isArray(data)) setDbEstoque(data); })
      ]).then(() => {
        const date = new Date();
        const formatted = date.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setLastSyncTime(formatted);
      }).catch(err => {
        console.error("Falha ao sincronizar com DB2:", err);
        setLastSyncTime("Falha na Conexão");
      });
    };

    performSync();
    const interval = setInterval(performSync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authenticated]);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Informe usuário e senha.");
      return;
    }
    setAuthLoading(true);

    try {
      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        throw new Error(data.error || "Falha ao entrar");
      }

      const userObj = data.user || {
        id: "usr-" + cleanUser,
        nome: cleanUser,
        username: cleanUser,
        role: "admin",
        permissions: ["*"],
        idEmpresa: "todas",
        status: "APROVADO",
      };

      try {
        localStorage.setItem("horus_session_user", JSON.stringify(userObj));
      } catch (_) {}

      setCurrentUser(userObj);
      setAuthenticated(true);
      setPassword("");
      toast.success(`Acesso liberado: Bem-vindo, ${userObj.nome || userObj.username}!`);
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem("horus_session_user");
    } catch (_) {}
    setCurrentUser(null);
    setAuthenticated(false);
    setDbLojas([]);
    setDbEstoque([]);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    toast.info("Você saiu do sistema.");
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Verificando acesso
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen username={username} setUsername={setUsername} password={password} setPassword={setPassword} loading={authLoading} onSubmit={login} />;
  }

  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-primary/20 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg-login.png')" }}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[40px] pointer-events-none z-0"></div>
      
      <div className={`relative z-10 flex flex-col md:flex-row gap-2 md:gap-4 min-h-screen ${isFullscreen ? 'p-0' : 'p-2 md:p-4'}`}>
      {/* Static Sidebar removed to use Drawer format exclusively */}

      {/* Universal Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-950 border-r border-white/10 shadow-2xl p-2 flex flex-col transform transition-transform duration-300 ease-in-out z-50 overflow-hidden">
            <div className="flex justify-end mb-2 px-2 pt-2">
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <Sidebar 
              currentUser={currentUser}
              onLogout={logout}
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              selectedStore={selectedStore} 
              setSelectedStore={setSelectedStore} 
              className="flex-1 w-full p-2 bg-transparent border-none rounded-none shadow-none mt-0 min-h-0"
              onItemClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}
      
      <main className={`flex-1 flex flex-col gap-3 md:gap-4 w-full min-h-0 ${isFullscreen ? 'h-screen p-2 overflow-y-auto' : 'pr-0 md:pr-1 lg:pr-4 pb-24 md:pb-6'}`}>
        {/* Top Header */}
        {!isFullscreen && (
          <header className="glass-strong rounded-2xl px-3 md:px-6 py-2.5 md:py-4 flex items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Button
                onClick={() => setIsMobileMenuOpen(true)}
                variant="ghost"
                size="icon"
                className="text-slate-300 hover:text-white shrink-0 size-9 rounded-xl hover:bg-white/10"
                title="Abrir Menu Completo (24 Módulos)"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
              </Button>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-serif font-bold text-lg md:text-xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  HORUS
                </span>
                <span className="font-sans font-light text-cyan-200 tracking-widest text-xs hidden sm:inline">
                  ANALYTICS
                </span>
              </div>
              <div className="hidden sm:block h-5 w-px bg-white/10 shrink-0" />
              <div className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1.5 mr-1 md:mr-2 shrink-0">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden md:inline">Sincronizado DB2 {lastSyncTime ? `(${lastSyncTime})` : ""}</span>
                <span className="md:hidden">DB2 OK</span>
              </div>

              {/* Global Store Selector in Top Header (Desktop) */}
              <div className="hidden lg:flex items-center gap-2 bg-black/45 px-2 md:px-3 py-1.5 rounded-xl border border-white/10 shadow-inner shrink-0">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <select
                  value={selectedStore}
                  onChange={(e) => {
                    setSelectedStore(e.target.value);
                    const foundLoja = dbLojas.find((l: any) => String(l.IDEMPRESA) === e.target.value);
                    const lojaNome = e.target.value === "todas" 
                      ? "Todas as Lojas" 
                      : String(foundLoja?.DESCREMPRESA || "").trim() || `Filial ${e.target.value}`;
                    toast.success(`Filtrando painel por: ${lojaNome}`);
                  }}
                  className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold truncate"
                >
                  <option value="todas" className="bg-slate-900 text-slate-200">🏢 Todas as Lojas</option>
                  {dbLojas.map((loja: any) => (
                    <option key={loja.IDEMPRESA} value={loja.IDEMPRESA} className="bg-slate-900 text-slate-200">
                      {loja.IDEMPRESA} - {String(loja.DESCREMPRESA || "").trim()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Global Date Range Selector (Desktop) */}
              <div className="hidden lg:flex items-center gap-2 bg-black/45 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner shrink-0">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      toast.success(`Data inicial: ${e.target.value}`);
                    }}
                    className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark]" 
                  />
                  <span className="text-slate-500">até</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      toast.success(`Data final: ${e.target.value}`);
                    }}
                    className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark]" 
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-xl text-xs font-semibold text-primary">
                <Database className="w-3.5 h-3.5" />
                <span>DB2</span>
              </div>
              <Button
                onClick={() => setIsWhatsNewOpen(true)}
                variant="outline"
                className="border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs gap-1.5 rounded-xl h-8 px-2 sm:px-2.5 shrink-0"
                title="Ver novidades da versão"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline font-medium">Novidades</span>
                <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.2 rounded-full font-bold">v{SYSTEM_VERSION}</span>
              </Button>
              <Button onClick={logout} variant="outline" className="border-white/15 bg-white/5 text-xs h-8 px-2 sm:px-2.5">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sair</span>
              </Button>
            </div>
          </header>
        )}

        {/* Mobile Dedicated Control Bar (Loja + Data) */}
        {!isFullscreen && (
          <div className="flex flex-col gap-2 lg:hidden w-full">
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-inner w-full">
              <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <select
                value={selectedStore}
                onChange={(e) => {
                  setSelectedStore(e.target.value);
                  const foundLoja = dbLojas.find((l: any) => String(l.IDEMPRESA) === e.target.value);
                  const lojaNome = e.target.value === "todas" 
                    ? "Todas as Lojas" 
                    : String(foundLoja?.DESCREMPRESA || "").trim() || `Filial ${e.target.value}`;
                  toast.success(`Filtrando painel por: ${lojaNome}`);
                }}
                className="bg-transparent border-none text-slate-100 focus:outline-none cursor-pointer text-xs font-semibold w-full pr-2"
              >
                <option value="todas" className="bg-slate-900 text-slate-100">🏢 Todas as Lojas</option>
                {dbLojas.map((loja: any) => (
                  <option key={loja.IDEMPRESA} value={loja.IDEMPRESA} className="bg-slate-900 text-slate-100">
                    {loja.IDEMPRESA} - {String(loja.DESCREMPRESA || "").trim()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-inner w-full">
              <div className="flex items-center gap-1.5 text-cyan-400 shrink-0">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium text-slate-300">Período:</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-200">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    toast.success(`Data inicial: ${e.target.value}`);
                  }}
                  className="bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark] max-w-[110px]" 
                />
                <span className="text-slate-500 text-[10px]">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    toast.success(`Data final: ${e.target.value}`);
                  }}
                  className="bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark] max-w-[110px]" 
                />
              </div>
            </div>

            {/* Mobile Breadcrumb: Módulo Ativo */}
            {activeTab !== "visao-geral" && (
              <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/20 px-3 py-1.5 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-semibold truncate">
                  <span className="size-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span className="truncate">Módulo: {nav.find(n => n.id === activeTab)?.label || activeTab}</span>
                </div>
                <button 
                  onClick={() => setActiveTab("visao-geral")}
                  className="text-[11px] text-cyan-200 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-2.5 py-1 rounded-lg shrink-0 font-medium"
                >
                  Voltar ao Início
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Contents */}
        {activeTab === "visao-geral" && (
          <div className="flex flex-col gap-4">
            <KpiCards selectedStore={selectedStore} startDate={startDate} endDate={endDate} />
            <PaymentMethodsCard selectedStore={selectedStore} startDate={startDate} endDate={endDate} />
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <DepartmentMarginPanel mode={viewMode} selectedStore={selectedStore} startDate={startDate} endDate={endDate} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StoreRanking mode={viewMode} selectedStore={selectedStore} startDate={startDate} endDate={endDate} />
                  <CategoryBreakdown mode={viewMode} selectedStore={selectedStore} startDate={startDate} endDate={endDate} />
                </div>

                <div className="glass-strong rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="font-serif font-semibold text-sm">Empresas Cadastradas (View DBA.VW_GEA_EMPRESA)</h4>
                      <p className="text-[10px] text-slate-400">Filiais carregadas dinamicamente com nomes comerciais corretos</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 font-semibold">
                          <th className="py-2 px-3">ID</th>
                          <th className="py-2 px-3">Nome Comercial / Razão</th>
                          <th className="py-2 px-3">CNPJ</th>
                          <th className="py-2 px-3 text-center">Cidade</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbLojas.map((loja: any) => (
                          <tr 
                            key={loja.IDEMPRESA} 
                            onClick={() => { setSelectedStore(String(loja.IDEMPRESA)); toast.success(`Filtrando por: ${loja.DESCREMPRESA}`); }}
                            className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${String(selectedStore) === String(loja.IDEMPRESA) ? 'bg-primary/10 border-l-2 border-primary' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-medium tabular-nums">{loja.IDEMPRESA}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-200">{loja.DESCREMPRESA}</td>
                            <td className="py-2.5 px-3 text-slate-300 font-mono">{loja.CNPJ || "Sem CNPJ"}</td>
                            <td className="py-2.5 px-3 text-center text-slate-300 font-bold">{loja.UF || "MACEIO"}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                                Ativa
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              </div>
            </div>
        )}

        {/* Vendas Atacarejo Tab */}
        {activeTab === "atacarejo" && (
          <AtacarejoModule 
            selectedStore={selectedStore} 
            startDate={startDate} 
            endDate={endDate} 
            dbLojas={dbLojas}
          />
        )}

        {/* Vendas por Bandeira de Cartão Tab */}
        {activeTab === "vendas-bandeira" && (
          <VendasPorBandeiraModule 
            selectedStore={selectedStore} 
            startDate={startDate} 
            endDate={endDate} 
          />
        )}

        {/* Contas a Pagar / Boletos Tab */}
        {activeTab === "contas-pagar" && (
          <ContasPagarModule selectedStore={selectedStore} />
        )}

        {/* Metas Gerenciais de Vendas Tab */}
        {activeTab === "metas-vendas" && (
          <MetasGerenciaisModule selectedStore={selectedStore} />
        )}

        {/* Sugestões de Compras / Estoque Tab */}
        {activeTab === "sugestoes-compras" && (
          <SugestoesComprasModule selectedStore={selectedStore} />
        )}

        {/* Painel Gerente Mobile Tab */}
        {activeTab === "painel-gerente" && (
          <PainelGerenteMobileModule selectedStore={selectedStore} />
        )}

        {/* Estoque Tab */}
        {activeTab === "estoque" && (
          <Estoque />
        )}

        {/* Prevenção de Rupturas Tab */}
        {activeTab === "rupturas" && (
          <RupturasModule />
        )}

        {/* Financeiro Tab */}
        {activeTab === "financeiro" && (
          <FinancialModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Contabilidade Tab */}
        {activeTab === "contabilidade" && (
          <AccountingModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Comercial Tab */}
        {activeTab === "comercial" && (
          <CommercialModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Campanhas Tab */}
        {activeTab === "campanhas" && (
          <SalesCampaignsModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Setor de Compras Tab com Gestão de Orçamentos e Baterias */}
        {activeTab === "compras" && (
          <PedidosCompradoresModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Rastreamento Tab */}
        {activeTab === "rastreamento" && (
          <ProductTracking selectedStore={selectedStore} />
        )}



        {activeTab === "configuracoes" && (
          <div className="flex-1 overflow-auto h-full">
            {username.toLowerCase() === "cristiano" ? (
              <DatabaseSettings />
            ) : (
              <div className="glass-strong rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center gap-4 border border-white/5">
                <Shield className="w-12 h-12 text-rose-500/40" />
                <div>
                  <h3 className="text-lg font-semibold text-rose-400">Acesso Restrito</h3>
                  <p className="text-sm mt-2 max-w-md text-slate-400">Apenas o administrador do sistema (<span className="text-white font-bold">cristiano</span>) tem autorização para alterar as configurações do banco de dados e credenciais de acesso ao datacenter do cliente.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gerencial Tab */}
        {activeTab === "gerencial" && (
          <GerencialModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Promoções Tab */}
        {activeTab === "promocoes" && (
          <PromocoesModule 
            selectedStore={selectedStore} 
            globalStartDate={startDate} 
            globalEndDate={endDate} 
          />
        )}

        {/* Validade Crítica Tab */}
        {activeTab === "validade-critica" && (
          <ValidadeCritica selectedStore={selectedStore} />
        )}

        {/* Comparar XML Tab */}
        {activeTab === "comparar-xml" && (
          <XmlCompareModule isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
        )}

        {activeTab === "cybertech-admin" && (
          <CybertechAdminModule />
        )}

        {/* Auditor Fiscal Tab */}
        {activeTab === "auditor-fiscal" && (
          <AuditorFiscalModule
            selectedStore={selectedStore}
            globalStartDate={startDate}
            globalEndDate={endDate}
            dbLojas={dbLojas}
          />
        )}
        
        {activeTab === "entradas" && (
          <EntradasModule storeId={selectedStore === 'todas' ? undefined : selectedStore} />
        )}

        {/* Gerador de Relatórios IA Tab */}
        {activeTab === "ai-report" && (
          <AiReportModule selectedStore={selectedStore} />
        )}

        {/* SmartCatalog AI Tab */}
        {activeTab === "smartcatalog" && (
          <SmartCatalogAuditor />
        )}

        {/* Gestão de Pedidos & Orçamentos (Compradores) Tab */}
        {/* Gestão de Usuários & Permissões (Exclusivo Cristiano / Super Admin) */}
        {activeTab === "gestao-usuarios" && (
          <UserManagementModule currentUser={currentUser} />
        )}

        {activeTab === "pedidos-compradores" && (
          <PedidosCompradoresModule
            selectedStore={selectedStore}
            globalStartDate={startDate}
            globalEndDate={endDate}
          />
        )}

        {/* Other Tabs */}
        {activeTab !== "visao-geral" && activeTab !== "atacarejo" && activeTab !== "vendas-bandeira" && activeTab !== "contas-pagar" && activeTab !== "gestao-usuarios" && activeTab !== "pedidos-compradores" && activeTab !== "sugestoes-compras" && activeTab !== "painel-gerente" && activeTab !== "metas-vendas" && activeTab !== "estoque" && activeTab !== "rastreamento" && activeTab !== "financeiro" && activeTab !== "comercial" && activeTab !== "campanhas" && activeTab !== "compras" && activeTab !== "configuracoes" && activeTab !== "gerencial" && activeTab !== "promocoes" && activeTab !== "validade-critica" && activeTab !== "comparar-xml" && activeTab !== "cybertech-admin" && activeTab !== "contabilidade" && activeTab !== "auditor-fiscal" && activeTab !== "rupturas" && activeTab !== "entradas" && activeTab !== "ai-report" && activeTab !== "smartcatalog" && (
          <div className="glass-strong rounded-2xl p-10 text-center flex flex-col justify-center items-center gap-3 min-h-[300px]">
            <Shield className="w-12 h-12 text-slate-400 animate-pulse" />
            <h3 className="font-serif text-lg font-bold text-slate-200">Aba em Desenvolvimento</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Mais tabelas do DB2 estão sendo mapeadas para integrar este painel.
            </p>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixo para toque com polegar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
        <button 
          onClick={() => setActiveTab("visao-geral")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${activeTab === "visao-geral" ? "text-cyan-400 font-bold bg-cyan-500/15" : "text-slate-400 hover:text-slate-200"}`}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] font-medium tracking-tight">Visão Geral</span>
        </button>

        <button 
          onClick={() => setActiveTab("atacarejo")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${activeTab === "atacarejo" ? "text-indigo-400 font-bold bg-indigo-500/15" : "text-slate-400 hover:text-slate-200"}`}
        >
          <ShoppingBag className="size-5" />
          <span className="text-[10px] font-medium tracking-tight">Atacarejo</span>
        </button>

        <button 
          onClick={() => setActiveTab("vendas-bandeira")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${activeTab === "vendas-bandeira" ? "text-emerald-400 font-bold bg-emerald-500/15" : "text-slate-400 hover:text-slate-200"}`}
        >
          <CreditCard className="size-5" />
          <span className="text-[10px] font-medium tracking-tight">Bandeiras</span>
        </button>

        <button 
          onClick={() => setActiveTab("contas-pagar")}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all ${activeTab === "contas-pagar" ? "text-amber-400 font-bold bg-amber-500/15" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Wallet className="size-5" />
          <span className="text-[10px] font-medium tracking-tight">A Pagar</span>
        </button>

        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-slate-300 hover:text-white"
        >
          <Menu className="size-5 text-cyan-400" />
          <span className="text-[10px] font-medium tracking-tight">Mais (24)</span>
        </button>
      </nav>

      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={() => setIsWhatsNewOpen(false)} />
      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  </div>
  );
}

type LoginScreenProps = {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LoginScreen({ username, setUsername, password, setPassword, loading, onSubmit }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [lojas, setLojas] = useState<any[]>([]);
  
  // Campos do formulário de solicitação de cadastro
  const [regNome, setRegNome] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regLoja, setRegLoja] = useState("todas");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/empresas')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setLojas(data); })
      .catch(() => null);
  }, []);

  const handleRegisterSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!regNome.trim() || !regUser.trim() || !regPassword.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (regPassword.length < 4) {
      toast.error("A senha deve ter no mínimo 4 caracteres.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("A confirmação da senha não confere.");
      return;
    }

    setRegLoading(true);
    setRegSuccessMessage(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: regNome.trim(),
          username: regUser.trim().toLowerCase(),
          password: regPassword.trim(),
          idEmpresa: regLoja
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Falha ao registrar solicitação");
      }

      setRegSuccessMessage(data.message || "Solicitação enviada com sucesso! Aguarde a aprovação do administrador Cristiano.");
      toast.success("Solicitação enviada com sucesso!");
      setUsername(regUser.trim().toLowerCase());
      setPassword("");
      setRegNome("");
      setRegUser("");
      setRegPassword("");
      setRegConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar cadastro");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-3 sm:p-4 antialiased selection:bg-primary/20 bg-cover bg-center bg-no-repeat transition-all duration-1000"
      style={{ backgroundImage: "url('/bg-login.png')" }}
    >
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"></div>

      <div className="relative z-10 w-full max-w-sm rounded-[2rem] p-6 sm:p-8 flex flex-col gap-5 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-slate-950/50 backdrop-blur-xl group overflow-hidden transition-all duration-500 hover:shadow-[0_0_100px_rgba(6,182,212,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        {/* Logo Horus */}
        <div className="flex flex-col items-center gap-2 text-center mb-1">
          <div className="size-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 grid place-items-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-transform duration-500 group-hover:scale-105">
            <Eye className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
              HORUS
            </h1>
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-200 mt-0.5">Analytics</p>
          </div>
        </div>

        {/* Abas Alternadoras: Entrar vs Solicitar Cadastro */}
        <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10 w-full shadow-inner">
          <button
            type="button"
            onClick={() => { setMode("login"); setRegSuccessMessage(null); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${mode === "login" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${mode === "register" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            Solicitar Acesso
          </button>
        </div>

        {/* Feedback de Sucesso no Cadastro */}
        {regSuccessMessage && (
          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in zoom-in-95">
            <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-200">Solicitação Enviada!</p>
              <p className="text-[11px] text-emerald-300/90 mt-0.5 leading-relaxed">{regSuccessMessage}</p>
            </div>
          </div>
        )}

        {/* MODO 1: ENTRAR */}
        {mode === "login" ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-xs font-semibold text-slate-300">
                Usuário
              </label>
              <input
                id="login-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Seu usuário"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
                Senha
              </label>
              <input
                id="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
              />
            </div>

            <Button type="submit" disabled={loading || !username || !password} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold h-10 rounded-xl mt-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
              Entrar
            </Button>

            <div className="text-center pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setMode("register")}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 transition-colors"
              >
                Gerente de loja sem acesso? Solicitar cadastro
              </button>
            </div>
          </form>
        ) : (
          /* MODO 2: SOLICITAR CADASTRO DE GERENTE */
          <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Nome Completo do Gerente *
              </label>
              <input
                type="text"
                required
                value={regNome}
                onChange={(e) => setRegNome(e.target.value)}
                placeholder="Ex: Carlos Roberto"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Usuário de Login desejado *
              </label>
              <input
                type="text"
                required
                value={regUser}
                onChange={(e) => setRegUser(e.target.value)}
                placeholder="Ex: carlos.gerente"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Sua Loja / Filial *
              </label>
              <select
                value={regLoja}
                onChange={(e) => setRegLoja(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60 cursor-pointer"
              >
                <option value="todas">🏢 Todas as Lojas</option>
                {lojas.map((l: any) => (
                  <option key={l.IDEMPRESA} value={String(l.IDEMPRESA)}>
                    {l.IDEMPRESA} - {String(l.DESCREMPRESA || '').trim()}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Senha *
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mín. 4 dígitos"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Confirmar Senha *
                </label>
                <input
                  type="password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Repetir senha"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2.5 text-[10px] text-cyan-300 flex items-center gap-2">
              <Clock className="size-4 text-cyan-400 shrink-0" />
              <span>O cadastro ficará pendente até a aprovação de <strong>Cristiano</strong>.</span>
            </div>

            <Button 
              type="submit" 
              disabled={regLoading || !regNome || !regUser || !regPassword || !regConfirmPassword} 
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold h-10 rounded-xl"
            >
              {regLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Enviar Solicitação para Cristiano
            </Button>

            <div className="text-center pt-1 border-t border-white/5">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="size-3.5" /> Voltar para o Login
              </button>
            </div>
          </form>
        )}
      </div>

      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

