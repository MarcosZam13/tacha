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
    PostgrestVersion: "14.15"
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
      category_shelf_life: {
        Row: {
          category_id: string
          shelf_life_days: number
        }
        Insert: {
          category_id: string
          shelf_life_days: number
        }
        Update: {
          category_id?: string
          shelf_life_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_shelf_life_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          source: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          source?: string
        }
        Relationships: []
      }
      household_invite_links: {
        Row: {
          created_at: string
          expires_at: string
          household_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          household_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          household_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invite_links_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          personal_lists_decision: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          personal_lists_decision?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          personal_lists_decision?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
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
      households: {
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
      list_item_recipe_requirements: {
        Row: {
          created_at: string
          dismissed_at: string | null
          id: string
          list_item_id: string
          quantity_missing: number
          quantity_needed: number
          quantity_unit: string
          recipe_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          list_item_id: string
          quantity_missing: number
          quantity_needed: number
          quantity_unit: string
          recipe_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string | null
          id?: string
          list_item_id?: string
          quantity_missing?: number
          quantity_needed?: number
          quantity_unit?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_item_recipe_requirements_list_item_id_fkey"
            columns: ["list_item_id"]
            isOneToOne: false
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_item_recipe_requirements_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      list_item_shortfall_snapshots: {
        Row: {
          created_at: string
          list_item_id: string
          previous_quantity_requested: number
          previous_variant_id: string
        }
        Insert: {
          created_at?: string
          list_item_id: string
          previous_quantity_requested: number
          previous_variant_id: string
        }
        Update: {
          created_at?: string
          list_item_id?: string
          previous_quantity_requested?: number
          previous_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_item_shortfall_snapshots_list_item_id_fkey"
            columns: ["list_item_id"]
            isOneToOne: true
            referencedRelation: "list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_item_shortfall_snapshots_previous_variant_id_fkey"
            columns: ["previous_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_suggestion_dismissals: {
        Row: {
          dismissed_by: string | null
          dismissed_until: string
          list_id: string
          product_catalog_id: string
          updated_at: string
        }
        Insert: {
          dismissed_by?: string | null
          dismissed_until: string
          list_id: string
          product_catalog_id: string
          updated_at?: string
        }
        Update: {
          dismissed_by?: string | null
          dismissed_until?: string
          list_id?: string
          product_catalog_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_suggestion_dismissals_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_suggestion_dismissals_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
          shelf_life_choice: string | null
        }
        Insert: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id?: string | null
          quantity_bought?: number | null
          quantity_requested?: number
          shelf_life_choice?: string | null
        }
        Update: {
          assigned_to?: string | null
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          list_id?: string
          product_catalog_variant_id?: string
          purchase_session_id?: string | null
          quantity_bought?: number | null
          quantity_requested?: number
          shelf_life_choice?: string | null
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
          {
            foreignKeyName: "list_items_purchase_session_id_fkey"
            columns: ["purchase_session_id"]
            isOneToOne: false
            referencedRelation: "purchase_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      list_settings: {
        Row: {
          assignee_enabled: boolean
          list_id: string
        }
        Insert: {
          assignee_enabled?: boolean
          list_id: string
        }
        Update: {
          assignee_enabled?: boolean
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_settings_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: true
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
      }
      lists: {
        Row: {
          created_at: string
          event_date: string | null
          household_id: string | null
          id: string
          name: string | null
          owner_id: string
          spent_total: number | null
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          event_date?: string | null
          household_id?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          spent_total?: number | null
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          event_date?: string | null
          household_id?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          spent_total?: number | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lists_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          assigned_cook: string | null
          created_at: string
          date: string
          household_id: string | null
          id: string
          meal_type: string
          owner_id: string
          recipe_id: string
          servings_multiplier: number
        }
        Insert: {
          assigned_cook?: string | null
          created_at?: string
          date: string
          household_id?: string | null
          id?: string
          meal_type: string
          owner_id?: string
          recipe_id: string
          servings_multiplier?: number
        }
        Update: {
          assigned_cook?: string | null
          created_at?: string
          date?: string
          household_id?: string | null
          id?: string
          meal_type?: string
          owner_id?: string
          recipe_id?: string
          servings_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plans_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
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
          archived_at: string | null
          category_id: string | null
          created_at: string
          household_id: string | null
          id: string
          name: string
          owner_id: string | null
          source: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          name: string
          owner_id?: string | null
          source?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          created_at?: string
          household_id?: string | null
          id?: string
          name?: string
          owner_id?: string | null
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
          reference_price: number | null
          reference_store_id: string | null
          reference_store_name: string | null
        }
        Insert: {
          base_quantity: number
          base_unit: string
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          product_catalog_id: string
          reference_price?: number | null
          reference_store_id?: string | null
          reference_store_name?: string | null
        }
        Update: {
          base_quantity?: number
          base_unit?: string
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          product_catalog_id?: string
          reference_price?: number | null
          reference_store_id?: string | null
          reference_store_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_catalog_variants_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_catalog_variants_reference_store_id_fkey"
            columns: ["reference_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_group_items: {
        Row: {
          group_id: string
          id: string
          position: number
          product_catalog_variant_id: string
          quantity: number
        }
        Insert: {
          group_id: string
          id?: string
          position: number
          product_catalog_variant_id: string
          quantity: number
        }
        Update: {
          group_id?: string
          id?: string
          position?: number
          product_catalog_variant_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_group_items_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_group_items_product_catalog_variant_id_fkey"
            columns: ["product_catalog_variant_id"]
            isOneToOne: false
            referencedRelation: "product_catalog_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_groups: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_groups_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mother_rules: {
        Row: {
          created_at: string
          exclude_keywords: string[]
          id: string
          match_keywords: string[]
          product_catalog_id: string
          vtex_category_prefix: string | null
        }
        Insert: {
          created_at?: string
          exclude_keywords?: string[]
          id?: string
          match_keywords?: string[]
          product_catalog_id: string
          vtex_category_prefix?: string | null
        }
        Update: {
          created_at?: string
          exclude_keywords?: string[]
          id?: string
          match_keywords?: string[]
          product_catalog_id?: string
          vtex_category_prefix?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_mother_rules_product_catalog_id_fkey"
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
      purchase_sessions: {
        Row: {
          closed_at: string | null
          household_id: string | null
          id: string
          list_id: string | null
          owner_id: string
          started_at: string
          store_id: string
          total_amount: number | null
        }
        Insert: {
          closed_at?: string | null
          household_id?: string | null
          id?: string
          list_id?: string | null
          owner_id?: string
          started_at?: string
          store_id: string
          total_amount?: number | null
        }
        Update: {
          closed_at?: string | null
          household_id?: string | null
          id?: string
          list_id?: string | null
          owner_id?: string
          started_at?: string
          store_id?: string
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_sessions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_sessions_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_sessions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          position: number
          product_catalog_id: string
          quantity_unit: string
          quantity_value: number
          recipe_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_catalog_id: string
          quantity_unit: string
          quantity_value: number
          recipe_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_catalog_id?: string
          quantity_unit?: string
          quantity_value?: number
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_product_catalog_id_fkey"
            columns: ["product_catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          base_servings: number
          created_at: string
          household_id: string | null
          id: string
          image_url: string | null
          name: string
          owner_id: string
          photo_path: string | null
        }
        Insert: {
          base_servings: number
          created_at?: string
          household_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          owner_id?: string
          photo_path?: string | null
        }
        Update: {
          base_servings?: number
          created_at?: string
          household_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          owner_id?: string
          photo_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
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
      spending_adjustments: {
        Row: {
          amount: number
          effective_at: string
          id: string
          owner_id: string
          scope: string
        }
        Insert: {
          amount: number
          effective_at: string
          id?: string
          owner_id: string
          scope: string
        }
        Update: {
          amount?: number
          effective_at?: string
          id?: string
          owner_id?: string
          scope?: string
        }
        Relationships: []
      }
      spending_budgets: {
        Row: {
          amount: number
          owner_id: string
          period: string
        }
        Insert: {
          amount: number
          owner_id?: string
          period: string
        }
        Update: {
          amount?: number
          owner_id?: string
          period?: string
        }
        Relationships: []
      }
      spending_time_zones: {
        Row: {
          owner_id: string
          time_zone: string
        }
        Insert: {
          owner_id: string
          time_zone: string
        }
        Update: {
          owner_id?: string
          time_zone?: string
        }
        Relationships: []
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
      accept_household_invite: {
        Args: { invite_token: string }
        Returns: string
      }
      add_item_to_date_list: {
        Args: { target_list_id: string; target_variant_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_group_to_general_list: {
        Args: { target_group_id: string }
        Returns: Json
      }
      add_item_to_general_list: {
        Args: { target_variant_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_recipe_to_general_list: {
        Args: { target_recipe_id: string }
        Returns: Json
      }
      add_units_to_list_item: {
        Args: {
          target_list_id: string
          target_variant_id: string
          units_to_add: number
        }
        Returns: string
      }
      add_week_ingredients_to_list: {
        Args: {
          servings_multiplier: number
          target_list_id: string
          target_recipe_id: string
        }
        Returns: Json
      }
      add_week_to_general_list: {
        Args: { week_from: string; week_to: string }
        Returns: Json
      }
      add_plan_week_to_list: {
        Args: {
          from_household: boolean
          target_list_id?: string
          week_from: string
          week_to: string
        }
        Returns: Json
      }
      add_week_to_list: {
        Args: { target_list_id?: string; week_from: string; week_to: string }
        Returns: Json
      }
      assert_local_day_start: {
        Args: { local_day_start: string }
        Returns: undefined
      }
      assign_household_meal_slot: {
        Args: {
          cook_user_id?: string
          slot_date: string
          slot_meal_type: string
          slot_servings_multiplier: number
          target_recipe_id: string
        }
        Returns: string
      }
      assign_meal_slot: {
        Args: {
          cook_is_self: boolean
          slot_date: string
          slot_meal_type: string
          slot_servings_multiplier: number
          target_recipe_id: string
        }
        Returns: string
      }
      change_bought_quantity: {
        Args: { quantity_delta: number; target_item_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
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
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_list_item_in_session: {
        Args: { target_item_id: string; target_session_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_purchase_session: {
        Args: { spent_total: number; target_session_id: string }
        Returns: {
          closed_at: string | null
          household_id: string | null
          id: string
          list_id: string | null
          owner_id: string
          started_at: string
          store_id: string
          total_amount: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchase_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clear_household_meal_slot: {
        Args: { slot_date: string; slot_meal_type: string }
        Returns: undefined
      }
      copy_recipe: { Args: { target_recipe_id: string }; Returns: string }
      create_date_list: {
        Args: { list_event_date: string; list_name: string }
        Returns: {
          created_at: string
          event_date: string | null
          household_id: string | null
          id: string
          name: string | null
          owner_id: string
          spent_total: number | null
          status: string
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_household: { Args: { household_name: string }; Returns: string }
      create_household_invite: {
        Args: never
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      create_product_group: {
        Args: {
          group_name: string
          item_list: Json
          share_with_household: boolean
        }
        Returns: string
      }
      create_personal_product: {
        Args: {
          base_quantity: number
          base_unit: string
          brand_name?: string
          category_id: string
          product_name: string
          reference_price?: number
          reference_store_name?: string
          reference_store_slug?: string
          share_with_household?: boolean
        }
        Returns: string
      }
      current_household_id: { Args: never; Returns: string }
      date_list_status_from_items: {
        Args: { target_list_id: string }
        Returns: string
      }
      decide_personal_lists: { Args: { lists_choice: string }; Returns: string }
      delete_personal_product: { Args: { target_product_id: string }; Returns: string }
      dismiss_inventory_suggestion: {
        Args: { target_variant_id: string }
        Returns: undefined
      }
      ensure_general_list_id: { Args: never; Returns: string }
      find_general_list_id: { Args: never; Returns: string }
      get_general_list_recipe_shortfalls: {
        Args: { local_day_start: string }
        Returns: {
          list_item_id: string
          quantity_missing: number
          quantity_unit: string
          recipe_id: string
          recipe_name: string
        }[]
      }
      get_general_list_shortfall_snapshots: {
        Args: { local_day_start: string }
        Returns: {
          list_item_id: string
          previous_base_quantity: number
          previous_base_unit: string
          previous_quantity_requested: number
        }[]
      }
      get_general_list_shortfalls: {
        Args: never
        Returns: {
          list_item_id: string
          quantity_missing: number
          quantity_unit: string
          recipe_name: string
        }[]
      }
      get_household_invite: {
        Args: never
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      get_household_members: {
        Args: never
        Returns: {
          display_name: string
          is_current_user: boolean
          role: string
          user_id: string
        }[]
      }
      get_household_meal_plan: {
        Args: { plan_from: string; plan_to: string }
        Returns: {
          cook_is_current_user: boolean
          cook_name: string
          cook_user_id: string
          meal_type: string
          recipe_base_servings: number
          recipe_id: string
          recipe_name: string
          servings_multiplier: number
          slot_date: string
          slot_id: string
        }[]
      }
      get_household_members_page: {
        Args: {
          page_offset?: number
          page_size?: number
          search_query?: string
        }
        Returns: {
          display_name: string
          is_current_user: boolean
          role: string
          user_id: string
        }[]
      }
      get_inventory_suggestions: {
        Args: never
        Returns: {
          base_quantity: number
          base_unit: string
          expected_out_at: string
          last_purchased_at: string
          product_catalog_variant_id: string
          product_name: string
        }[]
      }
      get_list_assignee_candidates: {
        Args: { target_list_id: string }
        Returns: {
          display_name: string
          is_current_user: boolean
          user_id: string
        }[]
      }
      get_my_inventory: {
        Args: never
        Returns: {
          base_quantity: number
          base_unit: string
          expected_out_at: string | null
          last_purchased_at: string
          product_catalog_variant_id: string
          product_name: string
        }[]
      }
      get_period_finance: { Args: { target_scope: string }; Returns: Json }
      get_personal_product_usage: {
        Args: { target_product_id: string }
        Returns: {
          active_list_count: number
          group_count: number
          recipe_count: number
        }[]
      }
      get_personal_lists_decision_state: { Args: never; Returns: string }
      get_product_purchases: {
        Args: { target_product_key: string | null; target_variant_id: string | null }
        Returns: {
          appearance_count: number
          closed_at: string
          id: string
          store_name: string | null
          total_amount: number | null
          variant_names: string[]
        }[]
      }
      get_purchased_products: {
        Args: { page_limit: number; page_offset: number; search_text: string }
        Returns: Json
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
      get_recipe_coverage: { Args: { target_recipe_id: string }; Returns: Json }
      get_recipe_coverage_today: {
        Args: { local_day_start: string; target_recipe_id: string }
        Returns: Json
      }
      get_spending_period_bounds: {
        Args: { target_scope: string }
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      inventory_estimates: {
        Args: never
        Returns: {
          base_quantity: number
          base_unit: string
          expected_out_at: string | null
          is_dismissed: boolean
          is_pending: boolean
          last_purchased_at: string
          product_catalog_id: string
          product_catalog_variant_id: string
          product_name: string
        }[]
      }
      is_recipe_photo_in_use: {
        Args: { target_photo_path: string }
        Returns: boolean
      }
      leave_household: { Args: { new_admin_user_id?: string }; Returns: string }
      list_catalog_by_category: {
        Args: { filter_category_id?: string; filter_household_id?: string }
        Returns: {
          category: string
          name: string
          product_catalog_id: string
          variants: Json
        }[]
      }
      lock_visible_list_item: {
        Args: { target_item_id: string }
        Returns: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
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
      pick_recipe_variant: {
        Args: {
          needed_quantity: number
          target_product_id: string
          target_unit: string
        }
        Returns: {
          base_quantity: number
          variant_id: string
        }[]
      }
      remove_household_member: {
        Args: { member_user_id: string }
        Returns: string
      }
      resolve_list_item_shortfall: {
        Args: {
          resolution: string
          target_item_id: string
          target_variant_id?: string
        }
        Returns: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_recipe: {
        Args: {
          ingredient_list: Json
          recipe_base_servings: number
          recipe_name: string
          target_recipe_id?: string
        }
        Returns: string
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
      search_catalog_including_own: {
        Args: { household_id?: string; search_term?: string }
        Returns: {
          category: string
          is_personal: boolean
          name: string
          product_catalog_id: string
          variants: Json
        }[]
      }
      set_date_list_cancelled: {
        Args: { is_cancelled: boolean; target_list_id: string }
        Returns: {
          created_at: string
          event_date: string | null
          household_id: string | null
          id: string
          name: string | null
          owner_id: string
          spent_total: number | null
          status: string
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_date_list_total: {
        Args: { new_total: number; target_list_id: string }
        Returns: {
          created_at: string
          event_date: string | null
          household_id: string | null
          id: string
          name: string | null
          owner_id: string
          spent_total: number | null
          status: string
          type: string
        }
        SetofOptions: {
          from: "*"
          to: "lists"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_list_assignee_enabled: {
        Args: { enabled: boolean; target_list_id: string }
        Returns: {
          assignee_enabled: boolean
          list_id: string
        }
        SetofOptions: {
          from: "*"
          to: "list_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_list_item_assignee: {
        Args: { new_assignee: string; target_item_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_list_item_checked: {
        Args: { is_checked: boolean; target_item_id: string }
        Returns: {
          assigned_to: string | null
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_period_total: {
        Args: { target_scope: string; target_total: number }
        Returns: {
          amount: number
          effective_at: string
          id: string
          owner_id: string
          scope: string
        }[]
        SetofOptions: {
          from: "*"
          to: "spending_adjustments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_purchase_session_total: {
        Args: { new_total: number; target_session_id: string }
        Returns: {
          closed_at: string | null
          household_id: string | null
          id: string
          list_id: string | null
          owner_id: string
          started_at: string
          store_id: string
          total_amount: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchase_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_recipe_photo: {
        Args: { new_photo_path?: string; target_recipe_id: string }
        Returns: string
      }
      set_spending_budget: {
        Args: { budget_amount: number; budget_period: string }
        Returns: {
          amount: number
          owner_id: string
          period: string
        }
        SetofOptions: {
          from: "*"
          to: "spending_budgets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_spending_time_zone: {
        Args: { new_time_zone: string }
        Returns: {
          owner_id: string
          time_zone: string
        }
        SetofOptions: {
          from: "*"
          to: "spending_time_zones"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      share_recipe: { Args: { target_recipe_id: string }; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      start_purchase_session: {
        Args: { local_day_start: string; target_store_id: string }
        Returns: {
          closed_at: string | null
          household_id: string | null
          id: string
          list_id: string | null
          owner_id: string
          started_at: string
          store_id: string
          total_amount: number | null
        }
        SetofOptions: {
          from: "*"
          to: "purchase_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_shortfall_resolution_and_uncheck: {
        Args: { target_item_id: string }
        Returns: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          list_id: string
          product_catalog_variant_id: string
          purchase_session_id: string | null
          quantity_bought: number | null
          quantity_requested: number
        }
        SetofOptions: {
          from: "*"
          to: "list_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_personal_product: {
        Args: {
          new_base_quantity: number
          new_base_unit: string
          new_brand_name?: string
          new_category_id: string
          new_product_name: string
          new_reference_price?: number
          new_reference_store_name?: string
          new_reference_store_slug?: string
          target_product_id: string
        }
        Returns: undefined
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
