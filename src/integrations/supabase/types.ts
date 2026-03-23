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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      localist_contacts: {
        Row: {
          address: string | null
          biz: string | null
          cat: string | null
          city: string | null
          contact_id: string
          county: string | null
          county_pushed: boolean
          first_name: string | null
          ghl_contact_id: string | null
          gift_count: number | null
          id: string
          last_name: string | null
          last_order_date: string | null
          last_service_date: string | null
          latitude: number | null
          lifetime_value: number | null
          location: unknown
          location_id: string | null
          longitude: number | null
          order_count: number | null
          phone: string | null
          rep_id: string
          rep_number: string | null
          rlt: string | null
          source: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          biz?: string | null
          cat?: string | null
          city?: string | null
          contact_id: string
          county?: string | null
          county_pushed?: boolean
          first_name?: string | null
          ghl_contact_id?: string | null
          gift_count?: number | null
          id?: string
          last_name?: string | null
          last_order_date?: string | null
          last_service_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          location?: unknown
          location_id?: string | null
          longitude?: number | null
          order_count?: number | null
          phone?: string | null
          rep_id: string
          rep_number?: string | null
          rlt?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          biz?: string | null
          cat?: string | null
          city?: string | null
          contact_id?: string
          county?: string | null
          county_pushed?: boolean
          first_name?: string | null
          ghl_contact_id?: string | null
          gift_count?: number | null
          id?: string
          last_name?: string | null
          last_order_date?: string | null
          last_service_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          location?: unknown
          location_id?: string | null
          longitude?: number | null
          order_count?: number | null
          phone?: string | null
          rep_id?: string
          rep_number?: string | null
          rlt?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "localist_contacts_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "localist_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      localist_reps: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          ghl_access_token: string | null
          ghl_expires_at: string | null
          ghl_location_id: string | null
          ghl_refresh_token: string | null
          id: string
          location_id: string | null
          rep_number: string | null
          stripe_customer_id: string | null
          subscription_tier: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id: string
          location_id?: string | null
          rep_number?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id?: string
          location_id?: string | null
          rep_number?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string | null
        }
        Relationships: []
      }
      sms_rate_limits: {
        Row: {
          daily_count: number
          daily_start: string
          id: string
          location_id: string
          send_count: number
          window_start: string
        }
        Insert: {
          daily_count?: number
          daily_start?: string
          id?: string
          location_id: string
          send_count?: number
          window_start?: string
        }
        Update: {
          daily_count?: number
          daily_start?: string
          id?: string
          location_id?: string
          send_count?: number
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_rep_profile: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          ghl_location_id: string
          id: string
          rep_number: string
          subscription_tier: string
        }[]
      }
      increment_sms_rate_limit: {
        Args: {
          p_count: number
          p_location_id: string
          p_today: string
          p_window_start: string
        }
        Returns: undefined
      }
      nearby_contacts: {
        Args: {
          center_lat: number
          center_lng: number
          radius_miles: number
          rep: string
        }
        Returns: {
          address: string
          biz: string
          cat: string
          city: string
          county: string
          distance_miles: number
          first_name: string
          gift_count: number
          id: string
          last_name: string
          last_order_date: string
          last_service_date: string
          latitude: number
          lifetime_value: number
          longitude: number
          order_count: number
          phone: string
          rlt: string
          state: string
          zip: string
        }[]
      }
      nearby_contacts_page: {
        Args: {
          center_lat: number
          center_lng: number
          p_limit?: number
          p_offset?: number
          radius_miles: number
          rep: string
        }
        Returns: {
          address: string
          biz: string
          cat: string
          city: string
          contact_id: string
          county: string
          distance_miles: number
          first_name: string
          gift_count: number
          id: string
          last_name: string
          last_order_date: string
          last_service_date: string
          latitude: number
          lifetime_value: number
          longitude: number
          order_count: number
          phone: string
          rlt: string
          state: string
          total_count: number
          zip: string
        }[]
      }
      nearby_contacts_page_auth: {
        Args: {
          center_lat: number
          center_lng: number
          p_limit?: number
          p_offset?: number
          radius_miles: number
          rep: string
        }
        Returns: {
          address: string
          biz: string
          cat: string
          city: string
          county: string
          distance_miles: number
          first_name: string
          gift_count: number
          id: string
          last_name: string
          last_order_date: string
          last_service_date: string
          latitude: number
          lifetime_value: number
          longitude: number
          order_count: number
          phone: string
          rlt: string
          state: string
          total_count: number
          zip: string
        }[]
      }
      nearby_contacts_service: {
        Args: {
          center_lat: number
          center_lng: number
          radius_miles: number
          rep: string
        }
        Returns: {
          address: string
          biz: string
          cat: string
          city: string
          contact_id: string
          county: string
          distance_miles: number
          first_name: string
          gift_count: number
          id: string
          last_name: string
          last_order_date: string
          last_service_date: string
          latitude: number
          lifetime_value: number
          longitude: number
          order_count: number
          phone: string
          rlt: string
          state: string
          zip: string
        }[]
      }
      nearby_map_markers: {
        Args: {
          center_lat: number
          center_lng: number
          radius_miles: number
          rep: string
        }
        Returns: {
          distance_miles: number
          id: string
          latitude: number
          lifetime_value: number
          longitude: number
        }[]
      }
      nearby_map_markers_auth: {
        Args: {
          center_lat: number
          center_lng: number
          radius_miles: number
          rep: string
        }
        Returns: {
          distance_miles: number
          id: string
          latitude: number
          lifetime_value: number
          longitude: number
        }[]
      }
      smart_upsert_ghl_contacts:
        | { Args: { p_contacts: Json }; Returns: number }
        | { Args: { p_contacts: Json; p_rep_id: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
