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
      auth_otp_aliases: {
        Row: {
          alias_code: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          original_token: string
          otp_type: string
        }
        Insert: {
          alias_code: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          original_token: string
          otp_type: string
        }
        Update: {
          alias_code?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          original_token?: string
          otp_type?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      payment_audit_log: {
        Row: {
          actor: string
          actor_id: string | null
          after_state: Json | null
          amount_cents: number | null
          before_state: Json | null
          created_at: string
          currency: string | null
          direction: string | null
          enrollment_id: string | null
          environment: string
          event_type: string
          id: string
          notes: string | null
          occurred_at: string
          paddle_event_id: string | null
          paddle_resource_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          actor?: string
          actor_id?: string | null
          after_state?: Json | null
          amount_cents?: number | null
          before_state?: Json | null
          created_at?: string
          currency?: string | null
          direction?: string | null
          enrollment_id?: string | null
          environment: string
          event_type: string
          id?: string
          notes?: string | null
          occurred_at?: string
          paddle_event_id?: string | null
          paddle_resource_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          actor?: string
          actor_id?: string | null
          after_state?: Json | null
          amount_cents?: number | null
          before_state?: Json | null
          created_at?: string
          currency?: string | null
          direction?: string | null
          enrollment_id?: string | null
          environment?: string
          event_type?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          paddle_event_id?: string | null
          paddle_resource_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_discrepancies: {
        Row: {
          actual: Json | null
          created_at: string
          db_id: string | null
          description: string | null
          environment: string
          expected: Json | null
          id: string
          paddle_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string | null
          severity: string
          type: string
          user_id: string | null
        }
        Insert: {
          actual?: Json | null
          created_at?: string
          db_id?: string | null
          description?: string | null
          environment: string
          expected?: Json | null
          id?: string
          paddle_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          severity?: string
          type: string
          user_id?: string | null
        }
        Update: {
          actual?: Json | null
          created_at?: string
          db_id?: string | null
          description?: string | null
          environment?: string
          expected?: Json | null
          id?: string
          paddle_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          severity?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_discrepancies_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_runs: {
        Row: {
          amount_mismatch_count: number | null
          created_at: string
          db_event_count: number | null
          db_total_cents: number | null
          drift_cents: number | null
          environment: string
          error: string | null
          finished_at: string | null
          id: string
          matched_count: number | null
          missing_in_db_count: number | null
          missing_in_paddle_count: number | null
          paddle_total_cents: number | null
          paddle_txn_count: number | null
          started_at: string
          status: string
          summary: Json | null
          triggered_by: string
          window_from: string
          window_to: string
        }
        Insert: {
          amount_mismatch_count?: number | null
          created_at?: string
          db_event_count?: number | null
          db_total_cents?: number | null
          drift_cents?: number | null
          environment: string
          error?: string | null
          finished_at?: string | null
          id?: string
          matched_count?: number | null
          missing_in_db_count?: number | null
          missing_in_paddle_count?: number | null
          paddle_total_cents?: number | null
          paddle_txn_count?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          triggered_by?: string
          window_from: string
          window_to: string
        }
        Update: {
          amount_mismatch_count?: number | null
          created_at?: string
          db_event_count?: number | null
          db_total_cents?: number | null
          drift_cents?: number | null
          environment?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          matched_count?: number | null
          missing_in_db_count?: number | null
          missing_in_paddle_count?: number | null
          paddle_total_cents?: number | null
          paddle_txn_count?: number | null
          started_at?: string
          status?: string
          summary?: Json | null
          triggered_by?: string
          window_from?: string
          window_to?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      revenue_events: {
        Row: {
          amount_cents: number
          course_id: string | null
          created_at: string
          currency: string
          direction: string
          enrollment_id: string | null
          environment: string
          event_type: string
          fee_cents: number
          id: string
          net_cents: number
          occurred_at: string
          paddle_customer_id: string | null
          paddle_event_id: string
          paddle_subscription_id: string | null
          paddle_transaction_id: string | null
          raw_payload: Json
          tax_cents: number
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          direction?: string
          enrollment_id?: string | null
          environment: string
          event_type: string
          fee_cents?: number
          id?: string
          net_cents?: number
          occurred_at?: string
          paddle_customer_id?: string | null
          paddle_event_id: string
          paddle_subscription_id?: string | null
          paddle_transaction_id?: string | null
          raw_payload?: Json
          tax_cents?: number
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          direction?: string
          enrollment_id?: string | null
          environment?: string
          event_type?: string
          fee_cents?: number
          id?: string
          net_cents?: number
          occurred_at?: string
          paddle_customer_id?: string | null
          paddle_event_id?: string
          paddle_subscription_id?: string | null
          paddle_transaction_id?: string | null
          raw_payload?: Json
          tax_cents?: number
          user_id?: string | null
        }
        Relationships: []
      }
      site_visitor_sessions: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          first_seen_at: string
          id: string
          ip_hash: string | null
          last_seen_at: string
          page_views: number
          path: string
          referrer: string | null
          region: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          page_views?: number
          path?: string
          referrer?: string | null
          region?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          first_seen_at?: string
          id?: string
          ip_hash?: string | null
          last_seen_at?: string
          page_views?: number
          path?: string
          referrer?: string | null
          region?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      ssra_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ssra_batches: {
        Row: {
          capacity: number
          course_id: string
          created_at: string
          end_date: string | null
          enrolled_count: number
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          course_id: string
          created_at?: string
          end_date?: string | null
          enrolled_count?: number
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          course_id?: string
          created_at?: string
          end_date?: string | null
          enrolled_count?: number
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_cancellation_requests: {
        Row: {
          admin_notes: string | null
          course_id: string
          created_at: string
          enrollment_id: string
          id: string
          paddle_adjustment_id: string | null
          reason: string
          refund_amount_eur: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          course_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          paddle_adjustment_id?: string | null
          reason: string
          refund_amount_eur?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          course_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          paddle_adjustment_id?: string | null
          reason?: string
          refund_amount_eur?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ssra_certificates: {
        Row: {
          certificate_code: string
          course_id: string | null
          course_title: string
          created_at: string
          grade: string | null
          id: string
          issued_at: string
          issued_by: string | null
          revoked: boolean
          revoked_reason: string | null
          student_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_code: string
          course_id?: string | null
          course_title: string
          created_at?: string
          grade?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          revoked?: boolean
          revoked_reason?: string | null
          student_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_code?: string
          course_id?: string | null
          course_title?: string
          created_at?: string
          grade?: string | null
          id?: string
          issued_at?: string
          issued_by?: string | null
          revoked?: boolean
          revoked_reason?: string | null
          student_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ssra_coupon_uses: {
        Row: {
          coupon_id: string
          discount_eur: number | null
          enrollment_id: string | null
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_eur?: number | null
          enrollment_id?: string | null
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_eur?: number | null
          enrollment_id?: string | null
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "ssra_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssra_coupon_uses_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ssra_enrollment_report"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "ssra_coupon_uses_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ssra_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_coupons: {
        Row: {
          code: string
          course_id: string | null
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          minimum_amount_eur: number | null
          name: string | null
          paddle_discount_id: string | null
          updated_at: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_amount_eur?: number | null
          name?: string | null
          paddle_discount_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          minimum_amount_eur?: number | null
          name?: string | null
          paddle_discount_id?: string | null
          updated_at?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_coupons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_courses: {
        Row: {
          capacity: number
          category: string
          course_format: string | null
          course_type: string
          created_at: string | null
          description: string | null
          duration: string | null
          duration_weeks: string | null
          end_date: string | null
          enrolled_count: number
          id: string
          image_url: string | null
          instructor_id: string | null
          instructor_name: string | null
          is_active: boolean
          is_subscription: boolean
          level: string | null
          modules: Json | null
          price_egp: number | null
          price_eur: number
          price_hidden: boolean
          registration_open: boolean
          requires_verification: boolean
          sort_order: number
          start_date: string | null
          start_time: string | null
          stripe_price_id: string | null
          subtitle: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
          waitlist_enabled: boolean
        }
        Insert: {
          capacity?: number
          category: string
          course_format?: string | null
          course_type: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_weeks?: string | null
          end_date?: string | null
          enrolled_count?: number
          id: string
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          is_active?: boolean
          is_subscription?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur: number
          price_hidden?: boolean
          registration_open?: boolean
          requires_verification?: boolean
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          stripe_price_id?: string | null
          subtitle?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
          waitlist_enabled?: boolean
        }
        Update: {
          capacity?: number
          category?: string
          course_format?: string | null
          course_type?: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_weeks?: string | null
          end_date?: string | null
          enrolled_count?: number
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          is_active?: boolean
          is_subscription?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur?: number
          price_hidden?: boolean
          registration_open?: boolean
          requires_verification?: boolean
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          stripe_price_id?: string | null
          subtitle?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
          waitlist_enabled?: boolean
        }
        Relationships: []
      }
      ssra_enrollments: {
        Row: {
          amount_eur: number | null
          batch_id: string | null
          coupon_code: string | null
          course_id: string | null
          course_title_snapshot: string | null
          created_at: string | null
          duration_snapshot: string | null
          enrolled_at: string | null
          environment: string
          id: string
          instructor_snapshot: string | null
          order_number: string | null
          paid_at: string | null
          start_date_snapshot: string | null
          start_time_snapshot: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          student_email_snapshot: string | null
          student_name_snapshot: string | null
          user_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          batch_id?: string | null
          coupon_code?: string | null
          course_id?: string | null
          course_title_snapshot?: string | null
          created_at?: string | null
          duration_snapshot?: string | null
          enrolled_at?: string | null
          environment?: string
          id?: string
          instructor_snapshot?: string | null
          order_number?: string | null
          paid_at?: string | null
          start_date_snapshot?: string | null
          start_time_snapshot?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          student_email_snapshot?: string | null
          student_name_snapshot?: string | null
          user_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          batch_id?: string | null
          coupon_code?: string | null
          course_id?: string | null
          course_title_snapshot?: string | null
          created_at?: string | null
          duration_snapshot?: string | null
          enrolled_at?: string | null
          environment?: string
          id?: string
          instructor_snapshot?: string | null
          order_number?: string | null
          paid_at?: string | null
          start_date_snapshot?: string | null
          start_time_snapshot?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          student_email_snapshot?: string | null
          student_name_snapshot?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ssra_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssra_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_feature_flags: {
        Row: {
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      ssra_fraud_flags: {
        Row: {
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ssra_homework_submissions: {
        Row: {
          batch_id: string | null
          course_id: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          material_id: string | null
          status: string
          storage_path: string | null
          submitted_at: string
          text_content: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          course_id: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          material_id?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string
          text_content?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          course_id?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          material_id?: string | null
          status?: string
          storage_path?: string | null
          submitted_at?: string
          text_content?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_homework_submissions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "ssra_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssra_homework_submissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ssra_homework_submissions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "ssra_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_instructor_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          course_id: string
          id: string
          instructor_id: string
          is_active: boolean
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          course_id: string
          id?: string
          instructor_id: string
          is_active?: boolean
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          course_id?: string
          id?: string
          instructor_id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ssra_instructor_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_materials: {
        Row: {
          allow_download: boolean
          batch_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          external_link: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_visible: boolean
          material_type: string
          mime_type: string | null
          sort_order: number
          storage_path: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          allow_download?: boolean
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_link?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_visible?: boolean
          material_type?: string
          mime_type?: string | null
          sort_order?: number
          storage_path?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          allow_download?: boolean
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          external_link?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_visible?: boolean
          material_type?: string
          mime_type?: string | null
          sort_order?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ssra_payment_attempts: {
        Row: {
          amount_eur: number | null
          attempt_number: number
          completed_at: string | null
          country: string | null
          coupon_code: string | null
          course_id: string | null
          course_title: string | null
          created_at: string
          duration_ms: number | null
          enrollment_id: string | null
          environment: string
          failure_code: string | null
          failure_reason: string | null
          id: string
          initiated_at: string
          ip_address: string | null
          metadata: Json | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          attempt_number?: number
          completed_at?: string | null
          country?: string | null
          coupon_code?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          duration_ms?: number | null
          enrollment_id?: string | null
          environment?: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          ip_address?: string | null
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          attempt_number?: number
          completed_at?: string | null
          country?: string | null
          coupon_code?: string | null
          course_id?: string | null
          course_title?: string | null
          created_at?: string
          duration_ms?: number | null
          enrollment_id?: string | null
          environment?: string
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string
          ip_address?: string | null
          metadata?: Json | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ssra_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          degree: string | null
          email: string | null
          full_name: string | null
          german_level: string | null
          id: string
          is_public_team: boolean
          phone_number: string | null
          photo_url: string | null
          role: string
          social_links: Json
          team_display_order: number
          title: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          german_level?: string | null
          id: string
          is_public_team?: boolean
          phone_number?: string | null
          photo_url?: string | null
          role?: string
          social_links?: Json
          team_display_order?: number
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          german_level?: string | null
          id?: string
          is_public_team?: boolean
          phone_number?: string | null
          photo_url?: string | null
          role?: string
          social_links?: Json
          team_display_order?: number
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ssra_public_catalog_events: {
        Row: {
          changed_at: string
          entity: string
          id: number
        }
        Insert: {
          changed_at?: string
          entity?: string
          id?: number
        }
        Update: {
          changed_at?: string
          entity?: string
          id?: number
        }
        Relationships: []
      }
      ssra_session_access_log: {
        Row: {
          accessed_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_session_access_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ssra_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_session_attendance: {
        Row: {
          attended_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          attended_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          attended_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ssra_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_session_credentials: {
        Row: {
          created_at: string
          session_id: string
          updated_at: string
          zoom_link: string
          zoom_password: string | null
        }
        Insert: {
          created_at?: string
          session_id: string
          updated_at?: string
          zoom_link: string
          zoom_password?: string | null
        }
        Update: {
          created_at?: string
          session_id?: string
          updated_at?: string
          zoom_link?: string
          zoom_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_session_credentials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "ssra_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_session_tokens: {
        Row: {
          access_count: number
          accessed_at: string | null
          created_at: string
          device_hint: string | null
          expires_at: string
          id: string
          session_id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_count?: number
          accessed_at?: string | null
          created_at?: string
          device_hint?: string | null
          expires_at: string
          id?: string
          session_id: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_count?: number
          accessed_at?: string | null
          created_at?: string
          device_hint?: string | null
          expires_at?: string
          id?: string
          session_id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_session_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ssra_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_cancelled: boolean
          recording_url: string | null
          scheduled_at: string
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_cancelled?: boolean
          recording_url?: string | null
          scheduled_at: string
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_cancelled?: boolean
          recording_url?: string | null
          scheduled_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      ssra_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          course_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean
          course_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean
          course_id?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_subscriptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_verifications: {
        Row: {
          admin_notes: string | null
          country: string | null
          course_id: string | null
          created_at: string | null
          degree: string | null
          diploma_url: string | null
          email: string
          full_name: string
          german_level: string | null
          graduation_year: string | null
          id: string
          motivation: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string | null
          degree?: string | null
          diploma_url?: string | null
          email: string
          full_name: string
          german_level?: string | null
          graduation_year?: string | null
          id?: string
          motivation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          country?: string | null
          course_id?: string | null
          created_at?: string | null
          degree?: string | null
          diploma_url?: string | null
          email?: string
          full_name?: string
          german_level?: string | null
          graduation_year?: string | null
          id?: string
          motivation?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_verifications_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_waitlist: {
        Row: {
          course_id: string
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          expires_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          position: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          position?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ssra_waitlist_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_webhook_events: {
        Row: {
          created_at: string
          environment: string
          error_message: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          environment: string
          error_message?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          environment?: string
          error_message?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      ssra_zoom_broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          email: string
          error: string | null
          id: string
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_zoom_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "ssra_zoom_broadcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_zoom_broadcasts: {
        Row: {
          audience: string
          created_at: string
          description: string | null
          duration_minutes: number
          failed_count: number
          id: string
          scheduled_at: string
          sent_by: string | null
          sent_count: number
          status: string
          title: string
          total_recipients: number
          updated_at: string
          zoom_link: string
          zoom_password: string | null
        }
        Insert: {
          audience?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          failed_count?: number
          id?: string
          scheduled_at: string
          sent_by?: string | null
          sent_count?: number
          status?: string
          title: string
          total_recipients?: number
          updated_at?: string
          zoom_link: string
          zoom_password?: string | null
        }
        Update: {
          audience?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          failed_count?: number
          id?: string
          scheduled_at?: string
          sent_by?: string | null
          sent_count?: number
          status?: string
          title?: string
          total_recipients?: number
          updated_at?: string
          zoom_link?: string
          zoom_password?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      data_integrity_checks: {
        Row: {
          check_type: string | null
          details: Json | null
          detected_for: string | null
          resource_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      ssra_enrollment_report: {
        Row: {
          amount_paid: number | null
          attendance_pct: number | null
          batch_date: string | null
          certificate_status: string | null
          country: string | null
          coupon_code: string | null
          course_id: string | null
          course_name: string | null
          enrollment_date: string | null
          enrollment_id: string | null
          payment_status: string | null
          phone_number: string | null
          report_month: string | null
          student_email: string | null
          student_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_revenue_summary: {
        Row: {
          course_id: string | null
          course_title: string | null
          enrollments: number | null
          month: string | null
          revenue_eur: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ssra_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ssra_student_enrollment_stats: {
        Row: {
          active_enrollments: number | null
          course_ids: string[] | null
          first_enrolled_at: string | null
          total_enrollments: number | null
          unique_courses: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_concurrent_session_access: {
        Args: {
          _ip_address?: string
          _session_id: string
          _token_hash: string
          _user_agent?: string
          _user_id: string
        }
        Returns: {
          concurrent: boolean
        }[]
      }
      check_rate_limit: {
        Args: { _key: string; _max_requests: number; _window_seconds: number }
        Returns: boolean
      }
      course_has_seats: { Args: { _course_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      emit_event: {
        Args: {
          _event_type: string
          _payload: Json
          _resource_id: string
          _resource_type: string
        }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_ssra_cert_code: { Args: never; Returns: string }
      generate_ssra_order_number: { Args: never; Returns: string }
      get_admin_students: {
        Args: { _page?: number; _page_size?: number; _search?: string }
        Returns: {
          active_enrollments: number
          city: string
          country: string
          course_ids: string[]
          created_at: string
          email: string
          first_enrolled_at: string
          full_name: string
          id: string
          latest_sub_status: string
          phone_number: string
          role: string
          total_count: number
          total_enrollments: number
          unique_courses: number
        }[]
      }
      get_audit_health: { Args: { _env?: string }; Returns: Json }
      get_instructor_course_students: {
        Args: { _course_id: string }
        Returns: {
          country: string
          enrolled_at: string
          full_name: string
          status: string
          user_id: string
        }[]
      }
      get_lead_student_stats: {
        Args: never
        Returns: {
          conversion_rate: number
          new_leads_this_month: number
          new_students_this_month: number
          revenue_per_student: number
          total_leads: number
          total_revenue_eur: number
          total_students: number
        }[]
      }
      get_live_visitor_stats: {
        Args: { _window_minutes?: number }
        Returns: Json
      }
      get_payment_monitor_stats: {
        Args: { _env?: string; _hours?: number }
        Returns: Json
      }
      get_public_home_stats: {
        Args: never
        Returns: {
          countries_count: number
          courses_count: number
          min_price: number
          students_count: number
        }[]
      }
      get_public_team: {
        Args: never
        Returns: {
          bio: string
          country: string
          full_name: string
          id: string
          photo_url: string
          role: string
          social_links: Json
          team_display_order: number
          title: string
        }[]
      }
      get_revenue_summary: {
        Args: { _env: string; _from: string; _to: string }
        Returns: {
          chargeback_cents: number
          currency: string
          event_count: number
          fee_cents: number
          gross_cents: number
          net_cents: number
          refund_cents: number
          tax_cents: number
        }[]
      }
      get_ssra_email_status: { Args: { _email: string }; Returns: string }
      get_ssra_role: { Args: { _uid: string }; Returns: string }
      get_top_failed_users: {
        Args: { _env?: string; _hours?: number; _min_fails?: number }
        Returns: {
          failed_count: number
          last_attempt_at: string
          total_attempts: number
          user_email: string
          user_id: string
        }[]
      }
      increment_coupon_uses: {
        Args: { _coupon_id: string }
        Returns: undefined
      }
      instructor_teaches_student: {
        Args: { _instructor_id: string; _student_id: string }
        Returns: boolean
      }
      is_instructor_for_course: {
        Args: { _course_id: string; _uid: string }
        Returns: boolean
      }
      is_ssra_admin: { Args: { _uid: string }; Returns: boolean }
      is_ssra_instructor: { Args: { _uid: string }; Returns: boolean }
      is_ssra_super_admin: { Args: { _uid: string }; Returns: boolean }
      mark_discrepancy_resolved: {
        Args: { _id: string; _notes: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_course_enrolled_count: {
        Args: { _course_id: string }
        Returns: number
      }
      record_payment_attempt: {
        Args: {
          _amount_eur: number
          _country: string
          _coupon_code: string
          _course_id: string
          _course_title: string
          _enrollment_id: string
          _environment: string
          _ip_address: string
          _stripe_session_id: string
          _user_agent: string
          _user_email: string
          _user_id: string
        }
        Returns: string
      }
      report_profile_charset_violations: {
        Args: never
        Returns: {
          email: string
          field: string
          id: string
          value: string
        }[]
      }
      reserve_pending_enrollment: {
        Args: {
          _coupon_code?: string
          _course_id: string
          _student_email?: string
          _student_name?: string
          _user_id: string
        }
        Returns: {
          enrollment_id: string
          outcome: string
          reason: string
        }[]
      }
      session_has_credentials: {
        Args: { _session_id: string }
        Returns: boolean
      }
      update_payment_attempt: {
        Args: {
          _attempt_id: string
          _failure_code: string
          _failure_reason: string
          _status: string
          _stripe_payment_intent_id: string
        }
        Returns: undefined
      }
      update_payment_attempt_by_session: {
        Args: {
          _failure_code: string
          _failure_reason: string
          _session_id: string
          _status: string
          _stripe_payment_intent_id: string
        }
        Returns: undefined
      }
      validate_coupon: {
        Args: {
          _amount_eur: number
          _code: string
          _course_id: string
          _user_id: string
        }
        Returns: {
          coupon_id: string
          discount_type: string
          discount_value: number
          error_reason: string
          final_discount: number
          is_valid: boolean
          paddle_discount_id: string
        }[]
      }
      verify_ssra_certificate: {
        Args: { _code: string }
        Returns: {
          certificate_code: string
          course_title: string
          grade: string
          issued_at: string
          revoked: boolean
          student_name: string
        }[]
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
