import { useState, useEffect } from "react";
import { 
  Trophy, LayoutDashboard, Target, Medal, Gift, MonitorPlay, 
  Plus, Search, TrendingUp, Users, ShoppingBag, Percent, 
  ChevronRight, Award, Star, Zap, AlertTriangle, ArrowUpRight,
  Package, Calendar, CheckCircle, Clock, Save, X, Loader2, Edit2, Trash2,
  FileText, Image, Tag, Filter, ChevronDown
} from "lucide-react";
import { 
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
  Area, AreaChart
} from "recharts";
import { toast } from "sonner";

// --- MOCK DATA ---
const mockCampanhas = [
  { id: 1, nome: "Festival Verão Refrescante", inicio: "2026-01-01", fim: "2026-03-31", status: "Ativa", obj: "Aumentar vendas de bebidas frias e energéticos no verão." },
  { id: 2, nome: "Loucura por Chocolates", inicio: "2026-04-01", fim: "2026-04-30", status: "Encerrada", obj: "Venda casada na Páscoa para queima de estoque." },
  { id: 3, nome: "Combo Energia Extra", inicio: "2026-06-01", fim: "2026-07-31", status: "Ativa", obj: "Foco em produtos da linha Monster e Red Bull." },
];

const mockRankingOperadores = [
  { id: 1, nome: "Maria Joana", loja: "Loja Centro", pdv: "PDV 03", pontos: 488, vendidos: 500, devolvidos: 10, cancelados: 2, estornados: 0 },
  { id: 2, nome: "João Silva", loja: "Loja Sul", pdv: "PDV 01", pontos: 450, vendidos: 460, devolvidos: 5, cancelados: 5, estornados: 0 },
  { id: 3, nome: "Carlos Santos", loja: "Loja Norte", pdv: "PDV 05", pontos: 412, vendidos: 420, devolvidos: 6, cancelados: 2, estornados: 0 },
  { id: 4, nome: "Ana Costa", loja: "Loja Centro", pdv: "PDV 02", pontos: 390, vendidos: 400, devolvidos: 10, cancelados: 0, estornados: 0 },
  { id: 5, nome: "Pedro Lima", loja: "Loja Sul", pdv: "PDV 04", pontos: 350, vendidos: 360, devolvidos: 5, cancelados: 5, estornados: 0 },
];

const mockEvolucaoDiaria = [
  { data: "01/06", pontos: 120 }, { data: "02/06", pontos: 150 }, { data: "03/06", pontos: 180 },
  { data: "04/06", pontos: 140 }, { data: "05/06", pontos: 210 }, { data: "06/06", pontos: 260 },
  { data: "07/06", pontos: 310 }, { data: "08/06", pontos: 280 }, { data: "09/06", pontos: 350 },
];

const mockRankingPDVs = [
  { pdv: "PDV 03", loja: "Loja Centro", pontos: 1250 },
  { pdv: "PDV 01", loja: "Loja Sul", pontos: 1050 },
  { pdv: "PDV 05", loja: "Loja Norte", pontos: 980 },
];

const mockProdutos = [
  { id: 1, nome: "Monster Energy 473ml", ean: "7891234567890", pontos: 1 },
  { id: 2, nome: "Coca-Cola 350ml", ean: "7891234567891", pontos: 1 },
  { id: 3, nome: "Trident Hortelã", ean: "7891234567892", pontos: 1 },
  { id: 4, nome: "Halls Extra Forte", ean: "7891234567893", pontos: 1 },
];

interface SalesCampaignsModuleProps {
  selectedStore: string;
  globalStartDate: string;
  globalEndDate: string;
}

