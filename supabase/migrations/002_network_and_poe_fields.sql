-- Add cabinet_device to public.device_type enum if it does not exist
ALTER TYPE public.device_type ADD VALUE IF NOT EXISTS 'cabinet_device';

-- Add default_poe_draw to public.camera_models
ALTER TABLE public.camera_models 
ADD COLUMN IF NOT EXISTS default_poe_draw numeric(5,2) DEFAULT 7.50 NOT NULL;

-- Seed default PoE draw on existing seeded models
UPDATE public.camera_models SET default_poe_draw = 12.95 WHERE model_number = 'P3245-LVE';
UPDATE public.camera_models SET default_poe_draw = 25.50 WHERE model_number = 'Q1615-LE Mk III';
UPDATE public.camera_models SET default_poe_draw = 9.00 WHERE model_number = 'XNV-8080R';
UPDATE public.camera_models SET default_poe_draw = 6.50 WHERE model_number = 'QNO-8080R';
UPDATE public.camera_models SET default_poe_draw = 8.00 WHERE model_number = '4.0C-H5A-BO1-IR';

-- Add budget, location and coordinates to public.network_devices
ALTER TABLE public.network_devices
ADD COLUMN IF NOT EXISTS poe_budget_watts integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS location_reference text;

-- Safe addition of named check constraints
ALTER TABLE public.network_devices DROP CONSTRAINT IF EXISTS network_devices_latitude_check;
ALTER TABLE public.network_devices ADD CONSTRAINT network_devices_latitude_check CHECK (latitude >= -90.0 AND latitude <= 90.0);

ALTER TABLE public.network_devices DROP CONSTRAINT IF EXISTS network_devices_longitude_check;
ALTER TABLE public.network_devices ADD CONSTRAINT network_devices_longitude_check CHECK (longitude >= -180.0 AND longitude <= 180.0);

-- Add switch ports metadata using existing enums and specified defaults
ALTER TABLE public.switch_ports
ADD COLUMN IF NOT EXISTS port_name text,
ADD COLUMN IF NOT EXISTS port_type public.port_media_type DEFAULT 'copper'::public.port_media_type NOT NULL,
ADD COLUMN IF NOT EXISTS speed_mbps integer DEFAULT 1000 NOT NULL,
ADD COLUMN IF NOT EXISTS poe_budget_watts integer DEFAULT 30 NOT NULL,
ADD COLUMN IF NOT EXISTS assigned_device_type public.port_assignment_type DEFAULT 'unused'::public.port_assignment_type NOT NULL;

-- Transactional RPC function to assign a camera to a switch port
CREATE OR REPLACE FUNCTION public.assign_camera_to_switch_port(camera_id uuid, switch_port_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_device_id uuid;
BEGIN
    -- 1. Check if selected switch port is available (not assigned to another camera)
    IF EXISTS (
        SELECT 1 FROM public.switch_ports
        WHERE id = switch_port_id 
          AND assigned_camera_location_id IS NOT NULL 
          AND assigned_camera_location_id != camera_id
    ) THEN
        RAISE EXCEPTION 'Selected switch port is already assigned to another camera';
    END IF;

    -- 2. Clear any previous port assignments for this camera
    UPDATE public.switch_ports
    SET assigned_camera_location_id = NULL,
        assigned_device_type = 'unused'::public.port_assignment_type,
        updated_at = now()
    WHERE assigned_camera_location_id = camera_id;

    -- 3. Get network device ID for the selected port
    SELECT network_device_id INTO target_device_id
    FROM public.switch_ports
    WHERE id = switch_port_id;

    IF target_device_id IS NULL THEN
        RAISE EXCEPTION 'Switch port does not exist';
    END IF;

    -- 4. Update camera's assigned network device
    UPDATE public.camera_locations
    SET assigned_network_device_id = target_device_id,
        updated_at = now()
    WHERE id = camera_id;

    -- 5. Link the camera to the new switch port
    UPDATE public.switch_ports
    SET assigned_camera_location_id = camera_id,
        assigned_device_type = 'camera'::public.port_assignment_type,
        updated_at = now()
    WHERE id = switch_port_id;
END;
$$;

-- Transactional RPC function to unassign a camera from a switch port
CREATE OR REPLACE FUNCTION public.unassign_camera_from_switch_port(camera_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Clear switch port reference
    UPDATE public.switch_ports
    SET assigned_camera_location_id = NULL,
        assigned_device_type = 'unused'::public.port_assignment_type,
        updated_at = now()
    WHERE assigned_camera_location_id = camera_id;

    -- 2. Clear camera reference
    UPDATE public.camera_locations
    SET assigned_network_device_id = NULL,
        updated_at = now()
    WHERE id = camera_id;
END;
$$;
