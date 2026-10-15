/**
 * Clean Architecture - Express Interface Routes
 * REST API for Ruptures Module
 */

const express = require('express');
const router = express.Router();
const useCases = require('../usecases/rupturaUseCases.cjs');

// Dashboard Principal (Rupturas, KPIs, Gráficos, Rankings)
router.get('/dashboard', async (req, res) => {
    try {
        const { idEmpresa, idLoja, search } = req.query;
        const data = await useCases.getDashboard(idEmpresa || '1', idLoja, search);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sugestões de Compra
router.get('/sugestoes-compra', async (req, res) => {
    try {
        const { idEmpresa, idLoja, search } = req.query;
        const data = await useCases.getSugestoesCompra(idEmpresa || '1', idLoja, search);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Consulta de Estoque e Risco
router.get('/estoque', async (req, res) => {
    try {
        const { idEmpresa, idLoja, search, filterRisco } = req.query;
        const data = await useCases.getEstoque(idEmpresa || '1', idLoja, search, filterRisco);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Empresas
router.get('/empresas', async (req, res) => {
    try {
        const data = await useCases.getEmpresas();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lojas
router.get('/lojas', async (req, res) => {
    try {
        const { idEmpresa } = req.query;
        const data = await useCases.getLojas(idEmpresa);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/lojas', async (req, res) => {
    try {
        const data = await useCases.cadastrarLoja(req.body);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fornecedores
router.get('/fornecedores', async (req, res) => {
    try {
        const { idEmpresa } = req.query;
        const data = await useCases.getFornecedores(idEmpresa);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/fornecedores', async (req, res) => {
    try {
        const data = await useCases.cadastrarFornecedor(req.body);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Produtos
router.get('/produtos', async (req, res) => {
    try {
        const { idEmpresa } = req.query;
        const data = await useCases.repository.getProdutos(idEmpresa);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/produtos', async (req, res) => {
    try {
        const data = await useCases.cadastrarProduto(req.body);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cadastro de Estoque
router.post('/estoque', async (req, res) => {
    try {
        const data = await useCases.cadastrarEstoque(req.body);
        res.json({ ok: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
