-- supabase-schema.sql
-- Execute este script no SQL Editor do Supabase (Dashboard) para criar tabelas básicas e políticas RLS.
-- Apagar tudo e recriar correctamente
DROP TABLE IF EXISTS public.admins CASCADE;
DROP TABLE IF EXISTS public.filmes CASCADE;
DROP TABLE IF EXISTS public.series CASCADE;
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.hero CASCADE;
DROP TABLE IF EXISTS public.config CASCADE;
DROP TABLE IF EXISTS public.meta CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- TABLE: admins (uuid para corresponder ao auth.uid())
CREATE TABLE public.admins (
  id uuid PRIMARY KEY,
  email text,
  role text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: users
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text,
  name text,
  created_at timestamptz DEFAULT now(),
  meta jsonb
);

-- TABLE: filmes
CREATE TABLE public.filmes (
  id bigint PRIMARY KEY,
  tipo text,
  titulo text,
  titulo_orig text,
  ano int,
  duracao text,
  rating numeric,
  descricao text,
  generos text[],
  audio text,
  qualidade text,
  diretor text,
  elenco text,
  produtor text,
  poster text,
  backdrop text,
  url_video text
);

-- TABLE: series
CREATE TABLE public.series (
  id bigint PRIMARY KEY,
  tipo text,
  titulo text,
  titulo_orig text,
  ano int,
  duracao text,
  rating numeric,
  descricao text,
  generos text[],
  audio text,
  qualidade text,
  diretor text,
  elenco text,
  produtor text,
  poster text,
  backdrop text,
  temporadas jsonb
);

-- TABLE: pedidos
CREATE TABLE public.pedidos (
  id bigserial PRIMARY KEY,
  titulo text,
  data text,
  meta jsonb
);

-- TABLE: hero
CREATE TABLE public.hero (
  id bigserial PRIMARY KEY,
  titulo text,
  subtitulo text,
  backdrop text,
  content_id bigint,
  content_type text
);

-- TABLE: config
CREATE TABLE public.config (
  key text PRIMARY KEY,
  value jsonb
);

-- TABLE: meta
CREATE TABLE public.meta (
  key text PRIMARY KEY,
  value jsonb
);

-- ACTIVAR RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta ENABLE ROW LEVEL SECURITY;

-- POLICIES: leitura pública de filmes e series
CREATE POLICY "Public select filmes" ON public.filmes FOR SELECT USING (true);
CREATE POLICY "Public select series" ON public.series FOR SELECT USING (true);
CREATE POLICY "Public select hero" ON public.hero FOR SELECT USING (true);
CREATE POLICY "Public select config" ON public.config FOR SELECT USING (true);
CREATE POLICY "Public insert pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select pedidos" ON public.pedidos FOR SELECT USING (true);
CREATE POLICY "Public select meta" ON public.meta FOR SELECT USING (true);
CREATE POLICY "Public insert meta" ON public.meta FOR INSERT WITH CHECK (true);

-- COMMENTS TABLE (usar para comentários do site)
CREATE TABLE IF NOT EXISTS public.comments (
  id bigserial PRIMARY KEY,
  content_id bigint,
  author text,
  text text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public insert comments" ON public.comments FOR INSERT WITH CHECK (true);

-- POLICIES: apenas admins podem escrever
CREATE POLICY "Admins modify filmes" ON public.filmes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

CREATE POLICY "Admins modify series" ON public.series FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

CREATE POLICY "Admins modify hero" ON public.hero FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

CREATE POLICY "Admins modify config" ON public.config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

CREATE POLICY "Admins modify pedidos" ON public.pedidos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

-- POLICIES: tabela admins
CREATE POLICY "Admins select self" ON public.admins 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins deny insert" ON public.admins 
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Admins deny update" ON public.admins 
  FOR UPDATE USING (false);
CREATE POLICY "Admins deny delete" ON public.admins 
  FOR DELETE USING (false);

