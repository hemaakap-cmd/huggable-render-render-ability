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
      ssra_courses: {
        Row: {
          category: string
          course_format: string | null
          course_type: string
          created_at: string | null
          description: string | null
          duration: string | null
          duration_weeks: string | null
          end_date: string | null
          id: string
          image_url: string | null
          instructor_name: string | null
          is_active: boolean
          level: string | null
          modules: Json | null
          price_egp: number | null
          price_eur: number
          price_hidden: boolean
          requires_verification: boolean
          sort_order: number
          start_date: string | null
          start_time: string | null
          stripe_price_id: string | null
          subtitle: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          course_format?: string | null
          course_type: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_weeks?: string | null
          end_date?: string | null
          id: string
          image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur: number
          price_hidden?: boolean
          requires_verification?: boolean
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          stripe_price_id?: string | null
          subtitle?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          course_format?: string | null
          course_type?: string
          created_at?: string | null
          description?: string | null
          duration?: string | null
          duration_weeks?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          instructor_name?: string | null
          is_active?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur?: number
          price_hidden?: boolean
          requires_verification?: boolean
          sort_order?: number
          start_date?: string | null
          start_time?: string | null
          stripe_price_id?: string | null
          subtitle?: string | null
          title?: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ssra_enrollments: {
        Row: {
          amount_eur: number | null
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
            foreignKeyName: "ssra_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ssra_courses"
            referencedColumns: ["id"]
          },
        ]
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
          role?: string
          updated_at?: string | null
        }
        Relationships: []
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
