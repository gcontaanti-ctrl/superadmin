-- Tabela para gerenciar clientes e módulos liberados
CREATE TABLE public.clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  license_key text UNIQUE NOT NULL,
  active_modules jsonb DEFAULT '{"vendas": true, "financeiro": false, "estoque": false}'::jsonb,
  last_ping timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para gerenciar as versões de atualização do sistema
CREATE TABLE public.system_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version text NOT NULL UNIQUE,
  file_url text NOT NULL,
  release_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Criar o Storage Bucket (Para os arquivos .zip das atualizações)
-- Obs: Rode isso se não for criar manualmente pela interface do Storage.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('updates', 'updates', true)
ON CONFLICT DO NOTHING;

-- Políticas de segurança basicas (Permite leitura publica para o bucket de updates)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'updates');
