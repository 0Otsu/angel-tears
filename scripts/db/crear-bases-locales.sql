-- Crea el rol y las bases locales de Angel Tears en una instancia de PostgreSQL de desarrollo.
-- Uso (en una terminal propia, con un superusuario de tu PostgreSQL local):
--   psql -U postgres -h localhost -f scripts/db/crear-bases-locales.sql
-- Pide la contrasena del superusuario y luego define la del rol angel_tears (entrada oculta).
-- No guarda ni imprime contrasenas. Es idempotente: se puede repetir sin duplicar nada.
-- Solo para desarrollo local: no usar contra una base compartida o de produccion.

\set ON_ERROR_STOP on

SELECT 'CREATE ROLE angel_tears LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'angel_tears')
\gexec

-- Define (o redefine) la contrasena del rol. Usar la misma en .env.local.
\password angel_tears

SELECT 'CREATE DATABASE angel_tears_dev OWNER angel_tears'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'angel_tears_dev')
\gexec

SELECT 'CREATE DATABASE angel_tears_test OWNER angel_tears'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'angel_tears_test')
\gexec

\echo 'Listo: rol angel_tears y bases angel_tears_dev / angel_tears_test.'
