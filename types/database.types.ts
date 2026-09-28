// Generado desde el esquema real de Supabase (MCP generate_typescript_types /
// `supabase gen types typescript`). No editar a mano: regenerar después de cada migración.

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
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      household_store_preferences: {
        Row: {
          household_id: string
          store_id: string
          visible: boolean
        }
        Insert: {
          household_id: string
          store_id: string
          visible?: boolean
        }
        Update: {
          household_id?: string
          store_id?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "household_store_preferences_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          quantity_requested: number
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          product_catalog_variant_id: string
          quantity_requested?: number
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          product_catalog_variant_id?: string
          quantity_requested?: number
        }
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_product_catalog_variant_id_fkey"
            columns: ["product_catalog_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          owner_id: string
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          owner_id?: string
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          owner_id?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      product_brands: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          product_catalog_variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          product_catalog_variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          product_catalog_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_brands_product_catalog_variant_id_fkey"
            columns: ["product_catalog_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalog: {
        Row: {
          category_id: string | null
          created_at: string
          household_id: string | null
          id: string
          name: string
          source: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          name: string
          source?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          name?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalog_staging: {
        Row: {
          id: string
          image_url: string | null
          matched_brand_id: string | null
          matched_variant_id: string | null
          raw_json: Json
          scraped_at: string
          scraped_brand: string | null
          scraped_name: string | null
          scraped_size_text: string | null
          status: string
          store_id: string
        }
        Insert: {
          id?: string
          image_url?: string | null
          matched_brand_id?: string | null
          matched_variant_id?: string | null
          raw_json: Json
          scraped_at?: string
          scraped_brand?: string | null
          scraped_name?: string | null
          scraped_size_text?: string | null
          status?: string
          store_id: string
        }
        Update: {
          id?: string
          image_url?: string | null
          matched_brand_id?: string | null
          matched_variant_id?: string | null
          raw_json?: Json
          scraped_at?: string
          scraped_brand?: string | null
          scraped_name?: string | null
          scraped_size_text?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_staging_matched_brand_id_fkey"
            columns: ["matched_brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_staging_matched_variant_id_fkey"
            columns: ["matched_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_staging_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalog_variants: {
        Row: {
          base_quantity: number
          base_unit: string
          created_at: string
          id: string
          image_url: string | null
          name: string
          product_catalog_id: string
        }
        Insert: {
          base_quantity: number
          base_unit: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          product_catalog_id: string
        }
        Update: {
          base_quantity?: number
          base_unit?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          product_catalog_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_variants_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          captured_at: string
          id: number
          is_available: boolean
          list_price: number | null
          price: number
          product_brand_id: string
          product_catalog_variant_id: string
          source: string
          store_id: string
        }
        Insert: {
          captured_at?: string
          id?: number
          is_available?: boolean
          list_price?: number | null
          price: number
          product_brand_id: string
          product_catalog_variant_id: string
          source?: string
          store_id: string
        }
        Update: {
          captured_at?: string
          id?: number
          is_available?: boolean
          list_price?: number | null
          price?: number
          product_brand_id?: string
          product_catalog_variant_id?: string
          source?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_brand_id_fkey"
            columns: ["product_brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_catalog_variant_id_fkey"
            columns: ["product_catalog_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      search_cache: {
        Row: {
          cached_at: string
          normalized_query: string
          staging_ids: string[]
          store_id: string
        }
        Insert: {
          cached_at?: string
          normalized_query: string
          staging_ids: string[]
          store_id: string
        }
        Update: {
          cached_at?: string
          normalized_query?: string
          staging_ids?: string[]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_cache_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      search_log: {
        Row: {
          id: number
          query: string
          result_count: number
          searched_at: string
          source: string
          store_id: string
        }
        Insert: {
          id?: number
          query: string
          result_count?: number
          searched_at?: string
          source: string
          store_id: string
        }
        Update: {
          id?: number
          query?: string
          result_count?: number
          searched_at?: string
          source?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          base_url: string
          display_name: string
          id: string
          slug: string
        }
        Insert: {
          base_url: string
          display_name: string
          id?: string
          slug: string
        }
        Update: {
          base_url?: string
          display_name?: string
          id?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_prices: {
        Row: {
          captured_at: string | null
          is_available: boolean | null
          list_price: number | null
          price: number | null
          product_brand_id: string | null
          product_catalog_variant_id: string | null
          source: string | null
          store_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_brand_id_fkey"
            columns: ["product_brand_id"]
            isOneToOne: false
            referencedRelation: "product_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_catalog_variant_id_fkey"
            columns: ["product_catalog_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_item_to_general_list: {
        Args: { target_variant_id: string }
        Returns: {
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_item_quantity: {
        Args: { quantity_delta: number; target_item_id: string }
        Returns: {
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_recent_staging: {
        Args: { row_limit?: number; store_slug: string }
        Returns: {
          id: string
          image_url: string
          scraped_at: string
          scraped_brand: string
          scraped_name: string
          scraped_size_text: string
          status: string
        }[]
      }
      normalize_pending_staging: {
        Args: { batch_size?: number }
        Returns: {
          matched: number
          processed: number
          rejected: number
        }[]
      }
      normalize_staging_row: {
        Args: { staging_id: string }
        Returns: {
          error_message: string
          product_brand_id: string
          product_catalog_id: string
          product_variant_id: string
          success: boolean
        }[]
      }
      parse_size_text: {
        Args: { size_text: string }
        Returns: {
          base_quantity: number
          base_unit: string
        }[]
      }
      search_catalog: {
        Args: { household_id?: string; search_term?: string }
        Returns: {
          category: string
          name: string
          product_catalog_id: string
          variants: Json
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
