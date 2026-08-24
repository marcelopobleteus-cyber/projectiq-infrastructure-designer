-- Migration: 012_remove_coordinate_viewer.sql
-- Description: Drops the project_coordinate_points table and seed_wst_seg6_coordinates function.

DROP TABLE IF EXISTS public.project_coordinate_points CASCADE;
DROP FUNCTION IF EXISTS public.seed_wst_seg6_coordinates(uuid);
