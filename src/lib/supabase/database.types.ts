export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string;
          country: string;
          created_at: string;
          full_name: string;
          id: string;
          is_default: boolean;
          line1: string;
          line2: string | null;
          phone: string;
          state: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          city: string;
          country?: string;
          created_at?: string;
          full_name: string;
          id?: string;
          is_default?: boolean;
          line1: string;
          line2?: string | null;
          phone: string;
          state: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          city?: string;
          country?: string;
          created_at?: string;
          full_name?: string;
          id?: string;
          is_default?: boolean;
          line1?: string;
          line2?: string | null;
          phone?: string;
          state?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          added_at: string;
          cart_id: string;
          id: string;
          quantity: number;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          added_at?: string;
          cart_id: string;
          id?: string;
          quantity: number;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          added_at?: string;
          cart_id?: string;
          id?: string;
          quantity?: number;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["default_variant_id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variant_availability";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          created_at: string;
          description: string | null;
          hero_image_path: string | null;
          id: string;
          name: string;
          slug: string;
          sort_order: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          hero_image_path?: string | null;
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          hero_image_path?: string | null;
          id?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      delivery_methods: {
        Row: {
          code: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      delivery_rates: {
        Row: {
          eta_max_days: number;
          eta_min_days: number;
          id: string;
          method_id: string;
          price: number;
          zone: string;
        };
        Insert: {
          eta_max_days: number;
          eta_min_days: number;
          id?: string;
          method_id: string;
          price: number;
          zone: string;
        };
        Update: {
          eta_max_days?: number;
          eta_min_days?: number;
          id?: string;
          method_id?: string;
          price?: number;
          zone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_rates_method_id_fkey";
            columns: ["method_id"];
            isOneToOne: false;
            referencedRelation: "delivery_methods";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_codes: {
        Row: {
          code: string;
          created_at: string;
          ends_at: string | null;
          id: string;
          is_active: boolean;
          min_subtotal: number;
          starts_at: string | null;
          times_used: number;
          type: string;
          usage_limit: number | null;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          min_subtotal?: number;
          starts_at?: string | null;
          times_used?: number;
          type: string;
          usage_limit?: number | null;
          value: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          is_active?: boolean;
          min_subtotal?: number;
          starts_at?: string | null;
          times_used?: number;
          type?: string;
          usage_limit?: number | null;
          value?: number;
        };
        Relationships: [];
      };
      email_log: {
        Row: {
          created_at: string;
          error: string | null;
          id: string;
          order_id: string | null;
          provider_message_id: string | null;
          status: string;
          to_email: string;
          type: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          id?: string;
          order_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          to_email: string;
          type: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          id?: string;
          order_id?: string | null;
          provider_message_id?: string | null;
          status?: string;
          to_email?: string;
          type?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_log_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      instagram_tiles: {
        Row: {
          alt: string;
          created_at: string;
          id: string;
          image_path: string;
          is_active: boolean;
          link_url: string;
          position: number;
        };
        Insert: {
          alt: string;
          created_at?: string;
          id?: string;
          image_path: string;
          is_active?: boolean;
          link_url: string;
          position?: number;
        };
        Update: {
          alt?: string;
          created_at?: string;
          id?: string;
          image_path?: string;
          is_active?: boolean;
          link_url?: string;
          position?: number;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          low_stock_threshold: number;
          on_hand: number;
          reserved: number;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          low_stock_threshold?: number;
          on_hand?: number;
          reserved?: number;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          low_stock_threshold?: number;
          on_hand?: number;
          reserved?: number;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "product_listing";
            referencedColumns: ["default_variant_id"];
          },
          {
            foreignKeyName: "inventory_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: true;
            referencedRelation: "variant_availability";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string;
          quantity: number;
          status: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id: string;
          quantity: number;
          status?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string;
          quantity?: number;
          status?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["default_variant_id"];
          },
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variant_availability";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      newsletter_subscribers: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          source: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          source?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          image_path: string | null;
          line_total: number;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id: string | null;
          variant_label: string | null;
        };
        Insert: {
          id?: string;
          image_path?: string | null;
          line_total: number;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          sku: string;
          unit_price: number;
          variant_id?: string | null;
          variant_label?: string | null;
        };
        Update: {
          id?: string;
          image_path?: string | null;
          line_total?: number;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          sku?: string;
          unit_price?: number;
          variant_id?: string | null;
          variant_label?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["default_variant_id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variant_availability";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      order_number_counters: {
        Row: {
          day: string;
          last_value: number;
        };
        Insert: {
          day: string;
          last_value: number;
        };
        Update: {
          day?: string;
          last_value?: number;
        };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: string;
          note: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          access_token: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          currency: string;
          delivery_eta_text: string | null;
          delivery_fee: number;
          delivery_method_code: string;
          delivery_method_name: string;
          discount_code_id: string | null;
          discount_total: number;
          email: string;
          id: string;
          notes: string | null;
          order_number: string;
          paid_at: string | null;
          shipping_city: string;
          shipping_country: string;
          shipping_line1: string;
          shipping_line2: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_state: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number: string | null;
          tracking_url: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          access_token?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          currency?: string;
          delivery_eta_text?: string | null;
          delivery_fee?: number;
          delivery_method_code: string;
          delivery_method_name: string;
          discount_code_id?: string | null;
          discount_total?: number;
          email: string;
          id?: string;
          notes?: string | null;
          order_number: string;
          paid_at?: string | null;
          shipping_city: string;
          shipping_country: string;
          shipping_line1: string;
          shipping_line2?: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_state: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          total: number;
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          access_token?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          currency?: string;
          delivery_eta_text?: string | null;
          delivery_fee?: number;
          delivery_method_code?: string;
          delivery_method_name?: string;
          discount_code_id?: string | null;
          discount_total?: number;
          email?: string;
          id?: string;
          notes?: string | null;
          order_number?: string;
          paid_at?: string | null;
          shipping_city?: string;
          shipping_country?: string;
          shipping_line1?: string;
          shipping_line2?: string | null;
          shipping_name?: string;
          shipping_phone?: string;
          shipping_state?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          total?: number;
          tracking_number?: string | null;
          tracking_url?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey";
            columns: ["discount_code_id"];
            isOneToOne: false;
            referencedRelation: "discount_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          channel: string | null;
          created_at: string;
          currency: string;
          id: string;
          order_id: string;
          paid_at: string | null;
          provider: string;
          provider_transaction_id: string | null;
          raw: Json | null;
          reference: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          channel?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id: string;
          paid_at?: string | null;
          provider: string;
          provider_transaction_id?: string | null;
          raw?: Json | null;
          reference: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          channel?: string | null;
          created_at?: string;
          currency?: string;
          id?: string;
          order_id?: string;
          paid_at?: string | null;
          provider?: string;
          provider_transaction_id?: string | null;
          raw?: Json | null;
          reference?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt: string;
          created_at: string;
          height: number | null;
          id: string;
          position: number;
          product_id: string;
          storage_path: string;
          variant_id: string | null;
          width: number | null;
        };
        Insert: {
          alt: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          position?: number;
          product_id: string;
          storage_path: string;
          variant_id?: string | null;
          width?: number | null;
        };
        Update: {
          alt?: string;
          created_at?: string;
          height?: number | null;
          id?: string;
          position?: number;
          product_id?: string;
          storage_path?: string;
          variant_id?: string | null;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["default_variant_id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variant_availability";
            referencedColumns: ["variant_id"];
          },
        ];
      };
      product_variants: {
        Row: {
          colour: string | null;
          compare_at_price: number | null;
          created_at: string;
          density: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          lace_type: string | null;
          length_inches: number | null;
          position: number;
          price: number;
          product_id: string;
          sku: string;
          updated_at: string;
        };
        Insert: {
          colour?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          density?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          lace_type?: string | null;
          length_inches?: number | null;
          position?: number;
          price: number;
          product_id: string;
          sku: string;
          updated_at?: string;
        };
        Update: {
          colour?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          density?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          lace_type?: string | null;
          length_inches?: number | null;
          position?: number;
          price?: number;
          product_id?: string;
          sku?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          base_price: number;
          care: string | null;
          category_id: string;
          collection_id: string | null;
          compare_at_price: number | null;
          created_at: string;
          description: string | null;
          details: NonNullable<Json>;
          id: string;
          is_best_seller: boolean;
          is_featured: boolean;
          is_published: boolean;
          name: string;
          position: number;
          sales_count: number;
          search: unknown;
          slug: string;
          updated_at: string;
        };
        Insert: {
          base_price: number;
          care?: string | null;
          category_id: string;
          collection_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          details?: NonNullable<Json>;
          id?: string;
          is_best_seller?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          name: string;
          position?: number;
          sales_count?: number;
          search?: never;
          slug: string;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          care?: string | null;
          category_id?: string;
          collection_id?: string | null;
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          details?: NonNullable<Json>;
          id?: string;
          is_best_seller?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          name?: string;
          position?: number;
          sales_count?: number;
          search?: never;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          marketing_opt_in: boolean;
          phone: string | null;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          marketing_opt_in?: boolean;
          phone?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          author_display_name: string;
          body: string;
          created_at: string;
          id: string;
          is_approved: boolean;
          order_id: string | null;
          product_id: string;
          rating: number;
          source: string;
          title: string | null;
          user_id: string | null;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          author_display_name: string;
          body: string;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          order_id?: string | null;
          product_id: string;
          rating: number;
          source: string;
          title?: string | null;
          user_id?: string | null;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          author_display_name?: string;
          body?: string;
          created_at?: string;
          id?: string;
          is_approved?: boolean;
          order_id?: string | null;
          product_id?: string;
          rating?: number;
          source?: string;
          title?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          event_id: string;
          id: string;
          payload: NonNullable<Json>;
          processed_at: string | null;
          provider: string;
          received_at: string;
          type: string;
        };
        Insert: {
          event_id: string;
          id?: string;
          payload: NonNullable<Json>;
          processed_at?: string | null;
          provider: string;
          received_at?: string;
          type: string;
        };
        Update: {
          event_id?: string;
          id?: string;
          payload?: NonNullable<Json>;
          processed_at?: string | null;
          provider?: string;
          received_at?: string;
          type?: string;
        };
        Relationships: [];
      };
      wishlist_items: {
        Row: {
          added_at: string;
          id: string;
          product_id: string;
          wishlist_id: string;
        };
        Insert: {
          added_at?: string;
          id?: string;
          product_id: string;
          wishlist_id: string;
        };
        Update: {
          added_at?: string;
          id?: string;
          product_id?: string;
          wishlist_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey";
            columns: ["wishlist_id"];
            isOneToOne: false;
            referencedRelation: "wishlists";
            referencedColumns: ["id"];
          },
        ];
      };
      wishlists: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      product_listing: {
        Row: {
          category_kind: string | null;
          category_name: string | null;
          category_slug: string | null;
          collection_name: string | null;
          collection_slug: string | null;
          collection_status: string | null;
          created_at: string | null;
          default_colour: string | null;
          default_compare_at_price: number | null;
          default_density: string | null;
          default_lace_type: string | null;
          default_length: number | null;
          default_price: number | null;
          default_variant_id: string | null;
          id: string | null;
          image_alts: string[] | null;
          image_paths: string[] | null;
          in_stock: boolean | null;
          is_best_seller: boolean | null;
          is_featured: boolean | null;
          lengths: number[] | null;
          max_length: number | null;
          max_price: number | null;
          min_length: number | null;
          min_price: number | null;
          name: string | null;
          position: number | null;
          sales_count: number | null;
          search: unknown;
          slug: string | null;
          variant_count: number | null;
        };
        Relationships: [];
      };
      variant_availability: {
        Row: {
          available: number | null;
          is_in_stock: boolean | null;
          is_low_stock: boolean | null;
          product_id: string | null;
          variant_id: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product_listing";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      claim_guest_orders: { Args: { p_email: string; p_user_id: string }; Returns: undefined };
      create_pending_order: { Args: { p_order: Json }; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      mark_order_paid: {
        Args: {
          p_amount: number;
          p_channel: string;
          p_currency: string;
          p_paid_at: string;
          p_provider_txn: string;
          p_raw: Json;
          p_reference: string;
        };
        Returns: string;
      };
      merge_cart: { Args: { p_lines: Json }; Returns: undefined };
      merge_wishlist: { Args: { p_product_ids: string[] }; Returns: undefined };
      next_order_number: { Args: Record<PropertyKey, never>; Returns: string };
      prepare_payment_retry: { Args: { p_order_id: string }; Returns: undefined };
      quote_order: {
        Args: {
          p_country: string;
          p_delivery_method: string;
          p_discount_code: string;
          p_lines: Json;
          p_lock?: boolean;
          p_state: string;
        };
        Returns: Json;
      };
      release_expired_reservations: { Args: Record<PropertyKey, never>; Returns: number };
      search_products: {
        Args: { p_q: string };
        Returns: {
          category_kind: string | null;
          category_name: string | null;
          category_slug: string | null;
          collection_name: string | null;
          collection_slug: string | null;
          collection_status: string | null;
          created_at: string | null;
          default_colour: string | null;
          default_compare_at_price: number | null;
          default_density: string | null;
          default_lace_type: string | null;
          default_length: number | null;
          default_price: number | null;
          default_variant_id: string | null;
          id: string | null;
          image_alts: string[] | null;
          image_paths: string[] | null;
          in_stock: boolean | null;
          is_best_seller: boolean | null;
          is_featured: boolean | null;
          lengths: number[] | null;
          max_length: number | null;
          max_price: number | null;
          min_length: number | null;
          min_price: number | null;
          name: string | null;
          position: number | null;
          sales_count: number | null;
          search: unknown;
          slug: string | null;
          variant_count: number | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "product_listing";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
    };
    Enums: {
      order_status:
        | "pending_payment"
        | "paid"
        | "processing"
        | "ready_for_dispatch"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "pending_payment",
        "paid",
        "processing",
        "ready_for_dispatch",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
    },
  },
} as const;
