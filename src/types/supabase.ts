export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bom_items: {
        Row: {
          category: string
          created_at: string
          description: string
          fiber_node_id: string | null
          fiber_route_id: string | null
          id: string
          manufacturer: string | null
          part_number: string | null
          project_id: string
          quantity: number
          source: Database["public"]["Enums"]["bom_source_type"]
          status: string | null
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          fiber_node_id?: string | null
          fiber_route_id?: string | null
          id?: string
          manufacturer?: string | null
          part_number?: string | null
          project_id: string
          quantity?: number
          source?: Database["public"]["Enums"]["bom_source_type"]
          status?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          fiber_node_id?: string | null
          fiber_route_id?: string | null
          id?: string
          manufacturer?: string | null
          part_number?: string | null
          project_id?: string
          quantity?: number
          source?: Database["public"]["Enums"]["bom_source_type"]
          status?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_fiber_node_id_fkey"
            columns: ["fiber_node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_fiber_route_id_fkey"
            columns: ["fiber_route_id"]
            isOneToOne: false
            referencedRelation: "fiber_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cabinets: {
        Row: {
          cabinet_tag: string
          cabinet_type: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          notes: string | null
          organization_id: string
          project_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cabinet_tag: string
          cabinet_type: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cabinet_tag?: string
          cabinet_type?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cabinets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cabinets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_fiber_assignment_strands: {
        Row: {
          camera_fiber_assignment_id: string
          camera_id: string
          created_at: string
          id: string
          organization_id: string
          project_id: string
          strand_id: string
          strand_role: string
          updated_at: string | null
        }
        Insert: {
          camera_fiber_assignment_id: string
          camera_id: string
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          strand_id: string
          strand_role: string
          updated_at?: string | null
        }
        Update: {
          camera_fiber_assignment_id?: string
          camera_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          strand_id?: string
          strand_role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_fiber_assignment_strands_camera_fiber_assignment_id_fkey"
            columns: ["camera_fiber_assignment_id"]
            isOneToOne: false
            referencedRelation: "camera_fiber_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignment_strands_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignment_strands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignment_strands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignment_strands_strand_id_fkey"
            columns: ["strand_id"]
            isOneToOne: true
            referencedRelation: "fiber_strands"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_fiber_assignments: {
        Row: {
          assigned_cabinet_id: string | null
          assigned_fdu_id: string | null
          assigned_fpp_id: string | null
          assigned_sfp_port_id: string | null
          assigned_switch_id: string | null
          assigned_switch_port_id: string | null
          backbone_cable_id: string | null
          camera_id: string
          connectivity_path_type: string
          created_at: string
          drop_cable_id: string | null
          enclosure_id: string | null
          fiber_path_status: string
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          source_node_id: string | null
          splice_status: string
          test_status: string
          updated_at: string | null
        }
        Insert: {
          assigned_cabinet_id?: string | null
          assigned_fdu_id?: string | null
          assigned_fpp_id?: string | null
          assigned_sfp_port_id?: string | null
          assigned_switch_id?: string | null
          assigned_switch_port_id?: string | null
          backbone_cable_id?: string | null
          camera_id: string
          connectivity_path_type?: string
          created_at?: string
          drop_cable_id?: string | null
          enclosure_id?: string | null
          fiber_path_status?: string
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          source_node_id?: string | null
          splice_status?: string
          test_status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_cabinet_id?: string | null
          assigned_fdu_id?: string | null
          assigned_fpp_id?: string | null
          assigned_sfp_port_id?: string | null
          assigned_switch_id?: string | null
          assigned_switch_port_id?: string | null
          backbone_cable_id?: string | null
          camera_id?: string
          connectivity_path_type?: string
          created_at?: string
          drop_cable_id?: string | null
          enclosure_id?: string | null
          fiber_path_status?: string
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          source_node_id?: string | null
          splice_status?: string
          test_status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_fiber_assignments_assigned_cabinet_id_fkey"
            columns: ["assigned_cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_assigned_fdu_id_fkey"
            columns: ["assigned_fdu_id"]
            isOneToOne: false
            referencedRelation: "fiber_distribution_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_assigned_fpp_id_fkey"
            columns: ["assigned_fpp_id"]
            isOneToOne: false
            referencedRelation: "fiber_patch_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_assigned_sfp_port_id_fkey"
            columns: ["assigned_sfp_port_id"]
            isOneToOne: false
            referencedRelation: "switch_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_assigned_switch_id_fkey"
            columns: ["assigned_switch_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_assigned_switch_port_id_fkey"
            columns: ["assigned_switch_port_id"]
            isOneToOne: false
            referencedRelation: "switch_ports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_backbone_cable_id_fkey"
            columns: ["backbone_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: true
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_drop_cable_id_fkey"
            columns: ["drop_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_enclosure_id_fkey"
            columns: ["enclosure_id"]
            isOneToOne: false
            referencedRelation: "fiber_enclosures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_fiber_assignments_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_locations: {
        Row: {
          address_reference: string | null
          assigned_network_device_id: string | null
          camera_id_tag: string
          camera_model_id: string
          communication_type: Database["public"]["Enums"]["comm_type"]
          created_at: string
          id: string
          latitude: number
          longitude: number
          notes: string | null
          power_type: Database["public"]["Enums"]["power_type"]
          project_id: string
          status: Database["public"]["Enums"]["camera_status"]
          structure_reference: string | null
          updated_at: string
        }
        Insert: {
          address_reference?: string | null
          assigned_network_device_id?: string | null
          camera_id_tag: string
          camera_model_id: string
          communication_type?: Database["public"]["Enums"]["comm_type"]
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          notes?: string | null
          power_type?: Database["public"]["Enums"]["power_type"]
          project_id: string
          status?: Database["public"]["Enums"]["camera_status"]
          structure_reference?: string | null
          updated_at?: string
        }
        Update: {
          address_reference?: string | null
          assigned_network_device_id?: string | null
          camera_id_tag?: string
          camera_model_id?: string
          communication_type?: Database["public"]["Enums"]["comm_type"]
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          notes?: string | null
          power_type?: Database["public"]["Enums"]["power_type"]
          project_id?: string
          status?: Database["public"]["Enums"]["camera_status"]
          structure_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_locations_assigned_network_device_id_fkey"
            columns: ["assigned_network_device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_locations_camera_model_id_fkey"
            columns: ["camera_model_id"]
            isOneToOne: false
            referencedRelation: "camera_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_models: {
        Row: {
          created_at: string
          default_poe_draw: number
          estimated_cost: number | null
          form_factor: string | null
          id: string
          lens_type: string | null
          manufacturer: string
          model_number: string
          power_requirements: string | null
          resolution: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          default_poe_draw?: number
          estimated_cost?: number | null
          form_factor?: string | null
          id?: string
          lens_type?: string | null
          manufacturer: string
          model_number: string
          power_requirements?: string | null
          resolution?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          default_poe_draw?: number
          estimated_cost?: number | null
          form_factor?: string | null
          id?: string
          lens_type?: string | null
          manufacturer?: string
          model_number?: string
          power_requirements?: string | null
          resolution?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      camera_task_history: {
        Row: {
          camera_id: string
          camera_task_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          organization_id: string
          project_id: string
        }
        Insert: {
          camera_id: string
          camera_task_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          organization_id: string
          project_id: string
        }
        Update: {
          camera_id?: string
          camera_task_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          organization_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camera_task_history_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_task_history_camera_task_id_fkey"
            columns: ["camera_task_id"]
            isOneToOne: false
            referencedRelation: "camera_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_task_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_task_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_task_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      camera_tasks: {
        Row: {
          assigned_to: string | null
          camera_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          organization_id: string
          priority: string
          project_id: string
          project_task_id: string | null
          related_scope_item: string | null
          status: string
          task_type: string
          template_key: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          camera_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          priority?: string
          project_id: string
          project_task_id?: string | null
          related_scope_item?: string | null
          status?: string
          task_type: string
          template_key?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          camera_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          priority?: string
          project_id?: string
          project_task_id?: string | null
          related_scope_item?: string | null
          status?: string
          task_type?: string
          template_key?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camera_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_tasks_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camera_tasks_project_task_id_fkey"
            columns: ["project_task_id"]
            isOneToOne: false
            referencedRelation: "field_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_assignment_strands: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          organization_id: string
          project_id: string
          strand_id: string
          strand_role: string
          updated_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          strand_id: string
          strand_role?: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          strand_id?: string
          strand_role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_assignment_strands_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "fiber_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignment_strands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignment_strands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignment_strands_strand_id_fkey"
            columns: ["strand_id"]
            isOneToOne: true
            referencedRelation: "fiber_strands"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_assignments: {
        Row: {
          cabinet_id: string | null
          camera_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          purpose: string
          switch_id: string | null
          updated_at: string | null
        }
        Insert: {
          cabinet_id?: string | null
          camera_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          purpose: string
          switch_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cabinet_id?: string | null
          camera_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          purpose?: string
          switch_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_assignments_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignments_camera_id_fkey"
            columns: ["camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_assignments_switch_id_fkey"
            columns: ["switch_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_buffer_tubes: {
        Row: {
          cable_id: string
          created_at: string
          id: string
          organization_id: string
          project_id: string
          strand_end: number
          strand_start: number
          tube_color: string
          tube_number: number
          updated_at: string | null
        }
        Insert: {
          cable_id: string
          created_at?: string
          id?: string
          organization_id: string
          project_id: string
          strand_end: number
          strand_start: number
          tube_color: string
          tube_number: number
          updated_at?: string | null
        }
        Update: {
          cable_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string
          strand_end?: number
          strand_start?: number
          tube_color?: string
          tube_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_buffer_tubes_cable_id_fkey"
            columns: ["cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_buffer_tubes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_buffer_tubes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_cable_pass_throughs: {
        Row: {
          cable_id: string
          created_at: string
          has_slack_loop: boolean
          id: string
          node_id: string
          organization_id: string
          project_id: string
          sequence_order: number
          slack_length_ft: number
          updated_at: string | null
        }
        Insert: {
          cable_id: string
          created_at?: string
          has_slack_loop?: boolean
          id?: string
          node_id: string
          organization_id: string
          project_id: string
          sequence_order: number
          slack_length_ft?: number
          updated_at?: string | null
        }
        Update: {
          cable_id?: string
          created_at?: string
          has_slack_loop?: boolean
          id?: string
          node_id?: string
          organization_id?: string
          project_id?: string
          sequence_order?: number
          slack_length_ft?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_cable_pass_throughs_cable_id_fkey"
            columns: ["cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cable_pass_throughs_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cable_pass_throughs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cable_pass_throughs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_cables: {
        Row: {
          cable_tag: string
          cable_type: string
          created_at: string
          fiber_count: number
          from_node_id: string | null
          id: string
          install_status: string
          length_ft: number
          manufacturer: string | null
          model: string | null
          notes: string | null
          organization_id: string
          project_id: string
          route_id: string | null
          status: string | null
          strand_count: number | null
          test_status: string
          to_node_id: string | null
          updated_at: string | null
        }
        Insert: {
          cable_tag: string
          cable_type: string
          created_at?: string
          fiber_count: number
          from_node_id?: string | null
          id?: string
          install_status?: string
          length_ft?: number
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          organization_id: string
          project_id: string
          route_id?: string | null
          status?: string | null
          strand_count?: number | null
          test_status?: string
          to_node_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cable_tag?: string
          cable_type?: string
          created_at?: string
          fiber_count?: number
          from_node_id?: string | null
          id?: string
          install_status?: string
          length_ft?: number
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string
          project_id?: string
          route_id?: string | null
          status?: string | null
          strand_count?: number | null
          test_status?: string
          to_node_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_cables_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cables_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "fiber_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_cables_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_catalog: {
        Row: {
          cost_per_foot: number
          cost_per_meter: number
          created_at: string
          diameter_mm: number
          fiber_count: number
          grade: string
          id: string
          manufacturer: string
          mode: string
          part_number: string
          updated_at: string | null
          weight_kg_km: number
        }
        Insert: {
          cost_per_foot: number
          cost_per_meter: number
          created_at?: string
          diameter_mm: number
          fiber_count: number
          grade: string
          id?: string
          manufacturer: string
          mode: string
          part_number: string
          updated_at?: string | null
          weight_kg_km: number
        }
        Update: {
          cost_per_foot?: number
          cost_per_meter?: number
          created_at?: string
          diameter_mm?: number
          fiber_count?: number
          grade?: string
          id?: string
          manufacturer?: string
          mode?: string
          part_number?: string
          updated_at?: string | null
          weight_kg_km?: number
        }
        Relationships: []
      }
      fiber_distribution_units: {
        Row: {
          assigned_backbone_cable_id: string | null
          cabinet_id: string | null
          created_at: string
          fdu_tag: string
          fiber_capacity: number
          id: string
          organization_id: string
          project_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_backbone_cable_id?: string | null
          cabinet_id?: string | null
          created_at?: string
          fdu_tag: string
          fiber_capacity?: number
          id?: string
          organization_id: string
          project_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_backbone_cable_id?: string | null
          cabinet_id?: string | null
          created_at?: string
          fdu_tag?: string
          fiber_capacity?: number
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_distribution_units_assigned_backbone_cable_id_fkey"
            columns: ["assigned_backbone_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_distribution_units_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_distribution_units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_distribution_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_enclosure_attachments: {
        Row: {
          cable_id: string
          created_at: string
          enclosure_id: string
          id: string
          label: string | null
          port_number: number
          updated_at: string | null
        }
        Insert: {
          cable_id: string
          created_at?: string
          enclosure_id: string
          id?: string
          label?: string | null
          port_number?: number
          updated_at?: string | null
        }
        Update: {
          cable_id?: string
          created_at?: string
          enclosure_id?: string
          id?: string
          label?: string | null
          port_number?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      fiber_enclosures: {
        Row: {
          cabinet_id: string | null
          capacity: number
          created_at: string
          enclosure_tag: string
          enclosure_type: string
          id: string
          installed_status: string
          latitude: number | null
          longitude: number | null
          node_id: string
          notes: string | null
          organization_id: string
          project_id: string
          splice_count: number
          updated_at: string | null
        }
        Insert: {
          cabinet_id?: string | null
          capacity?: number
          created_at?: string
          enclosure_tag: string
          enclosure_type: string
          id?: string
          installed_status?: string
          latitude?: number | null
          longitude?: number | null
          node_id: string
          notes?: string | null
          organization_id: string
          project_id: string
          splice_count?: number
          updated_at?: string | null
        }
        Update: {
          cabinet_id?: string | null
          capacity?: number
          created_at?: string
          enclosure_tag?: string
          enclosure_type?: string
          id?: string
          installed_status?: string
          latitude?: number | null
          longitude?: number | null
          node_id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          splice_count?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_enclosures_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_enclosures_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "fiber_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_enclosures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_enclosures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_nodes: {
        Row: {
          address: string | null
          created_at: string
          elevation_ft: number
          id: string
          latitude: number
          longitude: number
          node_tag: string
          node_type: string
          notes: string | null
          organization_id: string
          project_id: string
          size_description: string
          slack_loop_ft: number
          status: string
          structure_depth_ft: number
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          elevation_ft?: number
          id?: string
          latitude: number
          longitude: number
          node_tag: string
          node_type: string
          notes?: string | null
          organization_id: string
          project_id: string
          size_description?: string
          slack_loop_ft?: number
          status?: string
          structure_depth_ft?: number
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          elevation_ft?: number
          id?: string
          latitude?: number
          longitude?: number
          node_tag?: string
          node_type?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          size_description?: string
          slack_loop_ft?: number
          status?: string
          structure_depth_ft?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_patch_cords: {
        Row: {
          connector_a: string | null
          connector_b: string | null
          created_at: string
          from_fdu_id: string | null
          from_fpp_id: string | null
          id: string
          jumper_type: string
          length_feet: number
          notes: string | null
          organization_id: string
          patch_cord_tag: string
          polarity: string | null
          project_id: string
          status: string
          to_fpp_id: string | null
          to_port_id: string | null
          updated_at: string | null
        }
        Insert: {
          connector_a?: string | null
          connector_b?: string | null
          created_at?: string
          from_fdu_id?: string | null
          from_fpp_id?: string | null
          id?: string
          jumper_type: string
          length_feet?: number
          notes?: string | null
          organization_id: string
          patch_cord_tag: string
          polarity?: string | null
          project_id: string
          status?: string
          to_fpp_id?: string | null
          to_port_id?: string | null
          updated_at?: string | null
        }
        Update: {
          connector_a?: string | null
          connector_b?: string | null
          created_at?: string
          from_fdu_id?: string | null
          from_fpp_id?: string | null
          id?: string
          jumper_type?: string
          length_feet?: number
          notes?: string | null
          organization_id?: string
          patch_cord_tag?: string
          polarity?: string | null
          project_id?: string
          status?: string
          to_fpp_id?: string | null
          to_port_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_patch_cords_from_fdu_id_fkey"
            columns: ["from_fdu_id"]
            isOneToOne: false
            referencedRelation: "fiber_distribution_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_cords_from_fpp_id_fkey"
            columns: ["from_fpp_id"]
            isOneToOne: false
            referencedRelation: "fiber_patch_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_cords_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_cords_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_cords_to_fpp_id_fkey"
            columns: ["to_fpp_id"]
            isOneToOne: false
            referencedRelation: "fiber_patch_panels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_cords_to_port_id_fkey"
            columns: ["to_port_id"]
            isOneToOne: false
            referencedRelation: "switch_ports"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_patch_panels: {
        Row: {
          assigned_fdu_id: string | null
          cabinet_id: string | null
          created_at: string
          fpp_tag: string
          id: string
          organization_id: string
          port_count: number
          project_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_fdu_id?: string | null
          cabinet_id?: string | null
          created_at?: string
          fpp_tag: string
          id?: string
          organization_id: string
          port_count?: number
          project_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_fdu_id?: string | null
          cabinet_id?: string | null
          created_at?: string
          fpp_tag?: string
          id?: string
          organization_id?: string
          port_count?: number
          project_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_patch_panels_assigned_fdu_id_fkey"
            columns: ["assigned_fdu_id"]
            isOneToOne: false
            referencedRelation: "fiber_distribution_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_panels_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_panels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_patch_panels_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_route_segments: {
        Row: {
          created_at: string
          end_latitude: number
          end_longitude: number
          id: string
          length_feet: number
          organization_id: string
          project_id: string
          route_id: string
          segment_index: number
          slack_feet: number
          start_latitude: number
          start_longitude: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          end_latitude: number
          end_longitude: number
          id?: string
          length_feet?: number
          organization_id: string
          project_id: string
          route_id: string
          segment_index: number
          slack_feet?: number
          start_latitude: number
          start_longitude: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          end_latitude?: number
          end_longitude?: number
          id?: string
          length_feet?: number
          organization_id?: string
          project_id?: string
          route_id?: string
          segment_index?: number
          slack_feet?: number
          start_latitude?: number
          start_longitude?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_route_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_route_segments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_route_segments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "fiber_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_routes: {
        Row: {
          conduit_diameter_inches: number
          created_at: string
          fill_percentage: number
          id: string
          installation_type: string
          installed_length_feet: number
          measured_length_feet: number
          organization_id: string
          project_id: string
          route_id_tag: string
          route_purpose: string
          slack_percentage: number
          spare_capacity: number
          updated_at: string | null
        }
        Insert: {
          conduit_diameter_inches?: number
          created_at?: string
          fill_percentage?: number
          id?: string
          installation_type?: string
          installed_length_feet?: number
          measured_length_feet?: number
          organization_id: string
          project_id: string
          route_id_tag: string
          route_purpose?: string
          slack_percentage?: number
          spare_capacity?: number
          updated_at?: string | null
        }
        Update: {
          conduit_diameter_inches?: number
          created_at?: string
          fill_percentage?: number
          id?: string
          installation_type?: string
          installed_length_feet?: number
          measured_length_feet?: number
          organization_id?: string
          project_id?: string
          route_id_tag?: string
          route_purpose?: string
          slack_percentage?: number
          spare_capacity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_routes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_splice_records: {
        Row: {
          assigned_camera_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          enclosure_id: string
          from_cable_id: string
          from_strand_id: string
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          splice_loss_db: number | null
          splice_status: string
          splice_type: string
          test_status: string
          to_cable_id: string
          to_strand_id: string
          tray_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_camera_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          enclosure_id: string
          from_cable_id: string
          from_strand_id: string
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          splice_loss_db?: number | null
          splice_status?: string
          splice_type?: string
          test_status?: string
          to_cable_id: string
          to_strand_id: string
          tray_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_camera_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          enclosure_id?: string
          from_cable_id?: string
          from_strand_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          splice_loss_db?: number | null
          splice_status?: string
          splice_type?: string
          test_status?: string
          to_cable_id?: string
          to_strand_id?: string
          tray_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_splice_records_assigned_camera_id_fkey"
            columns: ["assigned_camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_enclosure_id_fkey"
            columns: ["enclosure_id"]
            isOneToOne: false
            referencedRelation: "fiber_enclosures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_from_cable_id_fkey"
            columns: ["from_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_from_strand_id_fkey"
            columns: ["from_strand_id"]
            isOneToOne: false
            referencedRelation: "fiber_strands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_to_cable_id_fkey"
            columns: ["to_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_to_strand_id_fkey"
            columns: ["to_strand_id"]
            isOneToOne: false
            referencedRelation: "fiber_strands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_splice_records_tray_id_fkey"
            columns: ["tray_id"]
            isOneToOne: false
            referencedRelation: "splice_trays"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_strands: {
        Row: {
          assigned_camera_id: string | null
          assigned_purpose: string | null
          buffer_tube_id: string | null
          cable_id: string
          created_at: string
          fiber_color: string
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          splice_status: string
          status: string
          strand_color: string | null
          strand_number: number
          test_status: string
          tube_color: string
          updated_at: string | null
        }
        Insert: {
          assigned_camera_id?: string | null
          assigned_purpose?: string | null
          buffer_tube_id?: string | null
          cable_id: string
          created_at?: string
          fiber_color: string
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          splice_status?: string
          status?: string
          strand_color?: string | null
          strand_number: number
          test_status?: string
          tube_color: string
          updated_at?: string | null
        }
        Update: {
          assigned_camera_id?: string | null
          assigned_purpose?: string | null
          buffer_tube_id?: string | null
          cable_id?: string
          created_at?: string
          fiber_color?: string
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          splice_status?: string
          status?: string
          strand_color?: string | null
          strand_number?: number
          test_status?: string
          tube_color?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiber_strands_assigned_camera_id_fkey"
            columns: ["assigned_camera_id"]
            isOneToOne: false
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_strands_buffer_tube_id_fkey"
            columns: ["buffer_tube_id"]
            isOneToOne: false
            referencedRelation: "fiber_buffer_tubes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_strands_cable_id_fkey"
            columns: ["cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_strands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiber_strands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      field_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      network_devices: {
        Row: {
          cabinet_id: string | null
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          ip_address: string | null
          latitude: number | null
          location_reference: string | null
          longitude: number | null
          manufacturer: string | null
          model_number: string | null
          name: string
          poe_budget_watts: number
          project_id: string
          rack_unit: string | null
          status: string
          total_ports: number | null
          updated_at: string | null
        }
        Insert: {
          cabinet_id?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          ip_address?: string | null
          latitude?: number | null
          location_reference?: string | null
          longitude?: number | null
          manufacturer?: string | null
          model_number?: string | null
          name: string
          poe_budget_watts?: number
          project_id: string
          rack_unit?: string | null
          status?: string
          total_ports?: number | null
          updated_at?: string | null
        }
        Update: {
          cabinet_id?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          ip_address?: string | null
          latitude?: number | null
          location_reference?: string | null
          longitude?: number | null
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          poe_budget_watts?: number
          project_id?: string
          rack_unit?: string | null
          status?: string
          total_ports?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "network_devices_cabinet_id_fkey"
            columns: ["cabinet_id"]
            isOneToOne: false
            referencedRelation: "cabinets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "network_devices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          profile_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          theme_preference: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          theme_preference?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_coordinate_points: {
        Row: {
          created_at: string
          default_gateway: string | null
          description: string | null
          device_id: string
          device_type: string | null
          id: string
          ip_address: string | null
          is_read_only: boolean | null
          latitude: number
          longitude: number
          organization_id: string | null
          project_id: string
          source_name: string | null
          subnet_mask: string | null
          updated_at: string
          vlan: string | null
        }
        Insert: {
          created_at?: string
          default_gateway?: string | null
          description?: string | null
          device_id: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_read_only?: boolean | null
          latitude: number
          longitude: number
          organization_id?: string | null
          project_id: string
          source_name?: string | null
          subnet_mask?: string | null
          updated_at?: string
          vlan?: string | null
        }
        Update: {
          created_at?: string
          default_gateway?: string | null
          description?: string | null
          device_id?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_read_only?: boolean | null
          latitude?: number
          longitude?: number
          organization_id?: string | null
          project_id?: string
          source_name?: string | null
          subnet_mask?: string | null
          updated_at?: string
          vlan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_coordinate_points_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_coordinate_points_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          description: string | null
          disciplines: string[]
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          description?: string | null
          disciplines?: string[]
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          description?: string | null
          disciplines?: string[]
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      splice_trays: {
        Row: {
          capacity: number
          created_at: string
          enclosure_id: string
          id: string
          notes: string | null
          organization_id: string
          project_id: string
          tray_number: number
          updated_at: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string
          enclosure_id: string
          id?: string
          notes?: string | null
          organization_id: string
          project_id: string
          tray_number: number
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string
          enclosure_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          project_id?: string
          tray_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "splice_trays_enclosure_id_fkey"
            columns: ["enclosure_id"]
            isOneToOne: false
            referencedRelation: "fiber_enclosures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splice_trays_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "splice_trays_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      switch_ports: {
        Row: {
          assigned_camera_location_id: string | null
          assigned_device_type: Database["public"]["Enums"]["port_assignment_type"]
          assigned_fiber_cable_id: string | null
          assigned_fiber_strand_id: string | null
          created_at: string
          id: string
          network_device_id: string
          poe_budget_watts: number
          poe_enabled: boolean
          port_name: string | null
          port_number: number
          port_type: Database["public"]["Enums"]["port_media_type"]
          speed_mbps: number
          status: string
          updated_at: string | null
          vlan_id: number
        }
        Insert: {
          assigned_camera_location_id?: string | null
          assigned_device_type?: Database["public"]["Enums"]["port_assignment_type"]
          assigned_fiber_cable_id?: string | null
          assigned_fiber_strand_id?: string | null
          created_at?: string
          id?: string
          network_device_id: string
          poe_budget_watts?: number
          poe_enabled?: boolean
          port_name?: string | null
          port_number: number
          port_type?: Database["public"]["Enums"]["port_media_type"]
          speed_mbps?: number
          status?: string
          updated_at?: string | null
          vlan_id?: number
        }
        Update: {
          assigned_camera_location_id?: string | null
          assigned_device_type?: Database["public"]["Enums"]["port_assignment_type"]
          assigned_fiber_cable_id?: string | null
          assigned_fiber_strand_id?: string | null
          created_at?: string
          id?: string
          network_device_id?: string
          poe_budget_watts?: number
          poe_enabled?: boolean
          port_name?: string | null
          port_number?: number
          port_type?: Database["public"]["Enums"]["port_media_type"]
          speed_mbps?: number
          status?: string
          updated_at?: string | null
          vlan_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "switch_ports_assigned_camera_location_id_fkey"
            columns: ["assigned_camera_location_id"]
            isOneToOne: true
            referencedRelation: "camera_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "switch_ports_assigned_fiber_cable_id_fkey"
            columns: ["assigned_fiber_cable_id"]
            isOneToOne: false
            referencedRelation: "fiber_cables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "switch_ports_assigned_fiber_strand_id_fkey"
            columns: ["assigned_fiber_strand_id"]
            isOneToOne: false
            referencedRelation: "fiber_strands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "switch_ports_network_device_id_fkey"
            columns: ["network_device_id"]
            isOneToOne: false
            referencedRelation: "network_devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_camera_to_switch_port: {
        Args: { camera_id: string; switch_port_id: string }
        Returns: undefined
      }
      is_org_admin: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string; user_id: string }
        Returns: boolean
      }
      seed_wst_seg6_coordinates: {
        Args: { target_project_id: string }
        Returns: undefined
      }
      unassign_camera_from_switch_port: {
        Args: { camera_id: string }
        Returns: undefined
      }
      update_fiber_strand_utilization_status_for_id: {
        Args: { p_strand_id: string }
        Returns: undefined
      }
    }
    Enums: {
      bom_source_type: "catalog" | "custom"
      camera_status:
        | "planned"
        | "in_progress"
        | "complete"
        | "issue"
        | "unknown"
      comm_type: "copper" | "fiber" | "wireless"
      device_type:
        | "switch"
        | "nvr"
        | "router"
        | "patch_panel"
        | "other"
        | "cabinet_device"
        | "Industrial Switch"
        | "Wireless Radio"
        | "UPS"
        | "Media Converter"
        | "Power Supply"
        | "Custom"
      fiber_node_type:
        | "handhole"
        | "pull_box"
        | "splice_enclosure"
        | "cabinet"
        | "building_entry"
      port_assignment_type:
        | "camera"
        | "device"
        | "uplink"
        | "unused"
        | "downlink"
        | "management"
        | "unassigned"
      port_media_type:
        | "copper"
        | "fiber"
        | "rj45"
        | "sfp"
        | "sfp_plus"
        | "qsfp"
        | "fiber_uplink"
        | "fiber_lc"
      power_type: "poe" | "poe+" | "local" | "solar"
      route_purpose:
        | "camera_backbone"
        | "camera_drop"
        | "network_backbone"
        | "power_monitoring"
        | "spare"
      splice_status: "planned" | "installed" | "tested" | "abandoned"
      task_status: "pending" | "in_progress" | "completed" | "blocked"
      user_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bom_source_type: ["catalog", "custom"],
      camera_status: ["planned", "in_progress", "complete", "issue", "unknown"],
      comm_type: ["copper", "fiber", "wireless"],
      device_type: [
        "switch",
        "nvr",
        "router",
        "patch_panel",
        "other",
        "cabinet_device",
        "Industrial Switch",
        "Wireless Radio",
        "UPS",
        "Media Converter",
        "Power Supply",
        "Custom",
      ],
      fiber_node_type: [
        "handhole",
        "pull_box",
        "splice_enclosure",
        "cabinet",
        "building_entry",
      ],
      port_assignment_type: [
        "camera",
        "device",
        "uplink",
        "unused",
        "downlink",
        "management",
        "unassigned",
      ],
      port_media_type: [
        "copper",
        "fiber",
        "rj45",
        "sfp",
        "sfp_plus",
        "qsfp",
        "fiber_uplink",
        "fiber_lc",
      ],
      power_type: ["poe", "poe+", "local", "solar"],
      route_purpose: [
        "camera_backbone",
        "camera_drop",
        "network_backbone",
        "power_monitoring",
        "spare",
      ],
      splice_status: ["planned", "installed", "tested", "abandoned"],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      user_role: ["owner", "admin", "member"],
    },
  },
} as const
