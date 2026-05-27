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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          admin_user_id: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      alert_dispatch_log: {
        Row: {
          channel: string
          context: Json | null
          created_at: string
          delivered: boolean | null
          delivery_error: string | null
          fingerprint: string
          id: string
          message: string | null
          severity: string
          source: string | null
        }
        Insert: {
          channel: string
          context?: Json | null
          created_at?: string
          delivered?: boolean | null
          delivery_error?: string | null
          fingerprint: string
          id?: string
          message?: string | null
          severity: string
          source?: string | null
        }
        Update: {
          channel?: string
          context?: Json | null
          created_at?: string
          delivered?: boolean | null
          delivery_error?: string | null
          fingerprint?: string
          id?: string
          message?: string | null
          severity?: string
          source?: string | null
        }
        Relationships: []
      }
      body_area_change_logs: {
        Row: {
          booking_body_area_id: string
          booking_id: string
          change_type: string
          changed_by: string | null
          created_at: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          booking_body_area_id: string
          booking_id: string
          change_type: string
          changed_by?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          booking_body_area_id?: string
          booking_id?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "body_area_change_logs_booking_body_area_id_fkey"
            columns: ["booking_body_area_id"]
            isOneToOne: false
            referencedRelation: "booking_body_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_area_change_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      body_area_restrictions: {
        Row: {
          area_code: string
          area_label: string
          created_at: string
          id: string
          is_allowed: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          area_code: string
          area_label: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          area_code?: string
          area_label?: string
          created_at?: string
          id?: string
          is_allowed?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_body_areas: {
        Row: {
          area_code: string
          area_label: string
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          is_focus: boolean
          notes: string | null
          pain_intensity: number | null
          side: string | null
          updated_at: string
        }
        Insert: {
          area_code: string
          area_label: string
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_focus?: boolean
          notes?: string | null
          pain_intensity?: number | null
          side?: string | null
          updated_at?: string
        }
        Update: {
          area_code?: string
          area_label?: string
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_focus?: boolean
          notes?: string | null
          pain_intensity?: number | null
          side?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_body_areas_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          booking_date: string | null
          booking_id: string | null
          booking_time: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          details: Json | null
          event_type: string
          gym_id: string | null
          hotel_id: string | null
          id: string
          severity: string
          venue_type: string | null
        }
        Insert: {
          booking_date?: string | null
          booking_id?: string | null
          booking_time?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          details?: Json | null
          event_type: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          severity?: string
          venue_type?: string | null
        }
        Update: {
          booking_date?: string | null
          booking_id?: string | null
          booking_time?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          details?: Json | null
          event_type?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          severity?: string
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_events_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_feedback: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          customer_first_name: string | null
          feedback_email_sent_at: string | null
          feedback_token: string
          gym_id: string | null
          hotel_id: string | null
          id: string
          is_flagged: boolean
          is_submitted: boolean
          service_rating: number | null
          submitted_at: string | null
          therapist_advice: string | null
          therapist_id: string | null
          therapist_rating: number | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_first_name?: string | null
          feedback_email_sent_at?: string | null
          feedback_token?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_flagged?: boolean
          is_submitted?: boolean
          service_rating?: number | null
          submitted_at?: string | null
          therapist_advice?: string | null
          therapist_id?: string | null
          therapist_rating?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_first_name?: string | null
          feedback_email_sent_at?: string | null
          feedback_token?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_flagged?: boolean
          is_submitted?: boolean
          service_rating?: number | null
          submitted_at?: string | null
          therapist_advice?: string | null
          therapist_id?: string | null
          therapist_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_feedback_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_feedback_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_feedback_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_feedback_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_feedback_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_feedback_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reschedules: {
        Row: {
          auto_processed_at: string | null
          booking_id: string
          created_at: string
          customer_notified_at: string | null
          customer_responded_at: string | null
          exception_id: string
          id: string
          original_date: string
          original_time: string
          reschedule_token: string
          response_deadline: string
          selected_date: string | null
          selected_time: string | null
          status: Database["public"]["Enums"]["reschedule_status"]
          suggested_date: string | null
          suggested_time: string | null
          updated_at: string
        }
        Insert: {
          auto_processed_at?: string | null
          booking_id: string
          created_at?: string
          customer_notified_at?: string | null
          customer_responded_at?: string | null
          exception_id: string
          id?: string
          original_date: string
          original_time: string
          reschedule_token?: string
          response_deadline: string
          selected_date?: string | null
          selected_time?: string | null
          status?: Database["public"]["Enums"]["reschedule_status"]
          suggested_date?: string | null
          suggested_time?: string | null
          updated_at?: string
        }
        Update: {
          auto_processed_at?: string | null
          booking_id?: string
          created_at?: string
          customer_notified_at?: string | null
          customer_responded_at?: string | null
          exception_id?: string
          id?: string
          original_date?: string
          original_time?: string
          reschedule_token?: string
          response_deadline?: string
          selected_date?: string | null
          selected_time?: string | null
          status?: Database["public"]["Enums"]["reschedule_status"]
          suggested_date?: string | null
          suggested_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reschedules_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reschedules_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "schedule_exceptions"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_time: string
          cancellation_token: string | null
          client_address: string | null
          client_age: number | null
          client_phone: string | null
          communication_preference: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string | null
          date_of_birth: string | null
          gender: string | null
          gym_id: string | null
          health_confirmed: boolean | null
          hotel_id: string | null
          id: string
          invoice_number: string | null
          net_amount: number | null
          notes: string | null
          payment_status: string | null
          policy_accepted: boolean | null
          policy_accepted_at: string | null
          pregnancy_status: string | null
          reminder_sent_at: string | null
          salutation: string | null
          service_id: string
          service_name_snapshot: string | null
          service_price_snapshot: number | null
          status: string | null
          stripe_session_id: string | null
          tax_amount: number
          tax_rate: number
          tax_regime: string
          therapist_id: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          booking_date: string
          booking_time: string
          cancellation_token?: string | null
          client_address?: string | null
          client_age?: number | null
          client_phone?: string | null
          communication_preference?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name?: string | null
          date_of_birth?: string | null
          gender?: string | null
          gym_id?: string | null
          health_confirmed?: boolean | null
          hotel_id?: string | null
          id?: string
          invoice_number?: string | null
          net_amount?: number | null
          notes?: string | null
          payment_status?: string | null
          policy_accepted?: boolean | null
          policy_accepted_at?: string | null
          pregnancy_status?: string | null
          reminder_sent_at?: string | null
          salutation?: string | null
          service_id: string
          service_name_snapshot?: string | null
          service_price_snapshot?: number | null
          status?: string | null
          stripe_session_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tax_regime?: string
          therapist_id?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          booking_date?: string
          booking_time?: string
          cancellation_token?: string | null
          client_address?: string | null
          client_age?: number | null
          client_phone?: string | null
          communication_preference?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string | null
          date_of_birth?: string | null
          gender?: string | null
          gym_id?: string | null
          health_confirmed?: boolean | null
          hotel_id?: string | null
          id?: string
          invoice_number?: string | null
          net_amount?: number | null
          notes?: string | null
          payment_status?: string | null
          policy_accepted?: boolean | null
          policy_accepted_at?: string | null
          pregnancy_status?: string | null
          reminder_sent_at?: string | null
          salutation?: string | null
          service_id?: string
          service_name_snapshot?: string | null
          service_price_snapshot?: number | null
          status?: string | null
          stripe_session_id?: string | null
          tax_amount?: number
          tax_rate?: number
          tax_regime?: string
          therapist_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          created_at: string
          gym_id: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string
          country_id: string | null
          county_id: string | null
          created_at: string
          federal_state_id: string | null
          gym_count: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          country: string
          country_id?: string | null
          county_id?: string | null
          created_at?: string
          federal_state_id?: string | null
          gym_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          country?: string
          country_id?: string | null
          county_id?: string | null
          created_at?: string
          federal_state_id?: string | null
          gym_count?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "counties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_federal_state_id_fkey"
            columns: ["federal_state_id"]
            isOneToOne: false
            referencedRelation: "federal_states"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_access_logs: {
        Row: {
          action: string
          booking_id: string | null
          id: string
          ip_address: string | null
          locked_at: string | null
          unlocked_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string
          booking_id?: string | null
          id?: string
          ip_address?: string | null
          locked_at?: string | null
          unlocked_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          booking_id?: string | null
          id?: string
          ip_address?: string | null
          locked_at?: string | null
          unlocked_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_access_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      counties: {
        Row: {
          code: string
          created_at: string
          federal_state_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          federal_state_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          federal_state_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counties_federal_state_id_fkey"
            columns: ["federal_state_id"]
            isOneToOne: false
            referencedRelation: "federal_states"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          currency_symbol: string
          default_language: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          tax_id_label: string
          tax_label: string
          tax_rate: number
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_language?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          tax_id_label?: string
          tax_label?: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          default_language?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          tax_id_label?: string
          tax_label?: string
          tax_rate?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_financials: {
        Row: {
          bank_account_holder: string | null
          bank_bic: string | null
          bank_iban: string | null
          bank_name: string | null
          country_id: string
          created_at: string
          invoice_footer_note: string | null
          stripe_publishable_key: string | null
          stripe_secret_key_name: string
          tax_id_value: string | null
          updated_at: string
        }
        Insert: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          country_id: string
          created_at?: string
          invoice_footer_note?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_name?: string
          tax_id_value?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_holder?: string | null
          bank_bic?: string | null
          bank_iban?: string | null
          bank_name?: string | null
          country_id?: string
          created_at?: string
          invoice_footer_note?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_name?: string
          tax_id_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_financials_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_failures: {
        Row: {
          context: Json
          created_at: string
          error_message: string | null
          fingerprint: string
          first_seen: string
          function_name: string
          id: string
          last_seen: string
          occurrences: number
          request_path: string | null
          status_code: number | null
        }
        Insert: {
          context?: Json
          created_at?: string
          error_message?: string | null
          fingerprint: string
          first_seen?: string
          function_name: string
          id?: string
          last_seen?: string
          occurrences?: number
          request_path?: string | null
          status_code?: number | null
        }
        Update: {
          context?: Json
          created_at?: string
          error_message?: string | null
          fingerprint?: string
          first_seen?: string
          function_name?: string
          id?: string
          last_seen?: string
          occurrences?: number
          request_path?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      federal_states: {
        Row: {
          code: string
          country_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          country_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          country_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "federal_states_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          email: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          email: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          email?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      generated_reports: {
        Row: {
          created_at: string
          date_from: string
          date_to: string
          generated_by: string | null
          id: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          report_data: Json
          report_type: Database["public"]["Enums"]["report_type"]
          template_id: string | null
        }
        Insert: {
          created_at?: string
          date_from: string
          date_to: string
          generated_by?: string | null
          id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          report_data?: Json
          report_type: Database["public"]["Enums"]["report_type"]
          template_id?: string | null
        }
        Update: {
          created_at?: string
          date_from?: string
          date_to?: string
          generated_by?: string | null
          id?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
          report_data?: Json
          report_type?: Database["public"]["Enums"]["report_type"]
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_contacts: {
        Row: {
          created_at: string
          deputy_manager_email: string | null
          deputy_manager_name: string | null
          deputy_manager_phone: string | null
          gym_id: string
          id: string
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          notes: string | null
          preferred_delivery_channel: Database["public"]["Enums"]["delivery_method"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deputy_manager_email?: string | null
          deputy_manager_name?: string | null
          deputy_manager_phone?: string | null
          gym_id: string
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          preferred_delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deputy_manager_email?: string | null
          deputy_manager_name?: string | null
          deputy_manager_phone?: string | null
          gym_id?: string
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          preferred_delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_contacts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_contacts_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: true
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_schedules: {
        Row: {
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          gym_id: string
          id: string
          is_active: boolean
          max_hours_per_day: number
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          gym_id: string
          id?: string
          is_active?: boolean
          max_hours_per_day?: number
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          gym_id?: string
          id?: string
          is_active?: boolean
          max_hours_per_day?: number
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_services: {
        Row: {
          created_at: string
          custom_price: number | null
          gym_id: string
          id: string
          is_active: boolean
          promo_ends_at: string | null
          promo_label: string | null
          promo_price: number | null
          promo_starts_at: string | null
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          gym_id: string
          id?: string
          is_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          gym_id?: string
          id?: string
          is_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_services_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_services_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string
          city_id: string
          commission_percentage: number | null
          country_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          open_hours: string | null
          phone: string | null
          qr_code_id: string
          rating: number | null
          review_count: number | null
          updated_at: string
        }
        Insert: {
          address: string
          city_id: string
          commission_percentage?: number | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          open_hours?: string | null
          phone?: string | null
          qr_code_id: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          commission_percentage?: number | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          open_hours?: string | null
          phone?: string | null
          qr_code_id?: string
          rating?: number | null
          review_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gyms_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gyms_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_contacts: {
        Row: {
          created_at: string
          deputy_manager_email: string | null
          deputy_manager_name: string | null
          deputy_manager_phone: string | null
          hotel_id: string
          id: string
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          notes: string | null
          preferred_delivery_channel: Database["public"]["Enums"]["delivery_method"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deputy_manager_email?: string | null
          deputy_manager_name?: string | null
          deputy_manager_phone?: string | null
          hotel_id: string
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          preferred_delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deputy_manager_email?: string | null
          deputy_manager_name?: string | null
          deputy_manager_phone?: string | null
          hotel_id?: string
          id?: string
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          notes?: string | null
          preferred_delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_contacts_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: true
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_schedules: {
        Row: {
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          hotel_id: string
          id: string
          is_active: boolean
          max_hours_per_day: number
          slot_duration_minutes: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          hotel_id: string
          id?: string
          is_active?: boolean
          max_hours_per_day?: number
          slot_duration_minutes?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          hotel_id?: string
          id?: string
          is_active?: boolean
          max_hours_per_day?: number
          slot_duration_minutes?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_schedules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_services: {
        Row: {
          created_at: string
          custom_price: number | null
          hotel_id: string
          id: string
          is_active: boolean
          promo_ends_at: string | null
          promo_label: string | null
          promo_price: number | null
          promo_starts_at: string | null
          service_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_price?: number | null
          hotel_id: string
          id?: string
          is_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          service_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_price?: number | null
          hotel_id?: string
          id?: string
          is_active?: boolean
          promo_ends_at?: string | null
          promo_label?: string | null
          promo_price?: number | null
          promo_starts_at?: string | null
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_services_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string
          city_id: string
          commission_percentage: number | null
          country_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          open_hours: string | null
          phone: string | null
          qr_code_id: string
          rating: number | null
          review_count: number | null
          star_rating: number | null
          updated_at: string
        }
        Insert: {
          address: string
          city_id: string
          commission_percentage?: number | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          open_hours?: string | null
          phone?: string | null
          qr_code_id?: string
          rating?: number | null
          review_count?: number | null
          star_rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          city_id?: string
          commission_percentage?: number | null
          country_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          open_hours?: string | null
          phone?: string | null
          qr_code_id?: string
          rating?: number | null
          review_count?: number | null
          star_rating?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          id: string
          last_attempt_at: string | null
          locked_until: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          id?: string
          last_attempt_at?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      otp_rate_limits: {
        Row: {
          action_type: string
          attempts: number
          blocked_until: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          updated_at: string
          window_started_at: string
        }
        Insert: {
          action_type: string
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string
          window_started_at?: string
        }
        Update: {
          action_type?: string
          attempts?: number
          blocked_until?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_delivery_logs: {
        Row: {
          created_at: string
          delivery_channel: Database["public"]["Enums"]["delivery_method"]
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          error_message: string | null
          id: string
          metadata: Json | null
          recipient_email: string | null
          recipient_phone: string | null
          report_id: string
          sent_at: string | null
          sent_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_channel: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          report_id: string
          sent_at?: string | null
          sent_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          report_id?: string
          sent_at?: string | null
          sent_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_delivery_logs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "generated_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          report_type: Database["public"]["Enums"]["report_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          recipient_type: Database["public"]["Enums"]["recipient_type"]
          report_type: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          recipient_type?: Database["public"]["Enums"]["recipient_type"]
          report_type?: Database["public"]["Enums"]["report_type"]
          updated_at?: string
        }
        Relationships: []
      }
      reschedule_notifications: {
        Row: {
          created_at: string
          delivery_channel: Database["public"]["Enums"]["delivery_method"]
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string | null
          recipient_phone: string | null
          reschedule_id: string
          sent_at: string | null
          venue_type: string | null
        }
        Insert: {
          created_at?: string
          delivery_channel: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email?: string | null
          recipient_phone?: string | null
          reschedule_id: string
          sent_at?: string | null
          venue_type?: string | null
        }
        Update: {
          created_at?: string
          delivery_channel?: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          reschedule_id?: string
          sent_at?: string | null
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_notifications_reschedule_id_fkey"
            columns: ["reschedule_id"]
            isOneToOne: false
            referencedRelation: "booking_reschedules"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_logs: {
        Row: {
          action: string
          changed_by: string
          created_at: string
          id: string
          ip_address: string | null
          new_role: string | null
          old_role: string | null
          reason: string | null
          target_email: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          changed_by: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_role?: string | null
          old_role?: string | null
          reason?: string | null
          target_email?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          changed_by?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_role?: string | null
          old_role?: string | null
          reason?: string | null
          target_email?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
      schedule_exceptions: {
        Row: {
          alternative_date: string | null
          auto_action: string | null
          created_at: string
          created_by: string | null
          exception_date: string
          gym_id: string | null
          hotel_id: string | null
          id: string
          is_disabled: boolean
          reason: string | null
          response_deadline_hours: number
          updated_at: string
        }
        Insert: {
          alternative_date?: string | null
          auto_action?: string | null
          created_at?: string
          created_by?: string | null
          exception_date: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_disabled?: boolean
          reason?: string | null
          response_deadline_hours?: number
          updated_at?: string
        }
        Update: {
          alternative_date?: string | null
          auto_action?: string | null
          created_at?: string
          created_by?: string | null
          exception_date?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_disabled?: boolean
          reason?: string | null
          response_deadline_hours?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_exceptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_exceptions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          country_id: string | null
          created_at: string
          description: string | null
          description_ar: string | null
          duration_minutes: number
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          name_ar: string | null
          price: number
          stripe_payment_link: string | null
          stripe_price_id: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_ar?: string | null
          price: number
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          description?: string | null
          description_ar?: string | null
          duration_minutes?: number
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_ar?: string | null
          price?: number
          stripe_payment_link?: string | null
          stripe_price_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          booking_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          received_at: string
          stripe_event_id: string
          stripe_session_id: string | null
          webhook_status: string
        }
        Insert: {
          booking_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          stripe_event_id: string
          stripe_session_id?: string | null
          webhook_status?: string
        }
        Update: {
          booking_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          received_at?: string
          stripe_event_id?: string
          stripe_session_id?: string | null
          webhook_status?: string
        }
        Relationships: []
      }
      system_incidents: {
        Row: {
          context: Json
          created_at: string
          fingerprint: string
          first_seen: string
          id: string
          last_seen: string
          message: string
          occurrences: number
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          updated_at: string
        }
        Insert: {
          context?: Json
          created_at?: string
          fingerprint: string
          first_seen?: string
          id?: string
          last_seen?: string
          message: string
          occurrences?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source: string
          updated_at?: string
        }
        Update: {
          context?: Json
          created_at?: string
          fingerprint?: string
          first_seen?: string
          id?: string
          last_seen?: string
          message?: string
          occurrences?: number
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      therapist_assignments: {
        Row: {
          assignment_date: string
          created_at: string
          created_by: string | null
          end_time: string
          gym_id: string | null
          hotel_id: string | null
          id: string
          start_time: string
          status: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          assignment_date: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          start_time?: string
          status?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          created_by?: string | null
          end_time?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          start_time?: string
          status?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_assignments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_assignments_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_assignments_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_assignments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_assignments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_attendance: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          id: string
          logged_by: string | null
          notes: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          therapist_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          therapist_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          therapist_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_attendance_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_attendance_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_cities: {
        Row: {
          city_id: string
          created_at: string
          id: string
          therapist_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          therapist_id: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_cities_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_cities_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_cities_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_daily_sends: {
        Row: {
          assignment_date: string
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          error_message: string | null
          id: string
          sent_at: string | null
          sent_by: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          assignment_date: string
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          error_message?: string | null
          id?: string
          sent_at?: string | null
          sent_by?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_daily_sends_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_daily_sends_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_gyms: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          is_primary: boolean
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          is_primary?: boolean
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          is_primary?: boolean
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_gyms_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_gyms_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_gyms_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_gyms_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_hotels: {
        Row: {
          created_at: string
          hotel_id: string
          id: string
          is_primary: boolean
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hotel_id: string
          id?: string
          is_primary?: boolean
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hotel_id?: string
          id?: string
          is_primary?: boolean
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_hotels_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_hotels_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_hotels_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_leaves: {
        Row: {
          approved_by: string | null
          created_at: string
          end_date: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          therapist_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          end_date: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          therapist_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          end_date?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_leaves_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_leaves_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_private_info: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          phone: string | null
          therapist_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          therapist_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_private_info_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: true
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_private_info_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: true
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_venues: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          notes: string | null
          therapist_id: string
          updated_at: string
          venue_id: string
          venue_type: Database["public"]["Enums"]["venue_type_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          therapist_id: string
          updated_at?: string
          venue_id: string
          venue_type: Database["public"]["Enums"]["venue_type_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          notes?: string | null
          therapist_id?: string
          updated_at?: string
          venue_id?: string
          venue_type?: Database["public"]["Enums"]["venue_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "therapist_venues_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_venues_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_weekly_schedules: {
        Row: {
          created_at: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          gym_id: string | null
          hotel_id: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          start_time: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          start_time?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: Database["public"]["Enums"]["day_of_week"]
          end_time?: string
          gym_id?: string | null
          hotel_id?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          start_time?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_weekly_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_weekly_schedules_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_weekly_schedules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_weekly_schedules_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_weekly_schedules_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists_public"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          city_id: string | null
          created_at: string
          education: string | null
          gender: string | null
          gym_id: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          profession: Database["public"]["Enums"]["profession_type"] | null
          rating: number | null
          score: number
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          rating?: number | null
          score?: number
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string
          education?: string | null
          gender?: string | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          rating?: number | null
          score?: number
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapists_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapists_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          country_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_sheets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          rows_synced: number | null
          spreadsheet_id: string
          spreadsheet_url: string
          updated_at: string
          venue_id: string
          venue_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          rows_synced?: number | null
          spreadsheet_id: string
          spreadsheet_url: string
          updated_at?: string
          venue_id: string
          venue_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          rows_synced?: number | null
          spreadsheet_id?: string
          spreadsheet_url?: string
          updated_at?: string
          venue_id?: string
          venue_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      gyms_public: {
        Row: {
          address: string | null
          city_id: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          open_hours: string | null
          rating: number | null
          review_count: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          open_hours?: string | null
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          open_hours?: string | null
          rating?: number | null
          review_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gyms_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists_public: {
        Row: {
          city_id: string | null
          created_at: string | null
          education: string | null
          gym_id: string | null
          id: string | null
          image_url: string | null
          is_available: boolean | null
          name: string | null
          profession: Database["public"]["Enums"]["profession_type"] | null
          rating: number | null
          specialty: string | null
          updated_at: string | null
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          education?: string | null
          gym_id?: string | null
          id?: string | null
          image_url?: string | null
          is_available?: boolean | null
          name?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          education?: string | null
          gym_id?: string | null
          id?: string | null
          image_url?: string | null
          is_available?: boolean | null
          name?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          rating?: number | null
          specialty?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapists_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapists_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alert_allowed: {
        Args: { p_cooldown_minutes?: number; p_fingerprint: string }
        Returns: boolean
      }
      calculate_therapist_score: {
        Args: { p_therapist_id: string }
        Returns: {
          experience_points: number
          retention_points: number
          review_points: number
          session_points: number
          star_rating: number
          total_score: number
        }[]
      }
      check_hotel_slot_availability: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_hotel_id: string
          p_time: string
        }
        Returns: boolean
      }
      check_otp_rate_limit: {
        Args: {
          p_action_type: string
          p_block_minutes?: number
          p_email: string
          p_email_max?: number
          p_email_window_minutes?: number
          p_ip_address: string
          p_ip_max?: number
          p_ip_window_minutes?: number
        }
        Returns: Json
      }
      check_slot_availability: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_gym_id: string
          p_time: string
        }
        Returns: boolean
      }
      cleanup_otp_rate_limits: { Args: never; Returns: undefined }
      create_booking_atomic: {
        Args: {
          p_booking_date: string
          p_booking_time: string
          p_cancellation_token?: string
          p_client_address?: string
          p_client_age?: number
          p_client_phone?: string
          p_customer_email: string
          p_customer_name?: string
          p_date_of_birth?: string
          p_gender?: string
          p_gym_id: string
          p_health_confirmed?: boolean
          p_payment_status?: string
          p_salutation?: string
          p_service_id: string
          p_stripe_session_id?: string
          p_total_amount?: number
          p_user_id?: string
        }
        Returns: string
      }
      create_hotel_booking_atomic: {
        Args: {
          p_booking_date: string
          p_booking_time: string
          p_cancellation_token?: string
          p_client_address?: string
          p_client_age?: number
          p_client_phone?: string
          p_customer_email: string
          p_customer_name?: string
          p_date_of_birth?: string
          p_gender?: string
          p_health_confirmed?: boolean
          p_hotel_id: string
          p_payment_status?: string
          p_salutation?: string
          p_service_id: string
          p_stripe_session_id?: string
          p_total_amount?: number
          p_user_id?: string
        }
        Returns: string
      }
      get_booked_slots: {
        Args: { p_date: string; p_gym_id: string }
        Returns: {
          booking_time: string
          buffer_after: number
          buffer_before: number
          duration_minutes: number
        }[]
      }
      get_effective_service_price: {
        Args: { _service_id: string; _venue_id: string; _venue_type: string }
        Returns: number
      }
      get_gym_available_dates: {
        Args: {
          p_gym_id: string
          p_months_ahead?: number
          p_start_date?: string
        }
        Returns: {
          available_date: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          exception_reason: string
          is_exception: boolean
          max_hours: number
          slot_duration: number
          start_time: string
        }[]
      }
      get_gym_country_id: { Args: { _gym_id: string }; Returns: string }
      get_hotel_available_dates: {
        Args: {
          p_hotel_id: string
          p_months_ahead?: number
          p_start_date?: string
        }
        Returns: {
          available_date: string
          day_of_week: Database["public"]["Enums"]["day_of_week"]
          end_time: string
          max_hours: number
          slot_duration: number
          start_time: string
        }[]
      }
      get_hotel_booked_slots: {
        Args: { p_date: string; p_hotel_id: string }
        Returns: {
          booking_time: string
          buffer_after: number
          buffer_before: number
          duration_minutes: number
        }[]
      }
      get_hotel_country_id: { Args: { _hotel_id: string }; Returns: string }
      get_public_reviews: {
        Args: { p_country_id: string; p_limit?: number }
        Returns: {
          comment: string
          customer_first_name: string
          gym_id: string
          gym_name: string
          id: string
          service_rating: number
          submitted_at: string
          therapist_rating: number
        }[]
      }
      get_reschedule_by_token: {
        Args: { p_token: string }
        Returns: {
          auto_processed_at: string
          booking_customer_email: string
          booking_customer_name: string
          booking_gym_id: string
          booking_hotel_id: string
          booking_id: string
          booking_service_id: string
          created_at: string
          customer_notified_at: string
          customer_responded_at: string
          exception_id: string
          id: string
          original_date: string
          original_time: string
          reschedule_token: string
          response_deadline: string
          selected_date: string
          selected_time: string
          status: string
          suggested_date: string
          suggested_time: string
          updated_at: string
        }[]
      }
      get_venue_country_id: {
        Args: {
          _venue_id: string
          _venue_type: Database["public"]["Enums"]["venue_type_enum"]
        }
        Returns: string
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_country_access: {
        Args: { _country_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_system_incident: {
        Args: {
          p_context?: Json
          p_fingerprint: string
          p_message: string
          p_severity?: string
          p_source: string
        }
        Returns: string
      }
      mask_email: { Args: { email: string }; Returns: string }
      move_booking_atomic: {
        Args: {
          p_booking_id: string
          p_new_date: string
          p_new_therapist_id?: string
          p_new_time: string
        }
        Returns: Json
      }
      resolve_venue: {
        Args: {
          _venue_id: string
          _venue_type: Database["public"]["Enums"]["venue_type_enum"]
        }
        Returns: Json
      }
      therapist_has_gym_access: {
        Args: { _booking_date: string; _gym_id: string; _user_id: string }
        Returns: boolean
      }
      therapist_has_hotel_access: {
        Args: { _booking_date: string; _hotel_id: string; _user_id: string }
        Returns: boolean
      }
      therapist_has_venue_access: {
        Args: {
          _booking_date: string
          _user_id: string
          _venue_id: string
          _venue_type: Database["public"]["Enums"]["venue_type_enum"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "client" | "therapist" | "super_admin"
      attendance_status:
        | "working"
        | "sick"
        | "day_off"
        | "left_early"
        | "no_show"
        | "overtime"
      day_of_week:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
      delivery_method: "email" | "whatsapp" | "both"
      delivery_status: "pending" | "sent" | "failed" | "resent"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type: "vacation" | "sick" | "personal" | "emergency"
      profession_type:
        | "massage_therapist"
        | "physiotherapist"
        | "sports_therapist"
      recipient_type: "therapist" | "gym" | "admin"
      report_type:
        | "daily_booking"
        | "weekly_booking"
        | "monthly_booking"
        | "therapist_summary"
        | "gym_commission"
        | "admin_overview"
      reschedule_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "auto_confirmed"
        | "auto_cancelled"
      venue_type_enum:
        | "gym"
        | "hotel"
        | "clinic"
        | "spa"
        | "recovery"
        | "wellness"
        | "corporate"
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
      app_role: ["admin", "user", "client", "therapist", "super_admin"],
      attendance_status: [
        "working",
        "sick",
        "day_off",
        "left_early",
        "no_show",
        "overtime",
      ],
      day_of_week: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      delivery_method: ["email", "whatsapp", "both"],
      delivery_status: ["pending", "sent", "failed", "resent"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: ["vacation", "sick", "personal", "emergency"],
      profession_type: [
        "massage_therapist",
        "physiotherapist",
        "sports_therapist",
      ],
      recipient_type: ["therapist", "gym", "admin"],
      report_type: [
        "daily_booking",
        "weekly_booking",
        "monthly_booking",
        "therapist_summary",
        "gym_commission",
        "admin_overview",
      ],
      reschedule_status: [
        "pending",
        "confirmed",
        "declined",
        "auto_confirmed",
        "auto_cancelled",
      ],
      venue_type_enum: [
        "gym",
        "hotel",
        "clinic",
        "spa",
        "recovery",
        "wellness",
        "corporate",
      ],
    },
  },
} as const
