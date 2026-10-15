import { useState } from "react";
import { Search, PackageOpen, DollarSign, Calendar, MapPin, FileText, User, Repeat } from "lucide-react";
import { toast } from "sonner";

export function Estoque() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Loja Virtual integration states
  const [siteActive, setSiteActive] = useState(false);
  const [sitePrice, setSitePrice] = useState("");
  const [siteDesc, setSiteDesc] = useState("");
  const [siteCat, setSiteCat] = useState("🎁 Presentes");
  const [siteEmoji, setSiteEmoji] = useState("📦");
  const [siteBadge, setSiteBadge] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchSiteConfig = async (id: number) => {
    try {
      const res = await fetch(`/api/produtos/site-config/${id}`);
      if (res.ok) {
        const config = await res.json();
        setSiteActive(config.active || false);
        setSitePrice(config.price !== undefined ? String(config.price) : "");
        setSiteDesc(config.desc || "");
        setSiteCat(config.cat || "🎁 Presentes");
        setSiteEmoji(config.emoji || "📦");
        setSiteBadge(config.badge || "");
      }
    } catch (e) {
      console.error("Erro ao carregar configuracoes do site", e);
    }
  };

  const handleSaveSiteConfig = async (id: number, name: string) => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/produtos/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idProduto: id,
          active: siteActive,
          name: name,
          price: parseFloat(sitePrice) || 0,
          desc: siteDesc,
          cat: siteCat,
          emoji: siteEmoji,
          badge: siteBadge
        })
      });
      if (res.ok) {
        toast.success("Configurações da loja virtual salvas com sucesso!");
      } else {
        toast.error("Falha ao salvar configurações.");
      }
    } catch (err) {
      toast.error("Erro de conexão ao salvar configurações.");
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchEstoque = async (codigoId: string) => {
    setLoading(true);
    setData(null);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/estoque?codigo=${encodeURIComponent(codigoId)}`);
      const json = await res.json();

      if (json.error) {
        toast.error(json.error);
      } else {
        setData(json);
        toast.success(`Estoque encontrado para: ${json.produto.DESCRICAO}`);
      }
    } catch (err) {
      toast.error("Erro ao conectar com a API de estoque.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setData(null);
    setSearchResults([]);

    try {
      const searchRes = await fetch(`/api/rastreamento-busca?query=${encodeURIComponent(query)}`);
      const searchData = await searchRes.json();

      if (searchData.type === 'produto') {
        // Achou um produto exato
        await fetchEstoque(searchData.idProduto);
      } else if ((searchData.type === 'busca' || searchData.type === 'nota' || searchData.type === 'pedido') && searchData.produtos && searchData.produtos.length > 0) {
        if (searchData.produtos.length === 1) {
           await fetchEstoque(searchData.produtos[0].IDSUBPRODUTO);
        } else {
           setSearchResults(searchData.produtos);
           toast.info(`${searchData.produtos.length} produtos encontrados. Selecione um abaixo.`);
        }
      } else {
        // Fallback para buscar direto se a busca genérica não funcionar
        await fetchEstoque(query);
      }
    } catch (err) {
      // Se falhar a busca genérica, tenta a direta
      await fetchEstoque(query);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => {
    if (!d) return "Sem registro";
    const date = new Date(d);
    // Para resolver fuso de datas em string (YYYY-MM-DD), add a hora pro meio-dia
    return new Date(date.getTime() + 12 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto mt-4 px-4 animate-in fade-in duration-300">
      
      {/* Header & Busca */}
      <div className="glass-strong rounded-2xl p-6 flex flex-col gap-5">
        <div>
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2">
            <PackageOpen className="text-primary w-6 h-6" /> Posição de Estoque por Loja
          </h2>
          <p className="text-sm text-slate-400">
            Digite o Código do Produto (EAN ou ID Interno) para visualizar o saldo em todas as filiais.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Código de Barras ou ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Ex: COCA COLA, 506095 ou 7891234567890" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary font-mono text-slate-200 transition"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleSearch}
              disabled={loading}
              className="w-full md:w-auto bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-xl transition hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? "Buscando..." : "Buscar Estoque"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Resultados da Busca */}
      {searchResults.length > 0 && !data && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <h3 className="text-sm font-semibold text-slate-300 px-2">Selecione o Produto:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((prod: any) => (
              <div 
                key={prod.IDSUBPRODUTO}
                onClick={() => fetchEstoque(prod.IDSUBPRODUTO)}
                className="glass-strong rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] hover:bg-white/5 border border-white/5"
              >
                <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded w-fit">
                  CÓD: {prod.IDSUBPRODUTO}
                </span>
                <span className="text-sm font-semibold text-white line-clamp-2">{prod.DESCRICAO}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados */}
      {data && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
          
          {/* Header do Produto */}
          <div className="bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 rounded-2xl p-6 flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded w-fit">
                CÓD: {data.produto.IDSUBPRODUTO}
              </span>
              <h1 className="text-2xl font-bold text-white font-serif tracking-wide">{data.produto.DESCRICAO}</h1>
            </div>
            <div className="hidden md:flex bg-black/40 px-4 py-3 rounded-xl border border-white/5 items-center gap-4">
              {data.precoOnline > 0 && (
                <>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 uppercase">Preço Site (Online)</span>
                    <span className="font-bold text-xl text-cyan-400">
                      {fmtCurrency(data.precoOnline)}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/10 mx-2"></div>
                </>
              )}
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 uppercase">Custo Total</span>
                <span className="font-bold text-xl text-rose-400">
                  {fmtCurrency(data.estoque.reduce((acc: number, cur: any) => acc + ((cur.quantidade > 0 ? cur.quantidade : 0) * cur.custoMedio), 0))}
                </span>
              </div>
              <div className="w-px h-8 bg-white/10 mx-2"></div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-slate-400 uppercase">Estoque Total</span>
                <span className="font-bold text-xl text-emerald-400">
                  {data.estoque.reduce((acc: number, cur: any) => acc + cur.quantidade, 0).toLocaleString("pt-BR")} un
                </span>
              </div>
            </div>
          </div>

          {/* Grid de Lojas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(data.estoque.reduce((acc: any, cur: any) => {
               if (!acc[cur.idEmpresa]) {
                 acc[cur.idEmpresa] = {
                   idEmpresa: cur.idEmpresa,
                   loja: cur.loja,
                   quantidadeTotal: 0,
                   custoTotalLoja: 0,
                   custoMedioBase: cur.custoMedio,
                   precoVendaLoja: cur.precoVenda,
                   precoPromoLoja: cur.precoPromo,
                   dataUltimaVenda: cur.dataUltimaVenda,
                   locais: []
                 };
               }
               acc[cur.idEmpresa].quantidadeTotal += cur.quantidade;
               acc[cur.idEmpresa].custoTotalLoja += (cur.quantidade > 0 ? cur.quantidade : 0) * cur.custoMedio;
               
               if (cur.precoVenda && !acc[cur.idEmpresa].precoVendaLoja) {
                 acc[cur.idEmpresa].precoVendaLoja = cur.precoVenda;
               }
               if (cur.precoPromo && !acc[cur.idEmpresa].precoPromoLoja) {
                 acc[cur.idEmpresa].precoPromoLoja = cur.precoPromo;
               }

               if (cur.dataUltimaVenda && (!acc[cur.idEmpresa].dataUltimaVenda || new Date(cur.dataUltimaVenda) > new Date(acc[cur.idEmpresa].dataUltimaVenda))) {
                   acc[cur.idEmpresa].dataUltimaVenda = cur.dataUltimaVenda;
               }
               
               acc[cur.idEmpresa].locais.push({
                 idLocal: cur.idLocal,
                 nomeLocal: cur.nomeLocal || 'Local Padrão',
                 quantidade: cur.quantidade
               });
               return acc;
            }, {})).map((store: any) => {
               const semEstoque = store.quantidadeTotal <= 0;
               const info = data.infoAdicionalPorLoja?.[store.idEmpresa] || null;

               return (
                 <div 
                   key={store.idEmpresa} 
                   className={`glass-strong rounded-2xl p-5 flex flex-col gap-4 border transition-all hover:scale-[1.01] ${semEstoque ? 'border-white/5 opacity-80' : 'border-primary/20'}`}
                 >
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-2 text-slate-300 font-semibold truncate">
                       <MapPin className={`w-4 h-4 ${semEstoque ? 'text-slate-500' : 'text-primary'}`} />
                       <span className="truncate" title={store.loja}>{store.loja}</span>
                     </div>
                     <span className="text-xs text-slate-500 font-mono bg-white/5 px-2 py-0.5 rounded">Lj {store.idEmpresa}</span>
                   </div>

                   <div className="flex items-baseline gap-2 mt-2">
                     <span className={`text-4xl font-bold font-mono ${semEstoque ? 'text-slate-500' : 'text-white'}`}>
                       {Number(store.quantidadeTotal).toLocaleString("pt-BR")}
                     </span>
                     <span className="text-sm text-slate-400">unidades totais</span>
                   </div>

                   <div className="flex flex-col gap-2 mt-1 bg-black/20 p-3 rounded-xl border border-white/5">
                     <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Locais de Estoque</span>
                     {store.locais.map((l: any) => (
                       <div key={l.idLocal} className="flex items-center justify-between">
                         <span className="text-xs text-slate-300 truncate mr-2" title={l.nomeLocal}>{l.nomeLocal}</span>
                         <span className="text-xs font-mono font-semibold text-white whitespace-nowrap">
                           {Number(l.quantidade).toLocaleString("pt-BR")} <span className="text-[10px] text-slate-500">un</span>
                         </span>
                       </div>
                     ))}
                   </div>

                   <div className="flex items-center gap-2 mt-1">
                     <span className="text-xs text-slate-500 bg-black/20 px-2 py-1 rounded">
                       Custo Total: <span className="font-semibold text-slate-300">{fmtCurrency(store.custoTotalLoja)}</span>
                     </span>
                   </div>

                   <div className="grid grid-cols-3 gap-1 mt-2 border-t border-white/5 pt-4">
                     <div className="flex flex-col gap-1">
                       <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-0.5">
                         <DollarSign className="w-3 h-3"/> Custo Médio
                       </span>
                       <span className="text-xs font-semibold text-slate-300 truncate">
                         {fmtCurrency(store.custoMedioBase)}
                       </span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3 text-emerald-400"/> Preço Venda
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 truncate flex flex-col gap-0.5">
                          <div>
                            {fmtCurrency(store.precoVendaLoja || data.precoOnline || 0)}
                            {(!store.precoVendaLoja && data.precoOnline > 0) && (
                              <span className="text-[8px] text-cyan-400 ml-1 font-normal">(Site)</span>
                            )}
                          </div>
                          {store.precoPromoLoja > 0 && (
                            <span className="text-[9px] text-orange-400 font-bold bg-orange-400/10 px-1 py-0.5 rounded w-fit">
                              Promo: {fmtCurrency(store.precoPromoLoja)}
                            </span>
                          )}
                          {(() => {
                            const preco = store.precoVendaLoja || data.precoOnline || 0;
                            const custo = store.custoMedioBase || 0;
                            const margem = preco > 0 ? ((preco - custo) / preco) * 100 : 0;
                            return preco > 0 && custo > 0 ? (
                              <span className="text-[9px] text-slate-400 block font-normal mt-0.5">
                                Margem: <span className={margem >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{margem.toFixed(1)}%</span>
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </div>
                     <div className="flex flex-col gap-1">
                       <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-0.5">
                         <Calendar className="w-3 h-3"/> Última Venda
                       </span>
                       <span className="text-xs font-semibold text-slate-300 truncate">
                         {fmtDate(store.dataUltimaVenda)}
                       </span>
                     </div>
                   </div>

                                       {info && (
                     <div className="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
                       <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Últimas Entradas de Nota</span>
                       
                       <div className="flex flex-col gap-2">
                         {info.ultimasEntradas?.map((ent: any, idx: number) => (
                           <div key={idx} className="grid grid-cols-3 gap-2 text-xs items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                             <div className="flex flex-col gap-0.5">
                               <span className="text-slate-300 flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500"/> {fmtDate(ent.data)}</span>
                               <span className="font-mono text-slate-500 text-[10px]">#{ent.numeroNota}</span>
                             </div>
                             <div className="flex flex-col text-slate-400 truncate gap-0.5" title={ent.usuario}>
                               <span className="text-[10px] text-slate-500 flex items-center gap-1"><User className="w-3 h-3"/> Usuário</span>
                               <span className="truncate">{ent.usuario}</span>
                             </div>
                             <div className="flex flex-col items-end gap-0.5">
                               <span className="text-[10px] text-slate-500">Qtd</span>
                               <span className="font-mono font-bold text-emerald-400">{Number(ent.quantidade).toLocaleString("pt-BR")} <span className="text-[9px] text-slate-500 font-normal">un</span></span>
                             </div>
                           </div>
                         ))}
                         {(!info.ultimasEntradas || info.ultimasEntradas.length === 0) && (
                           <span className="text-xs text-slate-500 italic">Nenhuma entrada recente</span>
                         )}
                       </div>
<div className="flex flex-col gap-1 mt-2 bg-primary/5 p-2 rounded-lg border border-primary/10">
                        <span className="text-[10px] text-primary/70 font-semibold uppercase tracking-wider flex items-center gap-1"><Repeat className="w-3 h-3"/> Histórico (Compra x Venda)</span>
                        <div className="flex items-center gap-2 justify-between mt-1">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400">Total Comprado</span>
                            <span className="text-xs font-mono font-bold text-emerald-400">{Number(info.totalComprado).toLocaleString("pt-BR")} un</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[10px] text-slate-400">Total Vendido</span>
                            <span className="text-xs font-mono font-bold text-amber-400">{Number(info.totalVendido).toLocaleString("pt-BR")} un</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {data.estoque.length === 0 && (
            <div className="glass-strong rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-3 border border-white/5">
              <PackageOpen className="w-12 h-12 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-400">Nenhum saldo encontrado</h3>
              <p className="text-sm text-slate-500">O produto não possui registros de saldo na tabela de posição atual de estoque.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
