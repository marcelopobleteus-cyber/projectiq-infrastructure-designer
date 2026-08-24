CREATE TABLE public.fiber_hardware_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  unit text NOT NULL DEFAULT 'pcs',
  unit_cost numeric(10, 2) NOT NULL,
  manufacturer text NOT NULL DEFAULT 'Generic',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fiber_hardware_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY all_fiber_hardware_catalog ON public.fiber_hardware_catalog FOR ALL TO authenticated USING (true);
CREATE TRIGGER update_fiber_hardware_catalog_updated_at BEFORE UPDATE ON public.fiber_hardware_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.fiber_hardware_catalog (part_number, description, category, unit, unit_cost, manufacturer) VALUES
('HH-BOX', 'Handhole Box (24x36x36)', 'Structure', 'pcs', 850.00, 'Generic'),
('MH-COVER', 'Concrete Manhole with Cast Iron Cover', 'Structure', 'pcs', 2400.00, 'Generic'),
('PB-BOX', 'Pull Box (12x12x6)', 'Structure', 'pcs', 150.00, 'Generic'),
('CAB-OUTDOOR', 'Outdoor Equipment Cabinet', 'Structure', 'pcs', 1200.00, 'Generic'),
('BLDG-ENTRY-KIT', 'Building Entrance Transition Kit', 'Structure', 'pcs', 250.00, 'Generic'),
('SE-CLOSURE', 'Splice Enclosure (12-Port)', 'Enclosure', 'pcs', 450.00, 'Generic'),
('HDPE-COND', 'HDPE Conduit (2-in)', 'Conduit', 'ft', 1.50, 'Generic'),
('INNER-1.25', '1.25-in Corrugated Innerduct', 'Conduit', 'ft', 0.75, 'Generic'),
('MULE-WP1250', 'Mule Tape 1250 lbs Pull Tape', 'Conduit', 'ft', 0.15, 'Generic'),
('DROP-CBL-SM', 'SM Drop Cable 6F', 'Drop Cable', 'ft', 0.45, 'Generic'),
('FIBER-OSP', 'OSP Fiber Cable (Fallback)', 'Cable', 'ft', 0.50, 'Generic');
