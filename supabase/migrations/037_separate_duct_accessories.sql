-- 037_separate_duct_accessories.sql
-- Aplicada en produccion (fkokqccxhljbuqyutkxi) el 2026-09-02.
--
-- El innerduct y el mule tape van DENTRO del mismo ducto que el HDPE.
-- Sumarlos como "pies de conduit" cobra tres veces la misma zanja: en el
-- Westside Trail daba 71,109 ft cuando la canalizacion real son 23,703,
-- y eso inflaba la mano de obra de excavacion en 402,952 USD.
--
-- La zanja se paga por el largo del ducto, no por la suma de lo que va
-- adentro. Subcategorias separadas para que el roll-up sepa cual mide
-- el trabajo civil.

update public.bom_items
   set subcategory = 'duct_accessory'
 where module = 'conduit'
   and subcategory = 'duct'
   and part_number in ('INNER-1.25','MULE-WP1250');
