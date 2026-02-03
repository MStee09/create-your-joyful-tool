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
      application_records: {
        Row: {
          acres_treated: number
          applicator: string
          carrier_gpa: number | null
          created_at: string
          crop_id: string
          custom_applicator_name: string | null
          date_applied: string
          equipment_id: string | null
          field_id: string
          id: string
          notes: string | null
          overridden_warnings: Json | null
          products: Json
          season_id: string | null
          timing_id: string
          updated_at: string
          user_id: string
          weather_notes: string | null
        }
        Insert: {
          acres_treated?: number
          applicator?: string
          carrier_gpa?: number | null
          created_at?: string
          crop_id: string
          custom_applicator_name?: string | null
          date_applied?: string
          equipment_id?: string | null
          field_id: string
          id?: string
          notes?: string | null
          overridden_warnings?: Json | null
          products?: Json
          season_id?: string | null
          timing_id: string
          updated_at?: string
          user_id: string
          weather_notes?: string | null
        }
        Update: {
          acres_treated?: number
          applicator?: string
          carrier_gpa?: number | null
          created_at?: string
          crop_id?: string
          custom_applicator_name?: string | null
          date_applied?: string
          equipment_id?: string | null
          field_id?: string
          id?: string
          notes?: string | null
          overridden_warnings?: Json | null
          products?: Json
          season_id?: string | null
          timing_id?: string
          updated_at?: string
          user_id?: string
          weather_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_records_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_records_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
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
          product_id: string | null
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
          product_id?: string | null
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
          product_id?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commodity_specs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          created_at: string
          default_carrier_gpa: number | null
          id: string
          name: string
          notes: string | null
          tank_size: number
          tank_unit: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_carrier_gpa?: number | null
          id?: string
          name: string
          notes?: string | null
          tank_size?: number
          tank_unit?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_carrier_gpa?: number | null
          id?: string
          name?: string
          notes?: string | null
          tank_size?: number
          tank_unit?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      field_assignments: {
        Row: {
          acres: number
          actual_yield: number | null
          created_at: string
          crop_id: string
          field_id: string
          id: string
          notes: string | null
          planned_acres: number | null
          previous_crop_id: string | null
          previous_crop_name: string | null
          season_id: string | null
          user_id: string
          yield_goal: number | null
          yield_unit: string | null
        }
        Insert: {
          acres?: number
          actual_yield?: number | null
          created_at?: string
          crop_id: string
          field_id: string
          id?: string
          notes?: string | null
          planned_acres?: number | null
          previous_crop_id?: string | null
          previous_crop_name?: string | null
          season_id?: string | null
          user_id: string
          yield_goal?: number | null
          yield_unit?: string | null
        }
        Update: {
          acres?: number
          actual_yield?: number | null
          created_at?: string
          crop_id?: string
          field_id?: string
          id?: string
          notes?: string | null
          planned_acres?: number | null
          previous_crop_id?: string | null
          previous_crop_name?: string | null
          season_id?: string | null
          user_id?: string
          yield_goal?: number | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_assignments_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_assignments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      field_crop_overrides: {
        Row: {
          application_id: string
          created_at: string
          custom_rate: number | null
          custom_unit: string | null
          field_assignment_id: string
          id: string
          notes: string | null
          override_type: string
          product_id: string | null
          rate_adjustment: number | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          custom_rate?: number | null
          custom_unit?: string | null
          field_assignment_id: string
          id?: string
          notes?: string | null
          override_type?: string
          product_id?: string | null
          rate_adjustment?: number | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          custom_rate?: number | null
          custom_unit?: string | null
          field_assignment_id?: string
          id?: string
          notes?: string | null
          override_type?: string
          product_id?: string | null
          rate_adjustment?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_crop_overrides_field_assignment_id_fkey"
            columns: ["field_assignment_id"]
            isOneToOne: false
            referencedRelation: "field_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_crop_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          acres: number
          cec: number | null
          created_at: string
          farm: string | null
          id: string
          name: string
          notes: string | null
          organic_matter: number | null
          ph: number | null
          soil_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acres?: number
          cec?: number | null
          created_at?: string
          farm?: string | null
          id?: string
          name: string
          notes?: string | null
          organic_matter?: number | null
          ph?: number | null
          soil_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acres?: number
          cec?: number | null
          created_at?: string
          farm?: string | null
          id?: string
          name?: string
          notes?: string | null
          organic_matter?: number | null
          ph?: number | null
          soil_type?: string | null
          updated_at?: string
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
      inventory_transactions: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          season_year: number
          type: string
          unit: string
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          season_year: number
          type: string
          unit?: string
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          season_year?: number
          type?: string
          unit?: string
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          charges: Json
          charges_total: number
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json
          notes: string | null
          order_id: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          product_subtotal: number
          received_date: string
          scale_tickets: string[] | null
          season_year: number
          status: string
          total_amount: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          charges?: Json
          charges_total?: number
          created_at?: string
          id?: string
          invoice_date: string
          invoice_number: string
          line_items?: Json
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_subtotal?: number
          received_date?: string
          scale_tickets?: string[] | null
          season_year: number
          status?: string
          total_amount?: number
          user_id: string
          vendor_id: string
        }
        Update: {
          charges?: Json
          charges_total?: number
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json
          notes?: string | null
          order_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          product_subtotal?: number
          received_date?: string
          scale_tickets?: string[] | null
          season_year?: number
          status?: string
          total_amount?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bid_event_id: string | null
          created_at: string
          delivery_window: Json | null
          id: string
          line_items: Json
          notes: string | null
          order_date: string
          order_number: string
          payment_status: string
          prepayment: Json | null
          season_year: number
          status: string
          subtotal: number
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          bid_event_id?: string | null
          created_at?: string
          delivery_window?: Json | null
          id?: string
          line_items?: Json
          notes?: string | null
          order_date?: string
          order_number: string
          payment_status?: string
          prepayment?: Json | null
          season_year: number
          status?: string
          subtotal?: number
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          bid_event_id?: string | null
          created_at?: string
          delivery_window?: Json | null
          id?: string
          line_items?: Json
          notes?: string | null
          order_date?: string
          order_number?: string
          payment_status?: string
          prepayment?: Json | null
          season_year?: number
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bid_event_id_fkey"
            columns: ["bid_event_id"]
            isOneToOne: false
            referencedRelation: "bid_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
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
      price_history: {
        Row: {
          created_at: string
          date: string
          id: string
          product_id: string
          purchase_id: string | null
          season_year: number
          unit: string
          unit_price: number
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          product_id: string
          purchase_id?: string | null
          season_year: number
          unit?: string
          unit_price: number
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          product_id?: string
          purchase_id?: string | null
          season_year?: number
          unit?: string
          unit_price?: number
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_masters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      price_records: {
        Row: {
          created_at: string | null
          date: string
          id: string
          normalized_price: number
          notes: string | null
          package_size: number | null
          package_type: string | null
          package_unit: string | null
          price: number
          product_id: string
          purchase_id: string | null
          quantity_purchased: number | null
          season_year: number
          type: string
          unit: string
          updated_at: string | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          normalized_price: number
          notes?: string | null
          package_size?: number | null
          package_type?: string | null
          package_unit?: string | null
          price: number
          product_id: string
          purchase_id?: string | null
          quantity_purchased?: number | null
          season_year: number
          type?: string
          unit?: string
          updated_at?: string | null
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          normalized_price?: number
          notes?: string | null
          package_size?: number | null
          package_type?: string | null
          package_unit?: string | null
          price?: number
          product_id?: string
          purchase_id?: string | null
          quantity_purchased?: number | null
          season_year?: number
          type?: string
          unit?: string
          updated_at?: string | null
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      product_masters: {
        Row: {
          analysis: Json | null
          baseline_price: number | null
          baseline_price_date: string | null
          baseline_price_unit: string | null
          baseline_price_vendor_id: string | null
          category: string | null
          chemical_data: Json | null
          commodity_spec_id: string | null
          created_at: string
          crop_rate_notes: string | null
          default_unit: string | null
          density_lbs_per_gal: number | null
          estimated_price: number | null
          estimated_price_unit: string | null
          extraction_confidence: string | null
          extraction_source: string | null
          form: string
          general_notes: string | null
          id: string
          is_bid_eligible: boolean
          is_commodity: boolean | null
          label_file_name: string | null
          label_pdf_url: string | null
          last_extracted_at: string | null
          manufacturer: string | null
          manufacturer_website: string | null
          mixing_notes: string | null
          name: string
          product_type: string | null
          reorder_point: number | null
          sds_file_name: string | null
          sds_pdf_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis?: Json | null
          baseline_price?: number | null
          baseline_price_date?: string | null
          baseline_price_unit?: string | null
          baseline_price_vendor_id?: string | null
          category?: string | null
          chemical_data?: Json | null
          commodity_spec_id?: string | null
          created_at?: string
          crop_rate_notes?: string | null
          default_unit?: string | null
          density_lbs_per_gal?: number | null
          estimated_price?: number | null
          estimated_price_unit?: string | null
          extraction_confidence?: string | null
          extraction_source?: string | null
          form?: string
          general_notes?: string | null
          id?: string
          is_bid_eligible?: boolean
          is_commodity?: boolean | null
          label_file_name?: string | null
          label_pdf_url?: string | null
          last_extracted_at?: string | null
          manufacturer?: string | null
          manufacturer_website?: string | null
          mixing_notes?: string | null
          name: string
          product_type?: string | null
          reorder_point?: number | null
          sds_file_name?: string | null
          sds_pdf_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis?: Json | null
          baseline_price?: number | null
          baseline_price_date?: string | null
          baseline_price_unit?: string | null
          baseline_price_vendor_id?: string | null
          category?: string | null
          chemical_data?: Json | null
          commodity_spec_id?: string | null
          created_at?: string
          crop_rate_notes?: string | null
          default_unit?: string | null
          density_lbs_per_gal?: number | null
          estimated_price?: number | null
          estimated_price_unit?: string | null
          extraction_confidence?: string | null
          extraction_source?: string | null
          form?: string
          general_notes?: string | null
          id?: string
          is_bid_eligible?: boolean
          is_commodity?: boolean | null
          label_file_name?: string | null
          label_pdf_url?: string | null
          last_extracted_at?: string | null
          manufacturer?: string | null
          manufacturer_website?: string | null
          mixing_notes?: string | null
          name?: string
          product_type?: string | null
          reorder_point?: number | null
          sds_file_name?: string | null
          sds_pdf_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_masters_commodity_spec_id_fkey"
            columns: ["commodity_spec_id"]
            isOneToOne: false
            referencedRelation: "commodity_specs"
            referencedColumns: ["id"]
          },
        ]
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
      purchases: {
        Row: {
          created_at: string
          date: string
          expected_delivery_date: string | null
          freight_cost: number | null
          freight_notes: string | null
          id: string
          invoice_number: string | null
          line_items: Json
          notes: string | null
          order_date: string | null
          received_date: string | null
          season_id: string | null
          season_year: number
          status: string
          subtotal: number | null
          total: number | null
          total_cost: number
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          expected_delivery_date?: string | null
          freight_cost?: number | null
          freight_notes?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json
          notes?: string | null
          order_date?: string | null
          received_date?: string | null
          season_id?: string | null
          season_year: number
          status?: string
          subtotal?: number | null
          total?: number | null
          total_cost?: number
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          date?: string
          expected_delivery_date?: string | null
          freight_cost?: number | null
          freight_notes?: string | null
          id?: string
          invoice_number?: string | null
          line_items?: Json
          notes?: string | null
          order_date?: string | null
          received_date?: string | null
          season_id?: string | null
          season_year?: number
          status?: string
          subtotal?: number | null
          total?: number | null
          total_cost?: number
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      tank_mix_recipes: {
        Row: {
          carrier_gpa: number
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          products: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier_gpa?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          products?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier_gpa?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          products?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_offerings: {
        Row: {
          container_size: number | null
          container_unit: string | null
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
          container_size?: number | null
          container_unit?: string | null
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
          container_size?: number | null
          container_unit?: string | null
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
