/**
 * Clean Architecture - Use Cases
 * Implements business use cases for Ruptures Dashboard, Purchase Suggestions, and Master Data CRUD.
 */

const repository = require('../infrastructure/repository.cjs');

class RupturaUseCases {
    async getDashboard(idEmpresa, idLoja, search = '') {
        const items = await repository.getEstoqueCompleto(idEmpresa, idLoja, search);

        // 1. Total em risco (Score Vermelho e Laranja)
        const produtosEmRisco = items.filter(i => i.score_level >= 3);
        const totalProdutosEmRisco = produtosEmRisco.length;

        // 2. Produtos críticos (Estoque zero ou diasEstoque < leadTime)
        const produtosCriticos = items.filter(i => i.estoque_atual <= 0 || i.dias_estoque < i.tempo_entrega_dias);
        const totalProdutosCriticos = produtosCriticos.length;

        // 3. Produtos sem movimentação (Vendas 30d === 0 e Estoque > 0)
        const produtosSemMovimentacao = items.filter(i => i.vendas.ultimos_30d === 0 && i.estoque_atual > 0);
        const totalProdutosSemMovimentacao = produtosSemMovimentacao.length;

        // 4. Valor financeiro das rupturas previstas (Valor total das sugestões de compra para itens em risco)
        const valorFinanceiroRupturas = produtosEmRisco.reduce((acc, i) => acc + i.valor_sugerido, 0);

        // 5. Gráfico de rupturas por categoria
        const categoriaMap = {};
        for (let item of items) {
            if (!categoriaMap[item.categoria]) {
                categoriaMap[item.categoria] = { categoria: item.categoria, total_produtos: 0, em_risco: 0, valor_risco: 0 };
            }
            categoriaMap[item.categoria].total_produtos++;
            if (item.score_level >= 3) {
                categoriaMap[item.categoria].em_risco++;
                categoriaMap[item.categoria].valor_risco += item.valor_sugerido;
            }
        }
        const graficoCategoria = Object.values(categoriaMap);

        // 6. Gráfico de consumo diário (Média de consumo agregado por categoria ou geral)
        const graficoConsumoDiario = graficoCategoria.map(c => {
            const itensCat = items.filter(i => i.categoria === c.categoria);
            const cmdTotal = itensCat.reduce((acc, i) => acc + i.consumo_medio_diario, 0);
            return {
                categoria: c.categoria,
                consumo_diario: Math.round(cmdTotal * 10) / 10
            };
        });

        // 7. Ranking dos 100 produtos com maior risco
        const ranking100 = [...items]
            .sort((a, b) => a.dias_estoque - b.dias_estoque)
            .slice(0, 100);

        // 8. Ranking por loja
        const lojaMap = {};
        for (let item of items) {
            if (!lojaMap[item.loja]) {
                lojaMap[item.loja] = { id_loja: item.id_loja, loja: item.loja, em_risco: 0, valor_sugerido: 0, total_itens: 0 };
            }
            lojaMap[item.loja].total_itens++;
            if (item.score_level >= 3) {
                lojaMap[item.loja].em_risco++;
                lojaMap[item.loja].valor_sugerido += item.valor_sugerido;
            }
        }
        const rankingLojas = Object.values(lojaMap).sort((a, b) => b.em_risco - a.em_risco);

        // 9. Ranking por fornecedor
        const fornecedorMap = {};
        for (let item of items) {
            if (!fornecedorMap[item.fornecedor]) {
                fornecedorMap[item.fornecedor] = { fornecedor: item.fornecedor, em_risco: 0, valor_sugerido: 0, lead_time_dias: item.tempo_entrega_dias };
            }
            if (item.score_level >= 3) {
                fornecedorMap[item.fornecedor].em_risco++;
                fornecedorMap[item.fornecedor].valor_sugerido += item.valor_sugerido;
            }
        }
        const rankingFornecedores = Object.values(fornecedorMap).sort((a, b) => b.em_risco - a.em_risco);

        return {
            kpis: {
                totalProdutosEmRisco,
                totalProdutosCriticos,
                totalProdutosSemMovimentacao,
                valorFinanceiroRupturas
            },
            graficos: {
                rupturaPorCategoria: graficoCategoria,
                consumoDiario: graficoConsumoDiario
            },
            rankings: {
                top100MaiorRisco: ranking100,
                rankingLojas,
                rankingFornecedores
            }
        };
    }

    async getSugestoesCompra(idEmpresa, idLoja, search = '') {
        const items = await repository.getEstoqueCompleto(idEmpresa, idLoja, search);
        return items
            .filter(i => i.quantidade_sugerida > 0)
            .map(i => ({
                codigo_produto: i.codigo_produto,
                produto: i.descricao,
                categoria: i.categoria,
                fornecedor: i.fornecedor,
                loja: i.loja,
                estoque_atual: i.estoque_atual,
                consumo_medio_diario: i.consumo_medio_diario,
                quantidade_sugerida: i.quantidade_sugerida,
                valor_estimado: i.valor_sugerido,
                data_ideal_compra: i.data_ideal_compra,
                previsao_termino_estoque: i.previsao_termino,
                score_risco: i.score_risco,
                score_color: i.score_color
            }));
    }

    async getEstoque(idEmpresa, idLoja, search, filterRisco) {
        return repository.getEstoqueCompleto(idEmpresa, idLoja, search, filterRisco);
    }

    async cadastrarProduto(dados) {
        return repository.addProduto(dados);
    }

    async cadastrarFornecedor(dados) {
        return repository.addFornecedor(dados);
    }

    async cadastrarLoja(dados) {
        return repository.addLoja(dados);
    }

    async cadastrarEstoque(dados) {
        return repository.addEstoque(dados);
    }

    async getEmpresas() {
        return repository.getEmpresas();
    }

    async getLojas(idEmpresa) {
        return repository.getLojas(idEmpresa);
    }

    async getFornecedores(idEmpresa) {
        return repository.getFornecedores(idEmpresa);
    }
}

module.exports = new RupturaUseCases();
