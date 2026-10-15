import { analyzeProductPair, electMasterProduct } from './smartcatalog_engine.js';

const prod1 = {
  id: "P1",
  codigo_interno: "1001",
  gtin_ean: "7891000123456",
  descricao: "LEITE INTEGRAL UHT 1L NESTLE",
  marca: "Nestle",
  peso_liquido: 1.0,
  historico_vendas_total: 15400.00,
  qtd_movimentacoes: 450,
  estoque_atual: 120
};

const prod2 = {
  id: "P2",
  codigo_interno: "9042",
  gtin_ean: "7891000123456",
  descricao: "LEITE INTEG UHT 1 LITRO NESTLE",
  marca: "Nestle",
  peso_liquido: 1.0,
  historico_vendas_total: 210.00,
  qtd_movimentacoes: 5,
  estoque_atual: 2
};

console.log("=== TESTANDO ENGINE DE DUPLICIDADE ===");
const analise = analyzeProductPair(prod1, prod2);
console.log("Resultado da Análise:", JSON.stringify(analise, null, 2));

console.log("\n=== TESTANDO ELEIÇÃO DO PRODUTO MESTRE ===");
const mestre = electMasterProduct([prod1, prod2]);
console.log("Produto Mestre Eleito:", mestre.masterProduct.codigo_interno, "-", mestre.masterProduct.descricao);
console.log("Sugeridos para Inativação:", mestre.suggestedForInactivation.map(p => p.codigo_interno));
