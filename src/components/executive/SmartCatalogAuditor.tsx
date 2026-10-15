import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Search, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import jsPDF from 'jspdf';

export function SmartCatalogAuditor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [produtosErros, setProdutosErros] = useState<any[]>([]);

  const carregarDadosReais = () => {
    setLoading(true);
    fetch('/api/smartcatalog/erros-mercadologicos')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProdutosErros(data);
        }
      })
      .catch(err => console.error("Erro ao carregar dados:", err))
      .finally(() => setLoading(false));
  };

  React.useEffect(() => {
    carregarDadosReais();
  }, []);

  const produtosFiltrados = produtosErros.filter(item => {
    const desc = item.produtoOrigem?.descricao?.toLowerCase() || '';
    const cod = item.produtoOrigem?.codigo?.toString() || '';
    const query = searchTerm.toLowerCase();
    return desc.includes(query) || cod.includes(query);
  });

  // Gerador de PDF Nativo sem dependência de autotable
  const exportarPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("Relatorio de Auditoria Cadastral & Mercadologica", 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')} | Total de Produtos: ${produtosFiltrados.length}`, 14, 22);

    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 25, 196, 25);

    let y = 33;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);

    doc.text("COD", 14, y);
    doc.text("DESCRICAO DO PRODUTO", 35, y);
    doc.text("GTIN", 130, y);
    doc.text("MARCA", 160, y);

    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);

    produtosFiltrados.forEach((item) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      const cod = String(item.produtoOrigem.codigo);
      const desc = String(item.produtoOrigem.descricao).substring(0, 45);
      const gtin = item.produtoOrigem.gtin ? String(item.produtoOrigem.gtin) : "SEM GTIN";
      const marca = String(item.produtoOrigem.marca || "").substring(0, 15);

      doc.text(cod, 14, y);
      doc.text(desc, 35, y);
      doc.text(gtin, 130, y);
      doc.text(marca, 160, y);

      y += 6;
    });

    doc.save(`Auditoria_Produtos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Header Simplificado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h1 className="text-xl font-bold text-white">Relatório de Inconsistências de Produtos</h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">Auditoria simplificada de GTIN, NCM e Classificação Mercadológica em tempo real</p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={carregarDadosReais} 
            disabled={loading}
            variant="outline" 
            className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Recarregar
          </Button>
          <Button 
            onClick={exportarPDF} 
            disabled={produtosFiltrados.length === 0}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Gerar Relatório PDF
          </Button>
        </div>
      </div>

      {/* Tabela Simples e Limpa */}
      <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Produtos Auditados ({produtosFiltrados.length})
            </CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input 
                placeholder="Filtrar por código ou descrição..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-slate-950 border-slate-800 text-xs text-slate-200 focus:border-emerald-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950 border-b border-slate-800">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-bold w-24">Cód. Interno</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold">Descrição do Produto</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold w-36">GTIN / EAN</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold w-32">Marca</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold">Inconsistência Detectada</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold text-center w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      {loading ? "Carregando dados do banco de dados..." : "Nenhum produto inconsistente encontrado."}
                    </TableCell>
                  </TableRow>
                ) : (
                  produtosFiltrados.map((item) => (
                    <TableRow key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors text-xs">
                      <TableCell className="font-mono font-bold text-emerald-400">{item.produtoOrigem.codigo}</TableCell>
                      <TableCell className="font-medium text-slate-200">{item.produtoOrigem.descricao}</TableCell>
                      <TableCell className="font-mono text-slate-300">
                        {item.produtoOrigem.gtin ? (
                          <span>{item.produtoOrigem.gtin}</span>
                        ) : (
                          <span className="text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded text-[10px] border border-rose-500/20 font-sans">Sem GTIN</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">{item.produtoOrigem.marca}</TableCell>
                      <TableCell className="text-slate-300">
                        <span className="text-amber-400/90">{item.motivos}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px]">
                          Revisar
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