export function SalesCampaignsModule({ selectedStore, globalStartDate, globalEndDate }: SalesCampaignsModuleProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "campanhas" | "ranking" | "premiacoes" | "simulador">("dashboard");
  const [isCreating, setIsCreating] = useState(false);
  const [rankingOperadores, setRankingOperadores] = useState<any[]>([]);
  const [rankingPDVs, setRankingPDVs] = useState<any[]>([]);
  const [isLoadingRanking, setIsLoadingRanking] = useState(true);

  // Estados de busca de produtos
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);

  // Estados de filtro por marca
  const [marcasList, setMarcasList] = useState<string[]>([]);
  const [selectedMarca, setSelectedMarca] = useState("");
  const [isLoadingMarcas, setIsLoadingMarcas] = useState(false);
  const [isLoadingMarcaProducts, setIsLoadingMarcaProducts] = useState(false);
  const [showMarcaDropdown, setShowMarcaDropdown] = useState(false);
  const [marcaFilter, setMarcaFilter] = useState("");

  // Estados de CRUD de Campanhas
  const [campanhasList, setCampanhasList] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formNome, setFormNome] = useState("");
  const [formInicio, setFormInicio] = useState("");
  const [formFim, setFormFim] = useState("");
  const [formObj, setFormObj] = useState("");

  const fetchCampanhas = () => {
    fetch("/api/campanhas")
      .then(res => res.json())
      .then(data => {
        if (data.length === 0) setCampanhasList(mockCampanhas); // fallback initial
        else setCampanhasList(data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchCampanhas();
  }, []);

  const handleEdit = (campanha: any) => {
    setEditingId(campanha.id);
    setFormNome(campanha.nome || "");
    setFormInicio(campanha.inicio || "");
    setFormFim(campanha.fim || "");
    setFormObj(campanha.obj || "");
    setSelectedProducts(campanha.produtos || []);
    setSelectedMarca("");
    setIsCreating(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    fetch(`/api/campanhas/${id}`, { method: "DELETE" })
      .then(() => {
        toast.success("Campanha excluída com sucesso!");
        fetchCampanhas();
      })
      .catch(err => toast.error("Erro ao excluir campanha."));
  };

  const handleSaveCampaign = () => {
    if (!formNome || !formInicio || !formFim) {
      toast.error("Preencha nome e período da campanha!");
      return;
    }

    const payload = {
      nome: formNome,
      inicio: formInicio,
      fim: formFim,
      obj: formObj,
      status: new Date(formFim) < new Date() ? "Encerrada" : "Ativa",
      produtos: selectedProducts
    };

    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/campanhas/${editingId}` : "/api/campanhas";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(() => {
      toast.success(editingId ? "Campanha atualizada!" : "Campanha criada com sucesso!");
      setIsCreating(false);
      setEditingId(null);
      setFormNome("");
      setFormInicio("");
      setFormFim("");
      setFormObj("");
      setSelectedProducts([]);
      fetchCampanhas();
    })
    .catch(() => toast.error("Erro ao salvar campanha."));
  };

  // Carregar lista de marcas quando o formulário abre
  useEffect(() => {
    if (isCreating && marcasList.length === 0) {
      setIsLoadingMarcas(true);
      fetch('/api/campanhas/marcas')
        .then(res => res.json())
        .then(data => setMarcasList(Array.isArray(data) ? data : []))
        .catch(err => console.error('Erro ao carregar marcas:', err))
        .finally(() => setIsLoadingMarcas(false));
    }
  }, [isCreating]);

  // Handler para adicionar todos os produtos de uma marca
  const handleAddAllFromBrand = () => {
    if (!selectedMarca) {
      toast.error("Selecione uma marca primeiro!");
      return;
    }
    setIsLoadingMarcaProducts(true);
    fetch(`/api/campanhas/produtos-por-marca?marca=${encodeURIComponent(selectedMarca)}`)
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          toast.error("Nenhum produto encontrado para esta marca.");
          return;
        }
        const newProducts = data.filter(
          (p: any) => !selectedProducts.some(sp => sp.id === p.id)
        );
        if (newProducts.length === 0) {
          toast.info("Todos os produtos desta marca já estão na lista.");
          return;
        }
        setSelectedProducts(prev => [...prev, ...newProducts]);
        toast.success(`${newProducts.length} produto(s) da marca "${selectedMarca}" adicionados!`);
      })
      .catch(err => {
        console.error(err);
        toast.error("Erro ao buscar produtos da marca.");
      })
      .finally(() => setIsLoadingMarcaProducts(false));
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      let url = `/api/campanhas/produtos-busca?q=${encodeURIComponent(searchQuery)}`;
      if (selectedMarca) {
        url += `&marca=${encodeURIComponent(selectedMarca)}`;
      }
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Erro na busca de produtos:", err))
        .finally(() => setIsSearching(false));
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedMarca]);

  useEffect(() => {
    setIsLoadingRanking(true);
    let url = `/api/campanhas/ranking?idEmpresa=${selectedStore === 'todas' ? 'todas' : selectedStore}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.operadores && data.operadores.length > 0) {
          setRankingOperadores(data.operadores);
        }
        if (data.pdvs && data.pdvs.length > 0) {
          setRankingPDVs(data.pdvs);
        }
      })
      .catch(err => console.error("Erro ao buscar ranking de campanhas:", err))
      .finally(() => setIsLoadingRanking(false));
  }, [selectedStore, globalStartDate, globalEndDate]);

  const [isExporting, setIsExporting] = useState(false);

  const exportAsImage = async () => {
    const element = document.getElementById("ranking-print-area");
    if (!element) return;
    setIsExporting(true);
    const toastId = toast.loading("Convertendo ranking para imagem...");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const canvas = await html2canvas(element, {
        backgroundColor: "#0b0f19",
        scale: 2,
        useCORS: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = "ranking-operadores.jpg";
      link.href = dataUrl;
      link.click();
      toast.success("Imagem do ranking baixada com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao exportar ranking como imagem: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsPDF = async () => {
    const element = document.getElementById("ranking-print-area");
    if (!element) return;
    setIsExporting(true);
    const toastId = toast.loading("Gerando PDF do ranking...");
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");
      
      const canvas = await html2canvas(element, {
        backgroundColor: "#0b0f19",
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      const width = canvas.width;
      const height = canvas.height;
      
      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "px",
        format: [width, height]
      });
      
      pdf.addImage(imgData, "JPEG", 0, 0, width, height);
      pdf.save("ranking-operadores.pdf");
      toast.success("PDF do ranking baixado com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao exportar ranking como PDF: ${err instanceof Error ? err.message : String(err)}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Stats Dashboard
  const chartColors = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#f57c00", "#10b981"];

  // Funções Utilitárias
  const getBadgeColor = (status: string) => {
    switch (status) {
      case "Ativa": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Pausada": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Encerrada": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getMedalColor = (pos: number) => {
    if (pos === 1) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (pos === 2) return "text-slate-300 bg-slate-300/10 border-slate-300/30";
    if (pos === 3) return "text-amber-600 bg-amber-600/10 border-amber-600/30";
    return "text-slate-500 bg-slate-800 border-white/5";
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4 pb-12">
      {/* Header e Menu Interno do Módulo */}
      <div className="flex flex-col gap-4 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-[image:var(--gradient-primary)] grid place-items-center glow shadow-lg">
              <Trophy className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif text-slate-100 tracking-tight flex items-center gap-2">
                Campanhas de Incentivo
                <span className="text-[10px] font-mono bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30 uppercase tracking-wider">Premium SaaS</span>
              </h2>
              <p className="text-xs text-slate-400">Engajamento, gamificação e alavancagem de vendas para sua equipe</p>
            </div>
          </div>
          {activeTab === "campanhas" && !isCreating && (
            <button 
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Campanha
            </button>
          )}
        </div>

        <div className="flex border-b border-white/10 gap-6 overflow-x-auto pb-1 mt-2">
          <button 
            onClick={() => {setActiveTab("dashboard"); setIsCreating(false);}}
            className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${activeTab === "dashboard" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab("campanhas")}
            className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${activeTab === "campanhas" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Target className="w-4 h-4" />
            Campanhas
          </button>
          <button 
            onClick={() => {setActiveTab("ranking"); setIsCreating(false);}}
            className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${activeTab === "ranking" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Medal className="w-4 h-4" />
            Ranking
          </button>
          <button 
            onClick={() => {setActiveTab("premiacoes"); setIsCreating(false);}}
            className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${activeTab === "premiacoes" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <Gift className="w-4 h-4" />
            Premiações
          </button>
          <button 
            onClick={() => {setActiveTab("simulador"); setIsCreating(false);}}
            className={`pb-3 font-serif font-bold text-[15px] border-b-2 transition shrink-0 flex items-center gap-2 ${activeTab === "simulador" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
          >
            <MonitorPlay className="w-4 h-4" />
            Visão do Operador (PDV)
          </button>
        </div>
      </div>

      {/* --- DASHBOARD --- */}
      {activeTab === "dashboard" && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Alertas de IA */}
          <div className="glass-strong rounded-2xl p-4 flex items-start gap-3 border-l-2 border-indigo-500 bg-gradient-to-r from-indigo-500/10 to-transparent">
            <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-indigo-300">Insights da IA</span>
              <span className="text-xs text-slate-300">
                O produto <strong>Monster Energy</strong> teve um aumento de <strong>32% nas vendas</strong> impulsionado pela campanha atual.
                {rankingOperadores.length > 0 && (
                  <span> O(a) operador(a) <strong className="text-white">{rankingOperadores[0].nome}</strong> lidera as vendas gerais no <strong>{rankingOperadores[0].pdv || "N/A"}</strong>.</span>
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/30 transition">
              <span className="text-[10px] text-slate-400 tracking-wider">CAMPANHAS ATIVAS</span>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-serif font-bold text-emerald-400">2</h3>
                <Target className="w-6 h-6 text-emerald-500/30" />
              </div>
            </div>
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between hover:border-primary/30 transition">
              <span className="text-[10px] text-slate-400 tracking-wider">PONTOS GERADOS</span>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-serif font-bold text-primary">
                  {rankingOperadores.reduce((acc, curr) => acc + (curr.pontos || 0), 0).toLocaleString('pt-BR')}
                </h3>
                <Award className="w-6 h-6 text-primary/30" />
              </div>
            </div>
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-500/30 transition">
              <span className="text-[10px] text-slate-400 tracking-wider">PRODUTOS VENDIDOS</span>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-serif font-bold text-indigo-400">
                  {rankingOperadores.reduce((acc, curr) => acc + (curr.vendidos || 0), 0).toLocaleString('pt-BR')}
                </h3>
                <Package className="w-6 h-6 text-indigo-500/30" />
              </div>
            </div>
            <div className="glass-strong rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/30 transition">
              <span className="text-[10px] text-slate-400 tracking-wider">OPERADORES ATIVOS</span>
              <div className="flex items-end justify-between mt-2">
                <h3 className="text-3xl font-serif font-bold text-amber-400">
                  {rankingOperadores.length}
                </h3>
                <Users className="w-6 h-6 text-amber-500/30" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-strong rounded-2xl p-6 lg:col-span-2">
              <h3 className="font-serif text-sm font-bold text-slate-200 mb-4">Evolução de Pontuação (Diária)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockEvolucaoDiaria}>
                    <defs>
                      <linearGradient id="colorPontos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="data" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    />
                    <Area type="monotone" dataKey="pontos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPontos)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-strong rounded-2xl p-6 flex flex-col gap-4">
              <h3 className="font-serif text-sm font-bold text-slate-200">Top 3 Operadores</h3>
              <div className="flex flex-col gap-3">
                {rankingOperadores.slice(0,3).map((op, i) => (
                  <div key={op.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-full border grid place-items-center font-bold text-xs ${getMedalColor(i + 1)}`}>
                        {i + 1}º
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{op.nome}</div>
                        <div className="text-[10px] text-slate-400">{op.loja}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-primary">{op.pontos}</div>
                      <div className="text-[9px] text-slate-500">pontos</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CAMPANHAS --- */}
      {activeTab === "campanhas" && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {!isCreating ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campanhasList.map(c => (
                <div key={c.id} className="glass-strong rounded-2xl p-5 hover:border-primary/20 transition flex flex-col gap-4 group relative">
                  <div className="flex items-start justify-between">
                    <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getBadgeColor(c.status)}`}>
                      {c.status}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(c)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-blue-400 transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded text-slate-400 hover:text-red-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-slate-100 group-hover:text-primary transition">{c.nome}</h3>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{c.obj}</p>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/10 flex items-center gap-4 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {new Date(c.inicio).toLocaleDateString("pt-BR")} a {new Date(c.fim).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
              
              <div 
                onClick={() => {
                  setEditingId(null);
                  setFormNome("");
                  setFormInicio("");
                  setFormFim("");
                  setFormObj("");
                  setSelectedProducts([]);
                  setSelectedMarca("");
                  setIsCreating(true);
                }}
                className="rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 transition flex flex-col items-center justify-center p-8 gap-3 cursor-pointer min-h-[200px]"
              >
                <div className="size-12 rounded-full bg-white/5 grid place-items-center text-slate-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-slate-200 text-sm">Criar Nova Campanha</h4>
                  <p className="text-xs text-slate-500 mt-1">Configure regras e produtos.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-6 border-l-4 border-l-primary flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-100">{editingId ? "Editar Campanha" : "Cadastro de Campanha"}</h3>
                  <p className="text-xs text-slate-400">Configure as regras de pontuação e selecione os produtos alvo.</p>
                </div>
                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form Col 1 */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nome da Campanha</label>
                    <input 
                      type="text" 
                      value={formNome}
                      onChange={e => setFormNome(e.target.value)}
                      placeholder="Ex: Festival Verão" 
                      className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Período Inicial</label>
                      <input 
                        type="date" 
                        value={formInicio}
                        onChange={e => setFormInicio(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200 [color-scheme:dark]" 
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-300">Período Final</label>
                      <input 
                        type="date" 
                        value={formFim}
                        onChange={e => setFormFim(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-slate-200 [color-scheme:dark]" 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">Objetivo da Campanha</label>
                    <textarea 
                      rows={3} 
                      value={formObj}
                      onChange={e => setFormObj(e.target.value)}
                      placeholder="Descrição motivacional..." 
                      className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" 
                    />
                  </div>
                  
                  {/* Regras de Pontuação */}
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5 mt-2">
                    <h4 className="text-xs font-bold text-primary flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4" /> Regras de Apuração
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                        <span className="text-slate-300">Venda</span>
                        <span className="font-mono text-emerald-400 font-bold">+1 pt</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                        <span className="text-slate-300">Devolução</span>
                        <span className="font-mono text-red-400 font-bold">-1 pt</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                        <span className="text-slate-300">Cancelamento</span>
                        <span className="font-mono text-amber-400 font-bold">-1 pt</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                        <span className="text-slate-300">Estorno</span>
                        <span className="font-mono text-red-400 font-bold">-1 pt</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Filtro por Marca */}
                  <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4" /> Filtrar por Marca
                    </h4>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <div 
                          onClick={() => setShowMarcaDropdown(!showMarcaDropdown)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:border-indigo-500/30 transition"
                        >
                          <span className={selectedMarca ? "text-slate-200" : "text-slate-500"}>
                            {selectedMarca || "Selecione uma marca..."}
                          </span>
                          <div className="flex items-center gap-1">
                            {selectedMarca && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedMarca(""); setMarcaFilter(""); }}
                                className="p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-red-400 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            {isLoadingMarcas 
                              ? <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                              : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition ${showMarcaDropdown ? 'rotate-180' : ''}`} />
                            }
                          </div>
                        </div>
                        {showMarcaDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl z-[60] flex flex-col overflow-hidden">
                            <div className="p-2 border-b border-white/10">
                              <div className="relative">
                                <Filter className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                                <input
                                  type="text"
                                  value={marcaFilter}
                                  onChange={(e) => setMarcaFilter(e.target.value)}
                                  placeholder="Filtrar marcas..."
                                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto p-1">
                              {marcasList
                                .filter(m => m.toLowerCase().includes(marcaFilter.toLowerCase()))
                                .slice(0, 100)
                                .map(m => (
                                  <div
                                    key={m}
                                    onClick={() => {
                                      setSelectedMarca(m);
                                      setShowMarcaDropdown(false);
                                      setMarcaFilter("");
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer transition ${
                                      selectedMarca === m 
                                        ? 'bg-indigo-500/20 text-indigo-300 font-bold' 
                                        : 'text-slate-300 hover:bg-white/5'
                                    }`}
                                  >
                                    {m}
                                  </div>
                                ))
                              }
                              {marcasList.filter(m => m.toLowerCase().includes(marcaFilter.toLowerCase())).length === 0 && (
                                <div className="px-3 py-3 text-xs text-slate-500 text-center">Nenhuma marca encontrada</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={handleAddAllFromBrand}
                        disabled={!selectedMarca || isLoadingMarcaProducts}
                        className="px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isLoadingMarcaProducts 
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Plus className="w-3.5 h-3.5" />
                        }
                        Adicionar Todos
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-xs font-semibold text-slate-300 flex justify-between">
                      Produtos Participantes
                      <span className="text-primary font-mono bg-primary/10 px-1.5 rounded">{selectedProducts.length} itens</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={selectedMarca ? `Buscar em "${selectedMarca}"...` : "Buscar por código, EAN ou nome..."}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-primary" 
                      />
                      {isSearching && <Loader2 className="w-4 h-4 absolute right-3 top-2.5 text-primary animate-spin" />}
                    </div>

                    {/* Resultados da Busca */}
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 flex flex-col gap-1">
                        {searchResults.map(res => (
                          <div 
                            key={res.id} 
                            onClick={() => {
                              if (selectedProducts.some(p => p.id === res.id)) {
                                toast.error("Produto já selecionado!");
                                return;
                              }
                              setSelectedProducts([...selectedProducts, res]);
                              setSearchQuery("");
                              setSearchResults([]);
                            }}
                            className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition"
                          >
                            <Package className="w-4 h-4 text-primary" />
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-200">{res.nome}</span>
                              <span className="text-[10px] text-slate-500 font-mono">EAN: {res.ean || 'N/A'} | ID: {res.id}{res.marca ? ` | ${res.marca}` : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 bg-black/20 border border-white/5 rounded-xl p-3 flex flex-col gap-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                    {selectedProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-slate-500 opacity-50">
                        <Package className="w-8 h-8 mb-2" />
                        <p className="text-xs">Nenhum produto selecionado</p>
                        <p className="text-[10px] mt-1">Use a busca ou selecione uma marca acima</p>
                      </div>
                    ) : (
                      <>
                        {selectedProducts.length > 10 && (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg mb-1">
                            <span className="text-[10px] text-indigo-300 font-bold flex items-center gap-1">
                              <Tag className="w-3 h-3" /> {selectedProducts.length} produtos adicionados via marca
                            </span>
                            <button
                              onClick={() => {
                                if (confirm(`Remover todos os ${selectedProducts.length} produtos?`)) {
                                  setSelectedProducts([]);
                                }
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 font-bold transition"
                            >
                              Limpar tudo
                            </button>
                          </div>
                        )}
                        {selectedProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-transparent hover:border-red-500/20 transition group">
                            <div className="flex items-center gap-3">
                              <div className="size-6 bg-primary/10 rounded flex items-center justify-center text-primary">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-200">{p.nome}</div>
                                <div className="text-[10px] text-slate-500 font-mono">EAN: {p.ean || 'N/A'}{p.marca ? ` | ${p.marca}` : ''}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => setSelectedProducts(selectedProducts.filter(item => item.id !== p.id))}
                              className="text-slate-400 hover:text-red-400 p-1 bg-black/20 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveCampaign} 
                  className="px-6 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Campanha
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- RANKING --- */}
      {activeTab === "ranking" && (
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div id="ranking-print-area" className="glass-strong rounded-2xl p-6 flex-1 flex flex-col border border-primary/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Medal className="w-6 h-6 text-yellow-400" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-100">Ranking de Operadores</h3>
                  <p className="text-[10px] text-slate-400">Pontuação global em tempo real (Fórmula: Vendidos - Devolvidos - Cancelados)</p>
                </div>
              </div>
              <div className="flex items-center gap-2" data-html2canvas-ignore="true">
                <button 
                  onClick={exportAsPDF}
                  disabled={isExporting || rankingOperadores.length === 0}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-[10px] font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  PDF
                </button>
                <button 
                  onClick={exportAsImage}
                  disabled={isExporting || rankingOperadores.length === 0}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg border border-white/10 text-[10px] font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Image className="w-3.5 h-3.5 text-primary" />
                  Imagem
                </button>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20 animate-pulse">Ao vivo</span>
              </div>
            </div>

            {isLoadingRanking ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-semibold">Carregando dados das lojas em tempo real...</p>
                <p className="text-xs text-slate-500">Isolando os operadores, aguarde...</p>
              </div>
            ) : rankingOperadores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Trophy className="w-10 h-10 text-slate-600 mb-4" />
                <p className="text-sm font-semibold">Nenhum operador encontrado no período.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
                {Object.entries(
                  rankingOperadores.reduce((acc: any, op: any) => {
                    const store = op.loja || "Sem Loja";
                    if (!acc[store]) acc[store] = [];
                    acc[store].push(op);
                    return acc;
                  }, {})
                ).map(([storeName, ops]: [string, any]) => {
                  // Sort operators inside store group by points descending
                  const sortedOps = [...ops].sort((a, b) => b.pontos - a.pontos);
                  
                  return (
                    <div key={storeName} className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-1">
                        <span className="font-serif font-bold text-sm text-slate-200">{storeName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{sortedOps.length} operadores</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[9px] opacity-75">
                              <th className="py-2 px-1 w-10 text-center">Pos</th>
                              <th className="py-2 px-1">Operador</th>
                              <th className="py-2 px-1 text-center text-emerald-400 w-12" title="Vendidos">Vend</th>
                              <th className="py-2 px-1 text-right w-16">Pontos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedOps.map((op, idx) => (
                              <tr key={op.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-2 px-1 text-center">
                                  <div className={`size-5 mx-auto rounded-full border grid place-items-center font-bold text-[9px] ${getMedalColor(idx + 1)}`}>
                                    {idx + 1}
                                  </div>
                                </td>
                                <td className="py-2 px-1 font-semibold text-slate-200 truncate max-w-[120px]" title={op.nome}>{op.nome}</td>
                                <td className="py-2 px-1 text-center text-emerald-400 font-mono">{op.vendidos}</td>
                                <td className="py-2 px-1 text-right font-bold text-primary font-mono">{op.pontos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 flex flex-col gap-4">
            <h3 className="font-serif font-bold text-slate-200">Ranking por PDV</h3>
            {isLoadingRanking ? (
              <div className="flex flex-col gap-3">
                <div className="h-20 bg-white/5 rounded-2xl animate-pulse"></div>
                <div className="h-20 bg-white/5 rounded-2xl animate-pulse"></div>
                <div className="h-20 bg-white/5 rounded-2xl animate-pulse"></div>
              </div>
            ) : rankingPDVs.map((pdv, i) => (
              <div key={i} className="glass-strong rounded-2xl p-4 flex items-center justify-between border border-white/5 hover:border-primary/20 transition">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <MonitorPlay className="w-3.5 h-3.5 text-indigo-400" />
                      {pdv.pdv}
                    </span>
                    <span className="text-[10px] text-slate-400">{pdv.loja}</span>
                  </div>
                  <div className="text-sm font-bold font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                    {pdv.pontos} pts
                  </div>
                </div>
              ))}
            </div>
        </div>
      )}

      {/* --- PREMIAÇÕES --- */}
      {activeTab === "premiacoes" && (
        <div className="glass-strong rounded-2xl p-8 max-w-3xl mx-auto flex flex-col gap-6 animate-in zoom-in-95 duration-500">
          <div className="text-center">
            <Gift className="w-12 h-12 text-pink-500 mx-auto mb-3" />
            <h3 className="font-serif text-2xl font-bold text-slate-100">Configuração de Premiação</h3>
            <p className="text-xs text-slate-400 mt-1">Defina recompensas para motivar sua equipe e impulsionar vendas.</p>
          </div>

          <div className="flex flex-col gap-4 mt-4">
            <div className="bg-gradient-to-r from-yellow-500/20 to-transparent p-4 rounded-xl border border-yellow-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-yellow-500/20 text-yellow-400 grid place-items-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-yellow-400">1º Lugar Geral</h4>
                  <p className="text-[10px] text-slate-400">Ao final da campanha ativa</p>
                </div>
              </div>
              <input type="text" defaultValue="R$ 500,00" className="w-32 bg-black/50 border border-yellow-500/30 rounded-lg px-3 py-2 text-sm font-mono text-yellow-400 text-right focus:outline-none focus:border-yellow-400" />
            </div>

            <div className="bg-gradient-to-r from-slate-300/10 to-transparent p-4 rounded-xl border border-slate-300/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-slate-300/10 text-slate-300 grid place-items-center">
                  <Medal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-300">2º Lugar Geral</h4>
                </div>
              </div>
              <input type="text" defaultValue="R$ 300,00" className="w-32 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 text-right focus:outline-none focus:border-primary" />
            </div>

            <div className="bg-gradient-to-r from-amber-600/10 to-transparent p-4 rounded-xl border border-amber-600/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-amber-600/10 text-amber-500 grid place-items-center">
                  <Medal className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-500">3º Lugar Geral</h4>
                </div>
              </div>
              <input type="text" defaultValue="R$ 200,00" className="w-32 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 text-right focus:outline-none focus:border-primary" />
            </div>
            
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 grid place-items-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-400">Destaque Evolução</h4>
                  <p className="text-[10px] text-slate-400">Maior crescimento % na semana</p>
                </div>
              </div>
              <input type="text" defaultValue="R$ 100,00" className="w-32 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 text-right focus:outline-none focus:border-primary" />
            </div>
          </div>
          
          <button 
            onClick={() => toast.success("Premiações atualizadas!")}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition mt-4"
          >
            Salvar Configurações de Prêmio
          </button>
        </div>
      )}

      {/* --- SIMULADOR TELA DO OPERADOR --- */}
      {activeTab === "simulador" && (
        <div className="flex justify-center animate-in fade-in duration-500">
          <div className="w-[400px] h-[600px] bg-slate-900 border-[8px] border-slate-950 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
            {/* Top Bar Mobile */}
            <div className="bg-slate-950 h-6 w-full flex justify-center items-center">
              <div className="w-24 h-4 bg-black rounded-b-xl"></div>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto bg-gradient-to-b from-indigo-900/50 to-slate-900 relative">
              {/* Header PDV App */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white">PDV CyberTech</h3>
                  <p className="text-[10px] text-indigo-300">Caixa Livre • Maria Joana</p>
                </div>
                <div className="size-8 bg-emerald-500/20 rounded-full grid place-items-center border border-emerald-500/30">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              {/* Widget Campanha */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] -mr-10 -mt-10 rounded-full"></div>
                
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Minha Campanha</span>
                </div>

                <div className="flex items-end justify-between relative z-10 mb-4">
                  <div>
                    <span className="text-[10px] text-slate-300 block mb-1">PONTOS ACUMULADOS</span>
                    <h2 className="text-4xl font-bold font-mono text-white">488</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-300 block mb-1">POSIÇÃO ATUAL</span>
                    <div className="text-xl font-bold text-yellow-400 flex items-center justify-end gap-1">
                      1º <Star className="w-4 h-4 fill-yellow-400" />
                    </div>
                  </div>
                </div>

                {/* Meta Progress */}
                <div className="relative z-10 mt-4">
                  <div className="flex justify-between text-[10px] text-slate-300 mb-1.5 font-semibold">
                    <span>Meta: 500 pt</span>
                    <span className="text-emerald-400">Faltam 12 pt</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-400 w-[97%] rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas PDV Simulação */}
              <h4 className="text-[10px] text-slate-400 uppercase font-bold mt-6 mb-3 tracking-wider">Ações de Venda</h4>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => toast.success("Produto lido! +1 Ponto", { icon: '🎯' })}
                  className="bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition"
                >
                  <Search className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-100">Bipar Produto</span>
                </button>
                <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition">
                  <ShoppingBag className="w-6 h-6 text-slate-300" />
                  <span className="text-xs font-bold text-slate-300">Finalizar</span>
                </button>
              </div>

              {/* Produtos Sugeridos IA */}
              <div className="mt-6 bg-black/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Ofereça Agora</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200">Coca-Cola 350ml</span>
                  <span className="text-emerald-400 font-bold">+1 PT</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">Diga: "Aceita uma coca bem gelada para acompanhar?"</p>
              </div>

            </div>
          </div>
          
          <div className="ml-8 self-center max-w-sm hidden lg:flex flex-col gap-4 text-slate-400">
            <h3 className="text-lg font-serif font-bold text-emerald-400 flex items-center gap-2">
              <MonitorPlay className="w-5 h-5" /> Diferencial CyberTech
            </h3>
            <p className="text-sm">
              O operador de caixa acompanha seu progresso <strong>em tempo real</strong> na mesma tela do PDV.
            </p>
            <p className="text-sm">
              A <strong>Inteligência Artificial</strong> sugere abordagens de venda casada baseada nos produtos da campanha, incentivando o operador a fechar mais metas.
            </p>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl mt-4">
              <span className="text-xs text-primary font-bold">✓ Maior engajamento</span><br/>
              <span className="text-xs text-primary font-bold">✓ Venda por impulso</span><br/>
              <span className="text-xs text-primary font-bold">✓ Redução de estoque parado</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
