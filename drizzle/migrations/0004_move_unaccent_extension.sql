-- Linter do Supabase (extension_in_public): extensões não devem viver no
-- schema public, que é o schema exposto por padrão via PostgREST. Move o
-- unaccent para um schema dedicado; chamadas em lib/db/queries/dossier-list.ts
-- passam a qualificar a função como extensions.unaccent(...).
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;
