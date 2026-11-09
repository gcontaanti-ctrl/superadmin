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
import { WhatsNewModal, SYSTEM_VERSION } from "@/components/executive/WhatsNewModal";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { 
  Building2, Package, Database, Shield, Calendar, Loader2, LockKeyhole, LogIn, LogOut,
  Menu, X, Sparkles, Settings, Eye
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
  
  const isMobileDevice = typeof window !== 'undefined' && (
    window.innerWidth < 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.location.search.includes('mobile=true')
  );
  
  const isSuperAdmin = currentUser?.role === "superadmin" || 
    currentUser?.username?.toLowerCase() === "cristiano" || 
    currentUser?.permissions?.includes("*");

  const [activeTab, setActiveTab] = useState(() => isMobileDevice ? "painel-gerente" : "visao-geral");
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
      
      <main className={`flex-1 flex flex-col gap-3 md:gap-4 w-full overflow-hidden ${isFullscreen ? 'h-screen p-2 overflow-y-auto' : 'pr-1 lg:pr-4'}`}>
        {/* Top Header */}
        {!isFullscreen && (
          <header className="glass-strong rounded-2xl px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2 md:gap-3 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <Button
              onClick={() => setIsMobileMenuOpen(true)}
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white shrink-0 size-9"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h2 className="hidden sm:flex items-center gap-2 text-xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 shrink-0">
              HORUS <span className="font-sans font-light text-cyan-200 tracking-widest text-sm mt-1">ANALYTICS</span>
            </h2>
            <div className="hidden sm:block h-5 w-px bg-white/10 shrink-0" />
            <div className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1.5 mr-1 md:mr-2 shrink-0">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="hidden md:inline">Sincronizado DB2 {lastSyncTime ? `(${lastSyncTime})` : ""}</span>
              <span className="md:hidden">DB2 OK</span>
            </div>

            {/* Global Store Selector in Top Header */}
            <div className="flex items-center gap-2 bg-black/45 px-2 md:px-3 py-1.5 rounded-xl border border-white/10 shadow-inner shrink-0 max-w-[120px] md:max-w-none">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0 hidden md:block" />
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
                className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[10px] md:text-[11px] font-semibold truncate w-full"
              >
                <option value="todas" className="bg-slate-900 text-slate-200">🏢 Todas as Lojas</option>
                {dbLojas.map((loja: any) => (
                  <option key={loja.IDEMPRESA} value={loja.IDEMPRESA} className="bg-slate-900 text-slate-200">
                    {loja.IDEMPRESA} - {String(loja.DESCREMPRESA || "").trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Global Date Range Selector */}
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

          <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl text-xs font-semibold text-primary">
            <Database className="w-3.5 h-3.5" />
            <span>Dados Reais (DB2)</span>
          </div>
          <Button
            onClick={() => setIsWhatsNewOpen(true)}
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs gap-1.5 rounded-xl h-8 px-2.5 shrink-0"
            title="Ver novidades da versão"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-medium">Novidades</span>
            <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-1.5 py-0.2 rounded-full font-bold">v{SYSTEM_VERSION}</span>
          </Button>
          <Button onClick={logout} variant="outline" className="border-white/15 bg-white/5 text-xs">
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </Button>
        </header>
        )}

        {/* Mobile Date Range Selector */}
        {!isFullscreen && (
          <div className="flex lg:hidden items-center justify-between gap-2 bg-black/45 px-3 py-2 rounded-xl border border-white/10 shadow-inner w-full mb-1">
            <div className="flex items-center gap-2 text-primary">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold">Período:</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                  toast.success(`Data inicial: ${e.target.value}`);
                }}
                className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark] max-w-[100px]" 
              />
              <span className="text-slate-500">até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  toast.success(`Data final: ${e.target.value}`);
                }}
                className="bg-transparent border-none text-slate-200 focus:outline-none cursor-pointer text-[11px] font-semibold [color-scheme:dark] max-w-[100px]" 
              />
            </div>
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
        {activeTab !== "visao-geral" && activeTab !== "gestao-usuarios" && activeTab !== "pedidos-compradores" && activeTab !== "sugestoes-compras" && activeTab !== "painel-gerente" && activeTab !== "metas-vendas" && activeTab !== "estoque" && activeTab !== "rastreamento" && activeTab !== "financeiro" && activeTab !== "comercial" && activeTab !== "campanhas" && activeTab !== "compras" && activeTab !== "configuracoes" && activeTab !== "gerencial" && activeTab !== "promocoes" && activeTab !== "validade-critica" && activeTab !== "comparar-xml" && activeTab !== "cybertech-admin" && activeTab !== "contabilidade" && activeTab !== "auditor-fiscal" && activeTab !== "rupturas" && activeTab !== "entradas" && activeTab !== "ai-report" && activeTab !== "smartcatalog" && (
          <div className="glass-strong rounded-2xl p-10 text-center flex flex-col justify-center items-center gap-3 min-h-[300px]">
            <Shield className="w-12 h-12 text-slate-400 animate-pulse" />
            <h3 className="font-serif text-lg font-bold text-slate-200">Aba em Desenvolvimento</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Mais tabelas do DB2 estão sendo mapeadas para integrar este painel.
            </p>
          </div>
        )}
      </main>

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
  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-4 antialiased selection:bg-primary/20 bg-cover bg-center bg-no-repeat transition-all duration-1000"
      style={{ backgroundImage: "url('/bg-login.png')" }}
    >
      {/* Overlay escuro para garantir que o formulário fique legível sobre a imagem */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"></div>

      <form onSubmit={onSubmit} className="relative z-10 w-full max-w-sm rounded-[2rem] p-8 flex flex-col gap-6 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] bg-slate-950/40 backdrop-blur-xl group overflow-hidden transition-all duration-500 hover:shadow-[0_0_100px_rgba(6,182,212,0.2)]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="flex flex-col items-center gap-3 text-center mb-2">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 grid place-items-center shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-transform duration-500 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]">
            <Eye className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">HORUS</h1>
            <p className="text-[12px] uppercase tracking-[0.3em] text-cyan-200 mt-0.5">Analytics</p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="login-username" className="text-xs font-semibold text-slate-300">
            Usuario
          </label>
          <input
            id="login-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="text-xs font-semibold text-slate-300">
            Senha
          </label>
          <input
            id="login-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="current-password"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-primary/60"
          />
        </div>

        <Button type="submit" disabled={loading || !username || !password} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Entrar
        </Button>
      </form>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  );
}

