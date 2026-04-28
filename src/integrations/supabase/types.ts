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
      api_rate_limits: {
        Row: {
          attempt_count: number
          endpoint: string
          id: string
          key_hash: string
          last_attempt_at: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          endpoint: string
          id?: string
          key_hash: string
          last_attempt_at?: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          endpoint?: string
          id?: string
          key_hash?: string
          last_attempt_at?: string
          window_start?: string
        }
        Relationships: []
      }
      commission_deposits: {
        Row: {
          amount: number
          created_at: string
          deposit_date: string
          id: string
          notes: string
          source: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          deposit_date?: string
          id?: string
          notes?: string
          source: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_date?: string
          id?: string
          notes?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contacts: {
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
          rep_number: string | null
          rlt: string | null
          source: string | null
          state: string | null
          updated_at: string | null
          user_id: string
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
          rep_number?: string | null
          rlt?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
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
          rep_number?: string | null
          rlt?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_rep_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "localist_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          app_source: string
          city: string
          created_at: string
          email: string
          full_name: string
          id: string
          last_interaction: string
          lifetime_value: number
          phone: string
          source_type: string
          state: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          address?: string
          app_source?: string
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_interaction?: string
          lifetime_value?: number
          phone?: string
          source_type?: string
          state?: string
          updated_at?: string
          user_id: string
          zip?: string
        }
        Update: {
          address?: string
          app_source?: string
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_interaction?: string
          lifetime_value?: number
          phone?: string
          source_type?: string
          state?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: []
      }
      ghl_locations: {
        Row: {
          created_at: string
          ghl_location_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ghl_location_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ghl_location_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ghl_social_posts: {
        Row: {
          actionType: string | null
          actionUrl: string | null
          applyWatermark: boolean | null
          category: string | null
          content: string | null
          couponCode: string | null
          created_at: string | null
          enableComment: boolean | null
          enableDuet: boolean | null
          enableStitch: boolean | null
          endDate: string | null
          eventType: string | null
          followUpComment: string | null
          gifUrl: string | null
          id: string
          imageUrls: string | null
          link: string | null
          mediaOptimization: boolean | null
          notifyAllGroupMembers: boolean | null
          offerTitle: string | null
          OGmetaUrl: string | null
          pdfTitle: string | null
          postAsPdf: boolean | null
          postAtSpecificTime: string | null
          privacyLevel: string | null
          promoteOtherBrand: boolean | null
          promoteYourBrand: boolean | null
          redeemOnlineUrl: string | null
          regeneration_count: number | null
          startDate: string | null
          status: string | null
          tags: string | null
          termsConditions: string | null
          title: string | null
          tracking_url: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          videoDisclosure: boolean | null
          videoUrls: string | null
        }
        Insert: {
          actionType?: string | null
          actionUrl?: string | null
          applyWatermark?: boolean | null
          category?: string | null
          content?: string | null
          couponCode?: string | null
          created_at?: string | null
          enableComment?: boolean | null
          enableDuet?: boolean | null
          enableStitch?: boolean | null
          endDate?: string | null
          eventType?: string | null
          followUpComment?: string | null
          gifUrl?: string | null
          id?: string
          imageUrls?: string | null
          link?: string | null
          mediaOptimization?: boolean | null
          notifyAllGroupMembers?: boolean | null
          offerTitle?: string | null
          OGmetaUrl?: string | null
          pdfTitle?: string | null
          postAsPdf?: boolean | null
          postAtSpecificTime?: string | null
          privacyLevel?: string | null
          promoteOtherBrand?: boolean | null
          promoteYourBrand?: boolean | null
          redeemOnlineUrl?: string | null
          regeneration_count?: number | null
          startDate?: string | null
          status?: string | null
          tags?: string | null
          termsConditions?: string | null
          title?: string | null
          tracking_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          videoDisclosure?: boolean | null
          videoUrls?: string | null
        }
        Update: {
          actionType?: string | null
          actionUrl?: string | null
          applyWatermark?: boolean | null
          category?: string | null
          content?: string | null
          couponCode?: string | null
          created_at?: string | null
          enableComment?: boolean | null
          enableDuet?: boolean | null
          enableStitch?: boolean | null
          endDate?: string | null
          eventType?: string | null
          followUpComment?: string | null
          gifUrl?: string | null
          id?: string
          imageUrls?: string | null
          link?: string | null
          mediaOptimization?: boolean | null
          notifyAllGroupMembers?: boolean | null
          offerTitle?: string | null
          OGmetaUrl?: string | null
          pdfTitle?: string | null
          postAsPdf?: boolean | null
          postAtSpecificTime?: string | null
          privacyLevel?: string | null
          promoteOtherBrand?: boolean | null
          promoteYourBrand?: boolean | null
          redeemOnlineUrl?: string | null
          regeneration_count?: number | null
          startDate?: string | null
          status?: string | null
          tags?: string | null
          termsConditions?: string | null
          title?: string | null
          tracking_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          videoDisclosure?: boolean | null
          videoUrls?: string | null
        }
        Relationships: []
      }
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
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          state: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          adjustment_amount: number
          admin_fee: number
          billing_address: string
          billing_city: string
          billing_company: string
          billing_email: string
          billing_first_name: string
          billing_last_name: string
          billing_phone: string
          billing_state: string
          billing_zip: string
          cpo_total: number
          created_at: string
          customer_type: string
          engraving_details: string
          event_name: string
          id: string
          initial_payment: number
          item_subtotal: number
          items_summary: string
          monthly_cpo: number
          order_date: string
          order_number: string
          order_type: string
          payment_2: number
          payment_3: number
          payment_4: number
          payment_5: number
          payment_6: number
          payment_method: string
          payment_plan: string
          payment_total: number
          push_period: string
          receipt_email_date: string | null
          sales_tax: number
          shipping_address: string
          shipping_city: string
          shipping_cost: number
          shipping_method: string
          shipping_name: string
          shipping_phone: string
          shipping_state: string
          shipping_zip: string
          status: string
          total_promo_spend: number
          total_promo_spend_month: number
          transaction_type: string
          user_id: string | null
          vector_campaign: string
          vector_month: string
          vector_week: string
          virtual_demo: string
        }
        Insert: {
          adjustment_amount?: number
          admin_fee?: number
          billing_address?: string
          billing_city?: string
          billing_company?: string
          billing_email?: string
          billing_first_name: string
          billing_last_name: string
          billing_phone?: string
          billing_state?: string
          billing_zip?: string
          cpo_total?: number
          created_at?: string
          customer_type?: string
          engraving_details?: string
          event_name?: string
          id?: string
          initial_payment?: number
          item_subtotal?: number
          items_summary?: string
          monthly_cpo?: number
          order_date?: string
          order_number: string
          order_type?: string
          payment_2?: number
          payment_3?: number
          payment_4?: number
          payment_5?: number
          payment_6?: number
          payment_method?: string
          payment_plan?: string
          payment_total?: number
          push_period?: string
          receipt_email_date?: string | null
          sales_tax?: number
          shipping_address?: string
          shipping_city?: string
          shipping_cost?: number
          shipping_method?: string
          shipping_name?: string
          shipping_phone?: string
          shipping_state?: string
          shipping_zip?: string
          status?: string
          total_promo_spend?: number
          total_promo_spend_month?: number
          transaction_type?: string
          user_id?: string | null
          vector_campaign?: string
          vector_month?: string
          vector_week?: string
          virtual_demo?: string
        }
        Update: {
          adjustment_amount?: number
          admin_fee?: number
          billing_address?: string
          billing_city?: string
          billing_company?: string
          billing_email?: string
          billing_first_name?: string
          billing_last_name?: string
          billing_phone?: string
          billing_state?: string
          billing_zip?: string
          cpo_total?: number
          created_at?: string
          customer_type?: string
          engraving_details?: string
          event_name?: string
          id?: string
          initial_payment?: number
          item_subtotal?: number
          items_summary?: string
          monthly_cpo?: number
          order_date?: string
          order_number?: string
          order_type?: string
          payment_2?: number
          payment_3?: number
          payment_4?: number
          payment_5?: number
          payment_6?: number
          payment_method?: string
          payment_plan?: string
          payment_total?: number
          push_period?: string
          receipt_email_date?: string | null
          sales_tax?: number
          shipping_address?: string
          shipping_city?: string
          shipping_cost?: number
          shipping_method?: string
          shipping_name?: string
          shipping_phone?: string
          shipping_state?: string
          shipping_zip?: string
          status?: string
          total_promo_spend?: number
          total_promo_spend_month?: number
          transaction_type?: string
          user_id?: string | null
          vector_campaign?: string
          vector_month?: string
          vector_week?: string
          virtual_demo?: string
        }
        Relationships: []
      }
      pending_confirmations: {
        Row: {
          confirmation_code: string
          created_at: string
          id: string
          sender_email: string | null
          user_id: string
        }
        Insert: {
          confirmation_code: string
          created_at?: string
          id?: string
          sender_email?: string | null
          user_id: string
        }
        Update: {
          confirmation_code?: string
          created_at?: string
          id?: string
          sender_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portal_leads: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          portal_id: string
          questions_comments: string
          rep_email: string
          rep_name: string
          sharpening_or_service: string
          submission_id: string
          submitted_at: string
          user_id: string | null
          zip: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          portal_id?: string
          questions_comments?: string
          rep_email?: string
          rep_name?: string
          sharpening_or_service?: string
          submission_id?: string
          submitted_at?: string
          user_id?: string | null
          zip?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          portal_id?: string
          questions_comments?: string
          rep_email?: string
          rep_name?: string
          sharpening_or_service?: string
          submission_id?: string
          submitted_at?: string
          user_id?: string | null
          zip?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string
          ghl_access_token: string | null
          ghl_expires_at: string | null
          ghl_location_id: string | null
          ghl_refresh_token: string | null
          id: string
          last_name: string
          password_changed_at: string
          phone: string
          subscription_tier: string | null
          user_id: string
          vector_rep_number: string
        }
        Insert: {
          created_at?: string
          first_name?: string
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id?: string
          last_name?: string
          password_changed_at?: string
          phone?: string
          subscription_tier?: string | null
          user_id: string
          vector_rep_number?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id?: string
          last_name?: string
          password_changed_at?: string
          phone?: string
          subscription_tier?: string | null
          user_id?: string
          vector_rep_number?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_cache: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          recipe_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          recipe_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          recipe_url?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          billing_address: string
          billing_city: string
          billing_state: string
          created_at: string
          credit_card_last4: string
          customer_email: string
          customer_name: string
          customer_phone: string
          email_sent_date: string | null
          estimated_return: string
          id: string
          inventory_summary: string
          item_count: number
          rep_email: string
          rep_name: string
          rep_phone: string
          return_address: string
          return_city: string
          return_state: string
          return_zip: string
          service_order_id: string
          special_comments: string
          status: string
          user_id: string | null
          zip: string
        }
        Insert: {
          billing_address?: string
          billing_city?: string
          billing_state?: string
          created_at?: string
          credit_card_last4?: string
          customer_email?: string
          customer_name: string
          customer_phone?: string
          email_sent_date?: string | null
          estimated_return?: string
          id?: string
          inventory_summary?: string
          item_count?: number
          rep_email?: string
          rep_name?: string
          rep_phone?: string
          return_address?: string
          return_city?: string
          return_state?: string
          return_zip?: string
          service_order_id: string
          special_comments?: string
          status?: string
          user_id?: string | null
          zip?: string
        }
        Update: {
          billing_address?: string
          billing_city?: string
          billing_state?: string
          created_at?: string
          credit_card_last4?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          email_sent_date?: string | null
          estimated_return?: string
          id?: string
          inventory_summary?: string
          item_count?: number
          rep_email?: string
          rep_name?: string
          rep_phone?: string
          return_address?: string
          return_city?: string
          return_state?: string
          return_zip?: string
          service_order_id?: string
          special_comments?: string
          status?: string
          user_id?: string | null
          zip?: string
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
      usage_ledger: {
        Row: {
          created_at: string
          email_hash: string
          id: string
          processed_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_hash: string
          id?: string
          processed_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_hash?: string
          id?: string
          processed_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          api_key: string
          created_at: string
          gemini_api_key: string | null
          id: string
          inbound_email: string
          processed_count: number
          push_notifications_enabled: boolean
          script_url: string | null
          updated_at: string
          user_id: string
          welcome_email_sent: boolean
        }
        Insert: {
          api_key?: string
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          inbound_email: string
          processed_count?: number
          push_notifications_enabled?: boolean
          script_url?: string | null
          updated_at?: string
          user_id: string
          welcome_email_sent?: boolean
        }
        Update: {
          api_key?: string
          created_at?: string
          gemini_api_key?: string | null
          id?: string
          inbound_email?: string
          processed_count?: number
          push_notifications_enabled?: boolean
          script_url?: string | null
          updated_at?: string
          user_id?: string
          welcome_email_sent?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_processed_count: {
        Args: { target_user_id: string }
        Returns: undefined
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
      app_role: "admin" | "moderator" | "user" | "super_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin"],
    },
  },
} as const
