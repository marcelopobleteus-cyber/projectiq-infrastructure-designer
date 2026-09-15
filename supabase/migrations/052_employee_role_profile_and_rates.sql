-- Rol de empleado, ficha de usuario completa y tarifa por hora.
-- Aplicado en vivo el 2026-09-15; este archivo deja el repo al dia.
--
-- Nota: 'alter type ... add value' no puede ir en la misma transaccion que lo
-- usa, por eso el rol se agrego en su propia migracion (051b en la base).
alter type public.user_role add value if not exists 'employee';
