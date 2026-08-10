-- Busca da lista de dossiês (item 3): comparação case/acento-insensível via
-- ILIKE + unaccent() em tempo de consulta. Sem coluna gerada / índice
-- funcional aqui porque unaccent() é STABLE, não IMMUTABLE — e o volume
-- (30–150 dossiês) não justifica a função wrapper IMMUTABLE só para permitir
-- indexação.
CREATE EXTENSION IF NOT EXISTS unaccent;
