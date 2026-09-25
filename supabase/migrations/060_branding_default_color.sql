-- El color por defecto de la marca de organizacion pasa al naranja de NextQ.
--
-- Estaba en #009973, un verde que venia de la paleta de la app anterior a la
-- identidad corporativa. Una organizacion que no configura su marca hoy recibe
-- un entregable con un color que no es ni suyo ni nuestro.
--
-- Solo cambia el default para filas NUEVAS. Las existentes no se tocan: un
-- #009973 ya guardado es indistinguible de una eleccion deliberada del cliente,
-- y sobrescribirlo seria decidir por el.

alter table public.organization_branding
  alter column primary_color set default '#FF6A13';
