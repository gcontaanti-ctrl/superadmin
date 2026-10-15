-- SmartCatalog AI - Script SQL PostgreSQL Inicial
-- Multi-tenant, Produtos, Auditoria, Categorias, Marcas, Fabricantes, Licenciamento

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_fantasia VARCHAR(150) NOT NULL,
    razao_social VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    email_contato VARCHAR(100) NOT NULL,
    telefone VARCHAR(20),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Licenças
CREATE TABLE IF NOT EXISTS licencas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    plano VARCHAR(50) NOT NULL DEFAULT 'Enterprise', -- Basic, Pro, Enterprise
    limite_produtos INT NOT NULL DEFAULT 50000,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL DEFAULT 'Operador', -- Admin, Gestor, Operador
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_usuario_empresa_email UNIQUE (empresa_id, email)
);

-- 4. Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    codigo_interno VARCHAR(50),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Marcas
CREATE TABLE IF NOT EXISTS marcas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Fabricantes
CREATE TABLE IF NOT EXISTS fabricantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de Produtos (Entidade Principal com dados de Movimentação)
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo_interno VARCHAR(50) NOT NULL,
    gtin_ean VARCHAR(14),
    descricao VARCHAR(255) NOT NULL,
    categoria_id UUID REFERENCES categorias(id),
    marca_id UUID REFERENCES marcas(id),
    fabricante_id UUID REFERENCES fabricantes(id),
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    peso_liquido DECIMAL(12,3) DEFAULT 0,
    volume DECIMAL(12,3) DEFAULT 0,
    embalagem VARCHAR(30),
    preco_venda DECIMAL(12,2) DEFAULT 0,
    estoque_atual DECIMAL(12,3) DEFAULT 0,
    qtd_movimentacoes INT DEFAULT 0,
    historico_vendas_total DECIMAL(12,2) DEFAULT 0,
    data_ultima_venda TIMESTAMP WITH TIME ZONE,
    status_cadastro VARCHAR(30) DEFAULT 'Ativo', -- Ativo, Inativo, DuplicadoSugerido, Mestre
    produto_mestre_id UUID REFERENCES produtos(id),
    score_qualidade INT DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_prod_empresa_codigo UNIQUE (empresa_id, codigo_interno)
);

-- 8. Tabela de Análises / Auditorias de Duplicidade
CREATE TABLE IF NOT EXISTS auditorias_duplicidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    produto_origem_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    produto_candidato_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    percentual_similaridade DECIMAL(5,2) NOT NULL,
    motivos_duplicidade TEXT NOT NULL, -- Ex: "Mesmo GTIN, Nome 92% similar"
    produto_mestre_sugerido_id UUID REFERENCES produtos(id),
    status_auditoria VARCHAR(30) DEFAULT 'Pendente', -- Pendente, Aprovado, Rejeitado
    analisado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Desempenho e Multi-tenant
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_gtin ON produtos(empresa_id, gtin_ean);
CREATE INDEX IF NOT EXISTS idx_auditorias_tenant ON auditorias_duplicidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(empresa_id);
