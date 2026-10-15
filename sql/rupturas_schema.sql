-- ==========================================
-- SCRIPT DE BANCO DE DADOS - MODULO DE RUPTURAS
-- Compatível com PostgreSQL / Supabase e IBM DB2 (ANSI SQL)
-- ==========================================

-- 1. Tabela de Empresas (Suporte Multiempresa)
CREATE TABLE empresas (
    id_empresa VARCHAR(50) NOT NULL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    documento VARCHAR(20) UNIQUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Lojas
CREATE TABLE lojas (
    id_loja VARCHAR(50) NOT NULL PRIMARY KEY,
    id_empresa VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    cidade VARCHAR(100),
    uf VARCHAR(2),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
);

-- 3. Tabela de Fornecedores
CREATE TABLE fornecedores (
    id_fornecedor VARCHAR(50) NOT NULL PRIMARY KEY,
    id_empresa VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(20),
    tempo_entrega_dias INT DEFAULT 7, -- Lead Time em dias
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE
);

-- 4. Tabela de Produtos
CREATE TABLE produtos (
    codigo_produto VARCHAR(50) NOT NULL PRIMARY KEY,
    id_empresa VARCHAR(50) NOT NULL,
    codigo_barras VARCHAR(50),
    descricao VARCHAR(250) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    id_fornecedor VARCHAR(50),
    custo DECIMAL(18,4) DEFAULT 0.00,
    preco_venda DECIMAL(18,2) DEFAULT 0.00,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id_fornecedor) ON DELETE SET NULL
);

-- 5. Tabela de Estoque por Loja
CREATE TABLE estoques (
    id_estoque VARCHAR(100) NOT NULL PRIMARY KEY, -- ex: id_loja + '_' + codigo_produto
    id_loja VARCHAR(50) NOT NULL,
    codigo_produto VARCHAR(50) NOT NULL,
    estoque_atual DECIMAL(18,3) DEFAULT 0.000,
    estoque_minimo DECIMAL(18,3) DEFAULT 0.000,
    estoque_seguranca DECIMAL(18,3) DEFAULT 0.000,
    estoque_maximo DECIMAL(18,3) DEFAULT 0.000,
    qtd_ultima_compra DECIMAL(18,3) DEFAULT 0.000,
    data_ultima_compra DATE,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_loja) REFERENCES lojas(id_loja) ON DELETE CASCADE,
    FOREIGN KEY (codigo_produto) REFERENCES produtos(codigo_produto) ON DELETE CASCADE,
    CONSTRAINT uniq_loja_produto UNIQUE (id_loja, codigo_produto)
);

-- 6. Tabela de Histórico de Vendas (Acumulado diário ou consolidado por período)
CREATE TABLE historico_vendas (
    id_venda VARCHAR(100) NOT NULL PRIMARY KEY, -- ex: id_loja + '_' + codigo_produto + '_' + data
    id_loja VARCHAR(50) NOT NULL,
    codigo_produto VARCHAR(50) NOT NULL,
    data_venda DATE NOT NULL,
    quantidade_vendida DECIMAL(18,3) DEFAULT 0.000,
    valor_total DECIMAL(18,2) DEFAULT 0.00,
    FOREIGN KEY (id_loja) REFERENCES lojas(id_loja) ON DELETE CASCADE,
    FOREIGN KEY (codigo_produto) REFERENCES produtos(codigo_produto) ON DELETE CASCADE
);

-- 7. Tabela de Sugestões de Compra (Calculado automaticamente)
CREATE TABLE sugestoes_compra (
    id_sugestao VARCHAR(100) NOT NULL PRIMARY KEY,
    id_loja VARCHAR(50) NOT NULL,
    codigo_produto VARCHAR(50) NOT NULL,
    id_fornecedor VARCHAR(50),
    quantidade_sugerida DECIMAL(18,3) DEFAULT 0.000,
    valor_estimado DECIMAL(18,2) DEFAULT 0.00,
    data_ideal_compra DATE,
    previsao_termino_estoque DATE,
    consumo_medio_diario DECIMAL(18,3) DEFAULT 0.000,
    dias_estoque DECIMAL(18,2) DEFAULT 0.00,
    score_risco VARCHAR(20), -- 'Verde', 'Amarelo', 'Laranja', 'Vermelho'
    justificativa_inteligente TEXT, -- Excesso, Baixo Giro, Crescimento, Queda, etc.
    data_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_loja) REFERENCES lojas(id_loja) ON DELETE CASCADE,
    FOREIGN KEY (codigo_produto) REFERENCES produtos(codigo_produto) ON DELETE CASCADE,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id_fornecedor) ON DELETE SET NULL
);

-- 8. Tabela de Alertas de Risco (Dashboard e Notificações)
CREATE TABLE alertas_risco (
    id_alerta SERIAL PRIMARY KEY,
    id_empresa VARCHAR(50) NOT NULL,
    id_loja VARCHAR(50) NOT NULL,
    codigo_produto VARCHAR(50) NOT NULL,
    tipo_alerta VARCHAR(50) NOT NULL, -- 'Ruptura Iminente', 'Sem Giro', 'Excesso'
    mensagem TEXT NOT NULL,
    lido BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    FOREIGN KEY (id_loja) REFERENCES lojas(id_loja) ON DELETE CASCADE,
    FOREIGN KEY (codigo_produto) REFERENCES produtos(codigo_produto) ON DELETE CASCADE
);

-- ==========================================
-- INDICES PARA ALTA PERFORMANCE
-- ==========================================
CREATE INDEX idx_lojas_empresa ON lojas(id_empresa);
CREATE INDEX idx_forn_empresa ON fornecedores(id_empresa);
CREATE INDEX idx_prod_empresa ON produtos(id_empresa);
CREATE INDEX idx_prod_fornecedor ON produtos(id_fornecedor);
CREATE INDEX idx_estoques_loja_prod ON estoques(id_loja, codigo_produto);
CREATE INDEX idx_vendas_loja_prod_data ON historico_vendas(id_loja, codigo_produto, data_venda);
CREATE INDEX idx_sugestoes_loja_prod ON sugestoes_compra(id_loja, codigo_produto);
CREATE INDEX idx_sugestoes_risco ON sugestoes_compra(score_risco);
CREATE INDEX idx_alertas_lidos ON alertas_risco(id_empresa, lido);
