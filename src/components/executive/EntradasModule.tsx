import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Store, Search, Loader2, FileText } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { format } from "date-fns";

export function EntradasModule({ storeId: globalStoreId }: { storeId?: string }) {
  const [dateStart, setDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split("T")[0]);
  const [storeId, setStoreId] = useState(globalStoreId || "1");
  const [selectedNota, setSelectedNota] = useState<any>(null);

  const { data: notas, isLoading: loadingNotas, refetch } = useQuery({
    queryKey: ["entradas", dateStart, dateEnd, storeId],
    queryFn: async () => {
      const params = new URLSearchParams({
        data_inicio: dateStart,
        data_fim: dateEnd,
        id_empresa: storeId,
      });
      const res = await fetch(`/api/relatorios/entradas?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar notas");
      return res.json();
    }
  });

  const { data: itensNota, isLoading: loadingItens } = useQuery({
    queryKey: ["itensNota", selectedNota?.IDEMPRESA, selectedNota?.IDPLANILHA],
    queryFn: async () => {
      if (!selectedNota) return [];
      const res = await fetch(`/api/notas/${selectedNota.IDEMPRESA}/${selectedNota.IDPLANILHA}/itens`);
      if (!res.ok) throw new Error("Erro ao buscar itens da nota");
      return res.json();
    },
    enabled: !!selectedNota,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif text-white">
            Resumo de Notas de Entrada
          </h1>
          <p className="text-slate-400 mt-1">Relatório 160068 - CISS ERP</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Data Início
            </label>
            <Input 
              type="date" 
              value={dateStart} 
              onChange={e => setDateStart(e.target.value)} 
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Data Fim
            </label>
            <Input 
              type="date" 
              value={dateEnd} 
              onChange={e => setDateEnd(e.target.value)} 
              className="bg-black/20 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" />
              Loja
            </label>
            <Input 
              type="number" 
              value={storeId} 
              onChange={e => setStoreId(e.target.value)} 
              className="bg-black/20 border-white/10 text-white w-24"
            />
          </div>
          <Button onClick={() => refetch()} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            <Search className="w-4 h-4 mr-2" />
            Buscar
          </Button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm overflow-hidden">
        {loadingNotas ? (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Buscando notas...</p>
          </div>
        ) : notas && notas.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-white/10">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-300">Empresa</TableHead>
                  <TableHead className="text-slate-300">Nota Fiscal</TableHead>
                  <TableHead className="text-slate-300">Série</TableHead>
                  <TableHead className="text-slate-300">Data Mov.</TableHead>
                  <TableHead className="text-slate-300">Nome / Fornecedor</TableHead>
                  <TableHead className="text-slate-300 text-right">Valor Contábil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notas.map((nota: any, i: number) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-slate-300">{nota.IDEMPRESA}</TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-emerald-400 hover:text-emerald-300 font-bold"
                        onClick={() => setSelectedNota(nota)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {nota.NUMNOTA}
                      </Button>
                    </TableCell>
                    <TableCell className="text-slate-400">{nota.SERIENOTA}</TableCell>
                    <TableCell className="text-slate-400">{nota.DTMOVIMENTO ? format(new Date(nota.DTMOVIMENTO), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell className="text-slate-300">{nota.NOME}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(nota.VALCONTABIL || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            Nenhuma nota encontrada no período selecionado.
          </div>
        )}
      </div>

      <Dialog open={!!selectedNota} onOpenChange={(o) => !o && setSelectedNota(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-emerald-400 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Detalhes da Nota {selectedNota?.NUMNOTA}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Fornecedor: <span className="text-slate-200">{selectedNota?.NOME}</span> | 
              Loja: <span className="text-slate-200">{selectedNota?.IDEMPRESA}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 bg-black/40 border border-white/5 rounded-xl overflow-hidden">
            {loadingItens ? (
              <div className="flex flex-col items-center justify-center py-10 text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>Carregando itens...</p>
              </div>
            ) : itensNota && itensNota.length > 0 ? (
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0 z-10 border-b border-white/10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-slate-300">Seq</TableHead>
                      <TableHead className="text-slate-300">Cód</TableHead>
                      <TableHead className="text-slate-300">Produto</TableHead>
                      <TableHead className="text-slate-300 text-right">Qtd</TableHead>
                      <TableHead className="text-slate-300 text-right">Val. Unitário</TableHead>
                      <TableHead className="text-slate-300 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensNota.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-white/5 hover:bg-white/5">
                        <TableCell className="text-slate-500">{item.SEQUENCIA}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{item.IDPRODUTO}</TableCell>
                        <TableCell className="text-slate-200 font-medium">{item.PRODUTO_DESC}</TableCell>
                        <TableCell className="text-right text-slate-300">{item.QUANTIDADE}</TableCell>
                        <TableCell className="text-right font-mono text-slate-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VALUNITARIO || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.VALTOTAL || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500">
                Nenhum item encontrado nesta nota.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
