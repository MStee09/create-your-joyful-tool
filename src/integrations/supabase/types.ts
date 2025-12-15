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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      awards: {
        Row: {
          bid_event_id: string
          created_at: string
          id: string
          notes: string | null
          quantity: number
          user_id: string
          vendor_quote_id: string
        }
        Insert: {
          bid_event_id: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity: number
          user_id: string
          vendor_quote_id: string
        }
        Update: {
          bid_event_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          quantity?: number
          user_id?: string
          vendor_quote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_bid_event_id_fkey"
            columns: ["bid_event_id"]
            isOneToOne: false
            referencedRelation: "bid_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_vendor_quote_id_fkey"
            columns: ["vendor_quote_id"]
            isOneToOne: false
            referencedRelation: "vendor_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_events: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          invited_vendor_ids: string[] | null
          name: string
          notes: string | null
          season_id: string | null
          status: string | null
          updated_at: string
          user_id: string
          vendor_invitations: Json | null
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          invited_vendor_ids?: string[] | null
          name: string
          notes?: string | null
          season_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          vendor_invitations?: Json | null
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          invited_vendor_ids?: string[] | null
          name?: string
          notes?: string | null
          season_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          vendor_invitations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_specs: {
        Row: {
          analysis: Json | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          unit: string | null
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          unit?: string | null
          user_id: string
        }
        Update: {
          analysis?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          container_count: number | null
          created_at: string
          id: string
          packaging_name: string | null
          packaging_size: number | null
          product_id: string
          quantity: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          container_count?: number | null
          created_at?: string
          id?: string
          packaging_name?: string | null
          packaging_size?: number | null
          product_id: string
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          container_count?: number | null
          created_at?: string
          id?: string
          packaging_name?: string | null
          packaging_size?: number | null
          product_id?: string
          quantity?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      price_book: {
        Row: {
          commodity_spec_id: string | null
          created_at: string
          effective_date: string | null
          id: string
          notes: string | null
          price: number
          product_id: string | null
          season_id: string | null
          source: string | null
          unit: string | null
          user_id: string
          vendor_id: string | null
        }
        Insert: {
          commodity_spec_id?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          price: number
          product_id?: string | null
          season_id?: string | null
          source?: string | null
          unit?: string | null
          user_id: string
          vendor_id?: string | null
        }
        Update: {
          commodity_spec_id?: string | null
          created_at?: string
          effective_date?: string | null
          id?: string
          notes?: string | null
          price?: number
          product_id?: string | null
          season_id?: string | null
          source?: string | null
          unit?: string | null
          user_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_book_commodity_spec_id_fkey"
            columns: ["commodity_spec_id"]
            isOneToOne: false
            referencedRelation: "commodity_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_book_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_masters: {
        Row: {
          analysis: Json | null
          category: string | null
          created_at: string
          crop_rate_notes: string | null
          default_unit: string | null
          density_lbs_per_gal: number | null
          form: string
          general_notes: string | null
          id: string
          label_file_name: string | null
          mixing_notes: string | null
          name: string
          reorder_point: number | null
          sds_file_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          category?: string | null
          created_at?: string
          crop_rate_notes?: string | null
          default_unit?: string | null
          density_lbs_per_gal?: number | null
          form?: string
          general_notes?: string | null
          id?: string
          label_file_name?: string | null
          mixing_notes?: string | null
          name: string
          reorder_point?: number | null
          sds_file_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          category?: string | null
          created_at?: string
          crop_rate_notes?: string | null
          default_unit?: string | null
          density_lbs_per_gal?: number | null
          form?: string
          general_notes?: string | null
          id?: string
          label_file_name?: string | null
          mixing_notes?: string | null
          name?: string
          reorder_point?: number | null
          sds_file_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          crops: Json | null
          id: string
          name: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          crops?: Json | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          crops?: Json | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      vendor_offerings: {
        Row: {
          created_at: string
          freight_terms: string | null
          id: string
          is_preferred: boolean | null
          last_quoted_date: string | null
          min_order: string | null
          packaging_options: Json | null
          price: number
          price_unit: string | null
          product_id: string
          sku: string | null
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          freight_terms?: string | null
          id?: string
          is_preferred?: boolean | null
          last_quoted_date?: string | null
          min_order?: string | null
          packaging_options?: Json | null
          price?: number
          price_unit?: string | null
          product_id: string
          sku?: string | null
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          freight_terms?: string | null
          id?: string
          is_preferred?: boolean | null
          last_quoted_date?: string | null
          min_order?: string | null
          packaging_options?: Json | null
          price?: number
          price_unit?: string | null
          product_id?: string
          sku?: string | null
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_offerings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_offerings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_quotes: {
        Row: {
          bid_event_id: string
          commodity_spec_id: string
          created_at: string
          delivery_terms: string | null
          id: string
          notes: string | null
          price: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          bid_event_id: string
          commodity_spec_id: string
          created_at?: string
          delivery_terms?: string | null
          id?: string
          notes?: string | null
          price: number
          user_id: string
          vendor_id: string
        }
        Update: {
          bid_event_id?: string
          commodity_spec_id?: string
          created_at?: string
          delivery_terms?: string | null
          id?: string
          notes?: string | null
          price?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_quotes_bid_event_id_fkey"
            columns: ["bid_event_id"]
            isOneToOne: false
            referencedRelation: "bid_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_commodity_spec_id_fkey"
            columns: ["commodity_spec_id"]
            isOneToOne: false
            referencedRelation: "commodity_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_quotes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contacts: Json | null
          created_at: string
          documents: Json | null
          id: string
          name: string
          notes: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          created_at?: string
          documents?: Json | null
          id?: string
          name: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contacts?: Json | null
          created_at?: string
          documents?: Json | null
          id?: string
          name?: string
          notes?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
