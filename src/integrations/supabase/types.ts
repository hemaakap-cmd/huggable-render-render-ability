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
          course_id: string | null
          course_title_snapshot: string | null
          created_at: string | null
          duration_snapshot: string | null
          enrolled_at: string | null
          id: string
          instructor_snapshot: string | null
          order_number: string | null
          paid_at: string | null
          start_date_snapshot: string | null
          start_time_snapshot: string | null
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          student_email_snapshot: string | null
          student_name_snapshot: string | null
          user_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          batch_id?: string | null
          course_id?: string | null
          course_title_snapshot?: string | null
          created_at?: string | null
          duration_snapshot?: string | null
          enrolled_at?: string | null
          id?: string
          instructor_snapshot?: string | null
          order_number?: string | null
          paid_at?: string | null
          start_date_snapshot?: string | null
          start_time_snapshot?: string | null
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          student_email_snapshot?: string | null
          student_name_snapshot?: string | null
          user_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          batch_id?: string | null
          course_id?: string | null
          course_title_snapshot?: string | null
          created_at?: string | null
          duration_snapshot?: string | null
          enrolled_at?: string | null
          id?: string
          instructor_snapshot?: string | null
          order_number?: string | null
          paid_at?: string | null
          start_date_snapshot?: string | null
          start_time_snapshot?: string | null
          status?: string
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
      ssra_materials: {
        Row: {
          batch_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          batch_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          title?: string
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
      ssra_profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string | null
          degree: string | null
          email: string | null
          full_name: string | null
          german_level: string | null
          id: string
          phone_number: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          german_level?: string | null
          id: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string | null
          degree?: string | null
          email?: string | null
          full_name?: string | null
          german_level?: string | null
          id?: string
          phone_number?: string | null
          role?: string
          updated_at?: string | null
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
          zoom_link: string
          zoom_password: string | null
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
          zoom_link: string
          zoom_password?: string | null
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
          zoom_link?: string
          zoom_password?: string | null
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
      ssra_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          course_id: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
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
          id?: string
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
          id?: string
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
    }
    Functions: {
      course_has_seats: { Args: { _course_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_ssra_cert_code: { Args: never; Returns: string }
      generate_ssra_order_number: { Args: never; Returns: string }
      get_live_visitor_stats: {
        Args: { _window_minutes?: number }
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
      get_ssra_role: { Args: { _uid: string }; Returns: string }
      is_ssra_admin: { Args: { _uid: string }; Returns: boolean }
      is_ssra_instructor: { Args: { _uid: string }; Returns: boolean }
      is_ssra_super_admin: { Args: { _uid: string }; Returns: boolean }
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
