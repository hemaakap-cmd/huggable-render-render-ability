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
          course_type: string
          created_at: string | null
          description: string | null
          duration_weeks: string | null
          id: string
          image_url: string | null
          is_active: boolean
          level: string | null
          modules: Json | null
          price_egp: number | null
          price_eur: number
          requires_verification: boolean
          sort_order: number
          stripe_price_id: string | null
          subtitle: string | null
          title: string
          title_ar: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          course_type: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: string | null
          id: string
          image_url?: string | null
          is_active?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur: number
          requires_verification?: boolean
          sort_order?: number
          stripe_price_id?: string | null
          subtitle?: string | null
          title: string
          title_ar?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          course_type?: string
          created_at?: string | null
          description?: string | null
          duration_weeks?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          level?: string | null
          modules?: Json | null
          price_egp?: number | null
          price_eur?: number
          requires_verification?: boolean
          sort_order?: number
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
          created_at: string | null
          enrolled_at: string | null
          id: string
          status: string
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_eur?: number | null
          course_id?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_eur?: number | null
          course_id?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ssra_cert_code: { Args: never; Returns: string }
      is_ssra_admin: { Args: { _uid: string }; Returns: boolean }
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
