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
          id: string
          part_number: string | null
          project_id: string
          quantity: number
          source: Database["public"]["Enums"]["bom_source_type"]
          unit: string
          unit_cost: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          part_number?: string | null
          project_id: string
          quantity?: number
          source?: Database["public"]["Enums"]["bom_source_type"]
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          part_number?: string | null
          project_id?: string
          quantity?: number
          source?: Database["public"]["Enums"]["bom_source_type"]
          unit?: string
          unit_cost?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"]
          id: string
          ip_address: string | null
          manufacturer: string | null
          model_number: string | null
          name: string
          project_id: string
          rack_unit: string | null
          total_ports: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          ip_address?: string | null
          manufacturer?: string | null
          model_number?: string | null
          name: string
          project_id: string
          rack_unit?: string | null
          total_ports?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"]
          id?: string
          ip_address?: string | null
          manufacturer?: string | null
          model_number?: string | null
          name?: string
          project_id?: string
          rack_unit?: string | null
          total_ports?: number | null
          updated_at?: string | null
        }
        Relationships: [
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
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          default_latitude: number
          default_longitude: number
          default_zoom: number
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          default_latitude?: number
          default_longitude?: number
          default_zoom?: number
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
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
        ]
      }
      switch_ports: {
        Row: {
          assigned_camera_location_id: string | null
          created_at: string
          id: string
          network_device_id: string
          poe_enabled: boolean
          port_number: number
          status: string
          updated_at: string | null
          vlan_id: number
        }
        Insert: {
          assigned_camera_location_id?: string | null
          created_at?: string
          id?: string
          network_device_id: string
          poe_enabled?: boolean
          port_number: number
          status?: string
          updated_at?: string | null
          vlan_id?: number
        }
        Update: {
          assigned_camera_location_id?: string | null
          created_at?: string
          id?: string
          network_device_id?: string
          poe_enabled?: boolean
          port_number?: number
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
      [_ in never]: never
    }
    Enums: {
      bom_source_type: "catalog" | "custom"
      camera_status: "planned" | "in_progress" | "complete" | "issue"
      comm_type: "copper" | "fiber" | "wireless"
      device_type: "switch" | "nvr" | "router" | "patch_panel" | "other"
      port_assignment_type: "camera" | "device" | "uplink" | "unused"
      port_media_type: "copper" | "fiber"
      power_type: "poe" | "poe+" | "local" | "solar"
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
      camera_status: ["planned", "in_progress", "complete", "issue"],
      comm_type: ["copper", "fiber", "wireless"],
      device_type: ["switch", "nvr", "router", "patch_panel", "other"],
      port_assignment_type: ["camera", "device", "uplink", "unused"],
      port_media_type: ["copper", "fiber"],
      power_type: ["poe", "poe+", "local", "solar"],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      user_role: ["owner", "admin", "member"],
    },
  },
} as const
