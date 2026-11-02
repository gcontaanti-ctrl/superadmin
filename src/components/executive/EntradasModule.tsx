import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Calendar, Store, Search, Loader2, FileText, Package, Truck, 
  TrendingUp, BarChart3, RefreshCw, X, ChevronRight, Layers, DollarSign,
  User, Clock, ShieldCheck
} from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";

export function EntradasModule({ storeId: globalStoreId }: { storeId?: string }) {
  // Padrão: últimos 15 dias
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 15);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [storeId, setStoreId] = useState<string>(globalStoreId || "todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNota, setSelectedNota] = useState<any>(null);

  // Sincronizar storeId se globalStoreId mudar
  React.useEffect(() => {
    if (globalStoreId) {
      setStoreId(globalStoreId);
    } else {
      setStoreId("todas");
    }
  }, [globalStoreId]);

  // Lista de Empresas / Lojas
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const res = await fetch("/api/empresas");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  // Query das Notas de Entrada
  const { data: notas = [], isLoading: loadingNotas, refetch, isFetching } = useQuery({
    queryKey: ["entradas", dateStart, dateEnd, storeId],
    queryFn: async () => {
      const params = new URLSearchParams({
        data_inicio: dateStart,
        data_fim: dateEnd,
      });
      if (storeId && storeId !== "todas") {
        params.append("id_empresa", storeId);
      }
      const res = await fetch(`/api/relatorios/entradas?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar notas de entrada");
      return res.json();
    }
  });

  // Query dos Itens da Nota Selecionada
  const { data: itensNota = [], isLoading: loadingItens } = useQuery({
    queryKey: ["itensNota", selectedNota?.IDEMPRESA, selectedNota?.IDPLANILHA],
    queryFn: async () => {
      if (!selectedNota) return [];
      const res = await fetch(`/api/notas/${selectedNota.IDEMPRESA}/${selectedNota.IDPLANILHA}/itens`);
      if (!res.ok) throw new Error("Erro ao buscar itens da nota");
      return res.json();
    },
    enabled: !!selectedNota,
  });

  // Atalhos de datas
  const setPresetDate = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setDateStart(start.toISOString().split("T")[0]);
    setDateEnd(end.toISOString().split("T")[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateStart(firstDay.toISOString().split("T")[0]);
    setDateEnd(now.toISOString().split("T")[0]);
  };

  // Helper para formatar data e hora do DB2
  const formatDateTime = (raw: string | null | undefined) => {
    if (!raw) return { data: "-", hora: "" };
    const str = String(raw).trim();
    // Ex: "2026-10-22 14:37:50.000000" ou "2026-10-22T14:37:50"
    const parts = str.split(/[ T]/);
    const datePart = parts[0] ? parts[0].split("-").reverse().join("/") : "-";
    let timePart = "";
    if (parts[1]) {
      timePart = parts[1].slice(0, 5); // "14:37"
    }
    return { data: datePart, hora: timePart };
  };

  // Filtragem local por busca (Fornecedor, Número da Nota ou Nome do Usuário)
  const filteredNotas = useMemo(() => {
    if (!searchTerm.trim()) return notas;
    const term = searchTerm.toLowerCase();
    return notas.filter((n: any) => 
      String(n.NUMNOTA || "").includes(term) ||
      String(n.NOME || "").toLowerCase().includes(term) ||
      String(n.USUARIO_ENTRADA || "").toLowerCase().includes(term) ||
      String(n.IDUSUARIO || "").includes(term) ||
      String(n.SERIENOTA || "").includes(term)
    );
  }, [notas, searchTerm]);

  // Estatísticas / KPIs
  const kpis = useMemo(() => {
    const totalNotas = filteredNotas.length;
    const valorTotal = filteredNotas.reduce((acc: number, n: any) => acc + (Number(n.VALCONTABIL) || 0), 0);
    const ticketMedio = totalNotas > 0 ? valorTotal / totalNotas : 0;
    const fornecedoresUnicos = new Set(filteredNotas.map((n: any) => n.NOME || n.IDCLIFOR)).size;
    const usuariosUnicos = new Set(filteredNotas.map((n: any) => n.USUARIO_ENTRADA || n.IDUSUARIO).filter(Boolean)).size;

    return { totalNotas, valorTotal, ticketMedio, fornecedoresUnicos, usuariosUnicos };
  }, [filteredNotas]);

  // Total do modal de itens
  const totalItensModal = useMemo(() => {
    return itensNota.reduce((acc: number, it: any) => acc + (Number(it.VALTOTAL) || 0), 0);
  }, [itensNota]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 grid place-items-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                Notas de Entrada
              </h1>
              <p className="text-xs text-slate-400">
                Auditoria de Compras, Recebimento, Usuário Responsável e Horário de Lançamento (CISS ERP)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => refetch()} 
            disabled={isFetching}
            variant="outline"
            className="border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 text-xs gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Notas */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total de Notas</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{kpis.totalNotas}</span>
            <span className="text-xs text-slate-400">entradas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Registradas no período selecionado</p>
        </div>

        {/* Volume Financeiro */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Volume Comprado</span>
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-mono">
              {formatBRL(kpis.valorTotal)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Soma do valor contábil das notas</p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Média por Nota</span>
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-white font-mono">
              {formatBRL(kpis.ticketMedio)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ticket médio por nota de entrada</p>
        </div>

        {/* Usuários Operadores */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Operadores Ativos</span>
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{kpis.usuariosUnicos}</span>
            <span className="text-xs text-slate-400">usuários deram entrada</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Identificados nos lançamentos</p>
        </div>
      </div>

      {/* Filtros e Barra de Ações */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-5 backdrop-blur-md space-y-4">
        {/* Linha de Atalhos Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Período:
            </span>
            <button
              onClick={() => setPresetDate(0)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              Hoje
            </button>
            <button
              onClick={() => setPresetDate(7)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              7 Dias
            </button>
            <button
              onClick={() => setPresetDate(15)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              15 Dias
            </button>
            <button
              onClick={() => setPresetDate(30)}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              30 Dias
            </button>
            <button
              onClick={setThisMonth}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition"
            >
              Este Mês
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Exibindo <span className="text-emerald-400 font-bold">{filteredNotas.length}</span> notas
          </div>
        </div>

        {/* Inputs de Data, Loja e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Data Início
            </label>
            <Input 
              type="date" 
              value={dateStart} 
              onChange={e => setDateStart(e.target.value)} 
              className="bg-black/30 border-white/10 text-white text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Data Fim
            </label>
            <Input 
              type="date" 
              value={dateEnd} 
              onChange={e => setDateEnd(e.target.value)} 
              className="bg-black/30 border-white/10 text-white text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Filtrar Loja
            </label>
            <select
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-md text-white text-xs h-9 px-3 focus:outline-none focus:border-emerald-500"
            >
              <option value="todas">Todas as Lojas</option>
              {empresas.map((emp: any) => (
                <option key={emp.IDEMPRESA} value={String(emp.IDEMPRESA)}>
                  Loja {emp.IDEMPRESA} - {emp.NOMEMP || `Empresa ${emp.IDEMPRESA}`}
                </option>
              ))}
              {empresas.length === 0 && (
                <>
                  <option value="1">Loja 1</option>
                  <option value="2">Loja 2</option>
                  <option value="3">Loja 3</option>
                  <option value="4">Loja 4</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Buscar (Fornecedor / Nota / Usuário)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Filtre por fornecedor, nº nota ou nome do usuário..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-black/30 border-white/10 text-white pl-9 text-xs h-9"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Notas */}
      <div className="bg-slate-900/50 border border-white/10 rounded-2xl backdrop-blur-md overflow-hidden">
        {loadingNotas ? (
          <div className="flex flex-col items-center justify-center py-24 text-emerald-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm font-medium">Consultando notas de entrada no banco DataCISS...</p>
            <p className="text-xs text-slate-500 mt-1">Carregando usuários e horários de lançamento</p>
          </div>
        ) : filteredNotas.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-white/5 border-b border-white/10">
                <TableRow className="border-white/10 hover:bg-transparent text-xs uppercase tracking-wider font-semibold text-slate-400">
                  <TableHead className="w-20">Loja</TableHead>
                  <TableHead className="w-36">Nota Fiscal</TableHead>
                  <TableHead className="w-20">Série</TableHead>
                  <TableHead className="w-44">Entrada (Data e Hora)</TableHead>
                  <TableHead className="w-48">Usuário que Deu Entrada</TableHead>
                  <TableHead>Fornecedor / Razão Social</TableHead>
                  <TableHead className="w-16">UF</TableHead>
                  <TableHead className="text-right w-36">Valor Contábil</TableHead>
                  <TableHead className="w-20 text-center">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotas.map((nota: any, i: number) => {
                  const movInfo = formatDateTime(nota.DTMOVIMENTO);
                  const usuarioNome = nota.USUARIO_ENTRADA || (nota.IDUSUARIO ? `ID ${nota.IDUSUARIO}` : 'Sistema');

                  return (
                    <TableRow 
                      key={i} 
                      className="border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                      onClick={() => setSelectedNota(nota)}
                    >
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Lj {nota.IDEMPRESA}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{nota.NUMNOTA}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">
                        {nota.SERIENOTA || "1"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-200">
                          <span>{movInfo.data}</span>
                          {movInfo.hora && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                              <Clock className="w-3 h-3" />
                              {movInfo.hora}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                          <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={usuarioNome}>
                            {usuarioNome}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-200 text-xs truncate max-w-sm" title={nota.NOME}>
                          {nota.NOME || `Fornecedor #${nota.IDCLIFOR}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Cód. {nota.IDCLIFOR}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-white/5">
                          {nota.UF || "AL"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-emerald-400">
                        {formatBRL(nota.VALCONTABIL)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNota(nota);
                          }}
                          className="h-7 px-2 text-xs text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                        >
                          <span>Itens</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="size-14 rounded-2xl bg-white/5 border border-white/10 grid place-items-center mx-auto mb-3 text-slate-500">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-300">Nenhuma nota encontrada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Não encontramos notas de entrada para os filtros de data e loja aplicados. Tente expandir o período ou selecionar outra loja.
            </p>
            <Button
              onClick={() => {
                setPresetDate(30);
                setStoreId("todas");
                setSearchTerm("");
              }}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              Buscar Últimos 30 Dias (Todas as Lojas)
            </Button>
          </div>
        )}
      </div>

      {/* Modal / Dialog de Itens da Nota com Usuário e Horário */}
      <Dialog open={!!selectedNota} onOpenChange={(o) => !o && setSelectedNota(null)}>
        <DialogContent className="bg-slate-900 border border-white/10 text-white max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold font-serif text-white flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <span>Itens da Nota Fiscal Nº {selectedNota?.NUMNOTA}</span>
              </DialogTitle>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Série: {selectedNota?.SERIENOTA || "1"}
              </span>
            </div>

            {/* Informações detalhadas de auditoria da nota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-white/5 text-xs">
              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <User className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Usuário Entrada</div>
                  <div className="font-semibold text-purple-300 truncate">
                    {selectedNota?.USUARIO_ENTRADA || (selectedNota?.IDUSUARIO ? `ID ${selectedNota.IDUSUARIO}` : 'Sistema')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Data / Hora Entrada</div>
                  <div className="font-semibold text-cyan-300 font-mono">
                    {formatDateTime(selectedNota?.DTMOVIMENTO).data} {formatDateTime(selectedNota?.DTMOVIMENTO).hora && `às ${formatDateTime(selectedNota?.DTMOVIMENTO).hora}`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <Store className="w-4 h-4 text-blue-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Loja Destino</div>
                  <div className="font-semibold text-blue-300 font-mono">
                    Loja {selectedNota?.IDEMPRESA}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/5">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Valor Contábil</div>
                  <div className="font-bold text-emerald-400 font-mono">
                    {formatBRL(selectedNota?.VALCONTABIL)}
                  </div>
                </div>
              </div>
            </div>

            <DialogDescription className="text-xs text-slate-400 mt-2">
              Fornecedor: <strong className="text-slate-200">{selectedNota?.NOME}</strong> (Cód. {selectedNota?.IDCLIFOR})
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-3">
            {loadingItens ? (
              <div className="flex flex-col items-center justify-center py-16 text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Carregando itens do estoque analítico...</p>
              </div>
            ) : itensNota.length > 0 ? (
              <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
                <Table>
                  <TableHeader className="bg-white/5 border-b border-white/10">
                    <TableRow className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      <TableHead className="w-16">Seq</TableHead>
                      <TableHead className="w-24">Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center w-32">Validade</TableHead>
                      <TableHead className="text-right w-24">Qtd</TableHead>
                      <TableHead className="text-right w-32">Unitário (R$)</TableHead>
                      <TableHead className="text-right w-36">Total (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensNota.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-white/5 hover:bg-white/[0.03]">
                        <TableCell className="text-slate-500 font-mono text-xs">
                          {item.SEQUENCIA}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-cyan-400 font-semibold">
                          {item.IDPRODUTO}
                        </TableCell>
                        <TableCell>
                          <div className="text-slate-200 text-xs font-medium">
                            {item.PRODUTO_DESC}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.DTVALIDADE ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              <Calendar className="w-3 h-3" />
                              {String(item.DTVALIDADE).split("T")[0].split("-").reverse().join("/")}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-300">
                          {Number(item.QUANTIDADE || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-400">
                          {formatBRL(item.VALUNITARIO)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-emerald-400">
                          {formatBRL(item.VALTOTAL)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                Nenhum item detalhado encontrado para esta nota fiscal.
              </div>
            )}
          </div>

          <div className="p-4 px-6 border-t border-white/10 bg-slate-950/60 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Total de itens: <strong className="text-white">{itensNota.length}</strong>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total Somado:</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {formatBRL(totalItensModal || selectedNota?.VALCONTABIL)}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
