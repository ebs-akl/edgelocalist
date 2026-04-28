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
      api_rate_limits: {
        Row: {
          attempt_count: number | null
          endpoint: string | null
          id: string
          key_hash: string | null
          last_attempt_at: string | null
          window_start: string | null
        }
        Insert: {
          attempt_count?: number | null
          endpoint?: string | null
          id: string
          key_hash?: string | null
          last_attempt_at?: string | null
          window_start?: string | null
        }
        Update: {
          attempt_count?: number | null
          endpoint?: string | null
          id?: string
          key_hash?: string | null
          last_attempt_at?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      commission_deposits: {
        Row: {
          amount: number | null
          created_at: string | null
          deposit_date: string | null
          id: string
          notes: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          deposit_date?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          deposit_date?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          app_source: string | null
          biz: string | null
          cat: string | null
          city: string | null
          county: string | null
          county_pushed: boolean | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          ghl_contact_id: string | null
          gift_count: number | null
          id: string
          last_interaction: string | null
          last_name: string | null
          last_order_date: string | null
          last_service_date: string | null
          latitude: number | null
          lifetime_value: number | null
          location: string | null
          location_id: string | null
          longitude: number | null
          order_count: number | null
          phone: string | null
          rlt: string | null
          source: string | null
          source_type: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          app_source?: string | null
          biz?: string | null
          cat?: string | null
          city?: string | null
          county?: string | null
          county_pushed?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id?: string | null
          gift_count?: number | null
          id: string
          last_interaction?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_service_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          location?: string | null
          location_id?: string | null
          longitude?: number | null
          order_count?: number | null
          phone?: string | null
          rlt?: string | null
          source?: string | null
          source_type?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          app_source?: string | null
          biz?: string | null
          cat?: string | null
          city?: string | null
          county?: string | null
          county_pushed?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id?: string | null
          gift_count?: number | null
          id?: string
          last_interaction?: string | null
          last_name?: string | null
          last_order_date?: string | null
          last_service_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          location?: string | null
          location_id?: string | null
          longitude?: number | null
          order_count?: number | null
          phone?: string | null
          rlt?: string | null
          source?: string | null
          source_type?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json
          name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers_view: {
        Row: {
          address: string | null
          city: string | null
          customer_key: string | null
          email: string | null
          full_name: string | null
          last_interaction: string | null
          lifetime_value: number | null
          phone: string | null
          source_type: string | null
          state: string | null
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          customer_key?: string | null
          email?: string | null
          full_name?: string | null
          last_interaction?: string | null
          lifetime_value?: number | null
          phone?: string | null
          source_type?: string | null
          state?: string | null
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          customer_key?: string | null
          email?: string | null
          full_name?: string | null
          last_interaction?: string | null
          lifetime_value?: number | null
          phone?: string | null
          source_type?: string | null
          state?: string | null
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      ghl_locations: {
        Row: {
          created_at: string | null
          ghl_location_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          ghl_location_id?: string | null
          id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          ghl_location_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ghl_social_posts: {
        Row: {
          actionType: string | null
          actionUrl: string | null
          applyWatermark: string | null
          category: string | null
          content: string | null
          couponCode: string | null
          created_at: string | null
          enableComment: string | null
          enableDuet: string | null
          enableStitch: string | null
          endDate: string | null
          eventType: string | null
          followUpComment: string | null
          gifUrl: string | null
          id: string
          imageUrls: string | null
          link: string | null
          mediaOptimization: string | null
          notifyAllGroupMembers: string | null
          offerTitle: string | null
          OGmetaUrl: string | null
          pdfTitle: string | null
          postAsPdf: string | null
          postAtSpecificTime: string | null
          privacyLevel: string | null
          promoteOtherBrand: string | null
          promoteYourBrand: string | null
          redeemOnlineUrl: string | null
          regeneration_count: string | null
          startDate: string | null
          status: string | null
          tags: string | null
          termsConditions: string | null
          title: string | null
          tracking_url: string | null
          type: string | null
          updated_at: string | null
          user_id: string | null
          videoDisclosure: string | null
          videoUrls: string | null
        }
        Insert: {
          actionType?: string | null
          actionUrl?: string | null
          applyWatermark?: string | null
          category?: string | null
          content?: string | null
          couponCode?: string | null
          created_at?: string | null
          enableComment?: string | null
          enableDuet?: string | null
          enableStitch?: string | null
          endDate?: string | null
          eventType?: string | null
          followUpComment?: string | null
          gifUrl?: string | null
          id?: string
          imageUrls?: string | null
          link?: string | null
          mediaOptimization?: string | null
          notifyAllGroupMembers?: string | null
          offerTitle?: string | null
          OGmetaUrl?: string | null
          pdfTitle?: string | null
          postAsPdf?: string | null
          postAtSpecificTime?: string | null
          privacyLevel?: string | null
          promoteOtherBrand?: string | null
          promoteYourBrand?: string | null
          redeemOnlineUrl?: string | null
          regeneration_count?: string | null
          startDate?: string | null
          status?: string | null
          tags?: string | null
          termsConditions?: string | null
          title?: string | null
          tracking_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          videoDisclosure?: string | null
          videoUrls?: string | null
        }
        Update: {
          actionType?: string | null
          actionUrl?: string | null
          applyWatermark?: string | null
          category?: string | null
          content?: string | null
          couponCode?: string | null
          created_at?: string | null
          enableComment?: string | null
          enableDuet?: string | null
          enableStitch?: string | null
          endDate?: string | null
          eventType?: string | null
          followUpComment?: string | null
          gifUrl?: string | null
          id?: string
          imageUrls?: string | null
          link?: string | null
          mediaOptimization?: string | null
          notifyAllGroupMembers?: string | null
          offerTitle?: string | null
          OGmetaUrl?: string | null
          pdfTitle?: string | null
          postAsPdf?: string | null
          postAtSpecificTime?: string | null
          privacyLevel?: string | null
          promoteOtherBrand?: string | null
          promoteYourBrand?: string | null
          redeemOnlineUrl?: string | null
          regeneration_count?: string | null
          startDate?: string | null
          status?: string | null
          tags?: string | null
          termsConditions?: string | null
          title?: string | null
          tracking_url?: string | null
          type?: string | null
          updated_at?: string | null
          user_id?: string | null
          videoDisclosure?: string | null
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
          contact_id: string | null
          county: string | null
          county_pushed: boolean | null
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
          rep_id: string | null
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
          contact_id?: string | null
          county?: string | null
          county_pushed?: boolean | null
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
          rep_id?: string | null
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
          contact_id?: string | null
          county?: string | null
          county_pushed?: boolean | null
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
          rep_id?: string | null
          rep_number?: string | null
          rlt?: string | null
          source?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: []
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
          id?: string
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
      meal_plans: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          state: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          adjustment_amount: number | null
          admin_fee: number | null
          billing_address: string | null
          billing_city: string | null
          billing_company: string | null
          billing_email: string | null
          billing_first_name: string | null
          billing_last_name: string | null
          billing_phone: string | null
          billing_state: string | null
          billing_zip: string | null
          cpo_total: number | null
          created_at: string | null
          customer_type: string | null
          engraving_details: string | null
          event_name: string | null
          id: string
          initial_payment: number | null
          item_subtotal: number | null
          items_summary: string | null
          metadata: Json
          monthly_cpo: number | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          payment_2: number | null
          payment_3: number | null
          payment_4: number | null
          payment_5: number | null
          payment_6: number | null
          payment_method: string | null
          payment_plan: string | null
          payment_total: number | null
          processed_count: number
          push_period: string | null
          receipt_email_date: string | null
          sales_tax: number | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_cost: number | null
          shipping_method: string | null
          shipping_name: string | null
          shipping_phone: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: string | null
          total_cents: number
          total_promo_spend: number | null
          total_promo_spend_month: number | null
          transaction_type: string | null
          updated_at: string
          user_id: string | null
          vector_campaign: string | null
          vector_month: string | null
          vector_week: string | null
          virtual_demo: string | null
        }
        Insert: {
          adjustment_amount?: number | null
          admin_fee?: number | null
          billing_address?: string | null
          billing_city?: string | null
          billing_company?: string | null
          billing_email?: string | null
          billing_first_name?: string | null
          billing_last_name?: string | null
          billing_phone?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          cpo_total?: number | null
          created_at?: string | null
          customer_type?: string | null
          engraving_details?: string | null
          event_name?: string | null
          id?: string
          initial_payment?: number | null
          item_subtotal?: number | null
          items_summary?: string | null
          metadata?: Json
          monthly_cpo?: number | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_2?: number | null
          payment_3?: number | null
          payment_4?: number | null
          payment_5?: number | null
          payment_6?: number | null
          payment_method?: string | null
          payment_plan?: string | null
          payment_total?: number | null
          processed_count?: number
          push_period?: string | null
          receipt_email_date?: string | null
          sales_tax?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string | null
          total_cents?: number
          total_promo_spend?: number | null
          total_promo_spend_month?: number | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
          vector_campaign?: string | null
          vector_month?: string | null
          vector_week?: string | null
          virtual_demo?: string | null
        }
        Update: {
          adjustment_amount?: number | null
          admin_fee?: number | null
          billing_address?: string | null
          billing_city?: string | null
          billing_company?: string | null
          billing_email?: string | null
          billing_first_name?: string | null
          billing_last_name?: string | null
          billing_phone?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          cpo_total?: number | null
          created_at?: string | null
          customer_type?: string | null
          engraving_details?: string | null
          event_name?: string | null
          id?: string
          initial_payment?: number | null
          item_subtotal?: number | null
          items_summary?: string | null
          metadata?: Json
          monthly_cpo?: number | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          payment_2?: number | null
          payment_3?: number | null
          payment_4?: number | null
          payment_5?: number | null
          payment_6?: number | null
          payment_method?: string | null
          payment_plan?: string | null
          payment_total?: number | null
          processed_count?: number
          push_period?: string | null
          receipt_email_date?: string | null
          sales_tax?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_cost?: number | null
          shipping_method?: string | null
          shipping_name?: string | null
          shipping_phone?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: string | null
          total_cents?: number
          total_promo_spend?: number | null
          total_promo_spend_month?: number | null
          transaction_type?: string | null
          updated_at?: string
          user_id?: string | null
          vector_campaign?: string | null
          vector_month?: string | null
          vector_week?: string | null
          virtual_demo?: string | null
        }
        Relationships: []
      }
      pending_confirmations: {
        Row: {
          confirmation_code: string | null
          created_at: string | null
          id: string
          sender_email: string | null
          user_id: string | null
        }
        Insert: {
          confirmation_code?: string | null
          created_at?: string | null
          id?: string
          sender_email?: string | null
          user_id?: string | null
        }
        Update: {
          confirmation_code?: string | null
          created_at?: string | null
          id?: string
          sender_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      portal_leads: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          portal_id: string | null
          questions_comments: string | null
          rep_email: string | null
          rep_name: string | null
          sharpening_or_service: string | null
          submission_id: string | null
          submitted_at: string | null
          user_id: string | null
          zip: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          portal_id?: string | null
          questions_comments?: string | null
          rep_email?: string | null
          rep_name?: string | null
          sharpening_or_service?: string | null
          submission_id?: string | null
          submitted_at?: string | null
          user_id?: string | null
          zip?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          portal_id?: string | null
          questions_comments?: string | null
          rep_email?: string | null
          rep_name?: string | null
          sharpening_or_service?: string | null
          submission_id?: string | null
          submitted_at?: string | null
          user_id?: string | null
          zip?: number | null
        }
        Relationships: []
      }
      pro_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_pro: boolean | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      product_directory: {
        Row: {
          base_url: string | null
          created_at: string | null
          id: string
          product_name: string | null
        }
        Insert: {
          base_url?: string | null
          created_at?: string | null
          id?: string
          product_name?: string | null
        }
        Update: {
          base_url?: string | null
          created_at?: string | null
          id?: string
          product_name?: string | null
        }
        Relationships: []
      }
      profile_oauth_tokens: {
        Row: {
          created_at: string
          ghl_access_token: string | null
          ghl_expires_at: string | null
          ghl_location_id: string | null
          ghl_refresh_token: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ghl_access_token?: string | null
          ghl_expires_at?: string | null
          ghl_location_id?: string | null
          ghl_refresh_token?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          full_name: string | null
          ghl_location_id: string | null
          id: string
          last_name: string | null
          password_changed_at: string | null
          phone: string | null
          subscription_tier: string | null
          user_id: string | null
          vector_rep_number: number | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_location_id?: string | null
          id?: string
          last_name?: string | null
          password_changed_at?: string | null
          phone?: string | null
          subscription_tier?: string | null
          user_id?: string | null
          vector_rep_number?: number | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_location_id?: string | null
          id?: string
          last_name?: string | null
          password_changed_at?: string | null
          phone?: string | null
          subscription_tier?: string | null
          user_id?: string | null
          vector_rep_number?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string | null
          endpoint: string | null
          id: string
          p256dh: string | null
          user_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string | null
          id: string
          p256dh?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string | null
          endpoint?: string | null
          id?: string
          p256dh?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recipe_cache: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          recipe_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          recipe_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          recipe_url?: string | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          data: Json
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_profiles: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          profile: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          profile: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          profile?: Json
          updated_at?: string
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          billing_address: string | null
          billing_city: string | null
          billing_state: string | null
          created_at: string | null
          credit_card_last4: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          email_sent_date: string | null
          estimated_return: string | null
          id: string
          inventory_summary: string | null
          item_count: number | null
          rep_email: string | null
          rep_name: string | null
          rep_phone: string | null
          return_address: string | null
          return_city: string | null
          return_state: string | null
          return_zip: string | null
          service_order_id: string | null
          special_comments: string | null
          status: string | null
          user_id: string | null
          zip: string | null
        }
        Insert: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          created_at?: string | null
          credit_card_last4?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email_sent_date?: string | null
          estimated_return?: string | null
          id?: string
          inventory_summary?: string | null
          item_count?: number | null
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          return_address?: string | null
          return_city?: string | null
          return_state?: string | null
          return_zip?: string | null
          service_order_id?: string | null
          special_comments?: string | null
          status?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Update: {
          billing_address?: string | null
          billing_city?: string | null
          billing_state?: string | null
          created_at?: string | null
          credit_card_last4?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          email_sent_date?: string | null
          estimated_return?: string | null
          id?: string
          inventory_summary?: string | null
          item_count?: number | null
          rep_email?: string | null
          rep_name?: string | null
          rep_phone?: string | null
          return_address?: string | null
          return_city?: string | null
          return_state?: string | null
          return_zip?: string | null
          service_order_id?: string | null
          special_comments?: string | null
          status?: string | null
          user_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      sms_rate_limits: {
        Row: {
          daily_count: string | null
          daily_start: string | null
          id: string
          location_id: string | null
          send_count: string | null
          window_start: string | null
        }
        Insert: {
          daily_count?: string | null
          daily_start?: string | null
          id?: string
          location_id?: string | null
          send_count?: string | null
          window_start?: string | null
        }
        Update: {
          daily_count?: string | null
          daily_start?: string | null
          id?: string
          location_id?: string | null
          send_count?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      usage_ledger: {
        Row: {
          created_at: string | null
          email_hash: string | null
          id: string
          processed_count: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_hash?: string | null
          id?: string
          processed_count?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_hash?: string | null
          id?: string
          processed_count?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          api_key: string | null
          created_at: string | null
          gemini_api_key: string | null
          id: string
          inbound_email: string | null
          processed_count: number | null
          push_notifications_enabled: boolean | null
          script_url: string | null
          updated_at: string | null
          user_id: string | null
          welcome_email_sent: boolean | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          gemini_api_key?: string | null
          id: string
          inbound_email?: string | null
          processed_count?: number | null
          push_notifications_enabled?: boolean | null
          script_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          welcome_email_sent?: boolean | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          gemini_api_key?: string | null
          id?: string
          inbound_email?: string | null
          processed_count?: number | null
          push_notifications_enabled?: boolean | null
          script_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          welcome_email_sent?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
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
      gettransactionid: { Args: never; Returns: unknown }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_processed_count: {
        Args: { _order_id: string }
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
      longtransactionsenabled: { Args: never; Returns: boolean }
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
      nearby_contacts_page:
        | {
            Args: { p_limit?: number; p_offset?: number }
            Returns: {
              address: string
              city: string
              created_at: string
              first_name: string
              id: string
              last_name: string
              latitude: number
              lifetime_value: number
              longitude: number
              phone: string
              state: string
              total_count: number
              zip: string
            }[]
          }
        | {
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
      nearby_map_markers:
        | {
            Args: never
            Returns: {
              id: string
              latitude: number
              lifetime_value: number
              longitude: number
            }[]
          }
        | {
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
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      smart_upsert_ghl_contacts: {
        Args: { p_contacts: Json; p_rep_id: string }
        Returns: number
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
