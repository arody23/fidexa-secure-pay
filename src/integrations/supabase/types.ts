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
      payment_links: {
        Row: {
          amount: number
          client_email: string | null
          client_country: string | null
          client_name: string | null
          client_momo_phone: string | null
          client_phone: string | null
          created_at: string
          delivery_days: number
          description: string
          id: string
          is_paid: boolean
          link_id: string
          provider_id: string | null
          provider_avatar: string | null
          provider_name: string
          provider_notes: string | null
          status: string
          order_status: string | null
          escrow_released: boolean | null
          escrow_released_at: string | null
          refunded: boolean | null
          refunded_at: string | null
          cancelled_at: string | null
          validated_at: string | null
          payment_method: string | null
          transaction_id: string | null
          paid_at: string | null
          updated_at: string
          net_amount: number | null
          commission_amount: number | null
          commission_rate: number | null
          auto_release_at: string | null
          auto_validated: boolean | null
          started_at: string | null
          completed_at: string | null
          can_cancel: boolean | null
        }
        Insert: {
          amount: number
          client_email?: string | null
          client_country?: string | null
          client_name?: string | null
          client_momo_phone?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_days?: number
          description: string
          id?: string
          is_paid?: boolean
          link_id: string
          provider_id?: string | null
          provider_avatar?: string | null
          provider_name?: string
          status?: string
          order_status?: string | null
          escrow_released?: boolean | null
          escrow_released_at?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          cancelled_at?: string | null
          validated_at?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          paid_at?: string | null
          updated_at?: string
          net_amount?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          auto_release_at?: string | null
          auto_validated?: boolean | null
          started_at?: string | null
          completed_at?: string | null
          can_cancel?: boolean | null
        }
        Update: {
          amount?: number
          client_email?: string | null
          client_country?: string | null
          client_name?: string | null
          client_momo_phone?: string | null
          client_phone?: string | null
          created_at?: string
          delivery_days?: number
          description?: string
          id?: string
          is_paid?: boolean
          link_id?: string
          provider_id?: string | null
          provider_avatar?: string | null
          provider_name?: string
          status?: string
          order_status?: string | null
          escrow_released?: boolean | null
          escrow_released_at?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          cancelled_at?: string | null
          validated_at?: string | null
          payment_method?: string | null
          transaction_id?: string | null
          paid_at?: string | null
          updated_at?: string
          net_amount?: number | null
          commission_amount?: number | null
          commission_rate?: number | null
          auto_release_at?: string | null
          auto_validated?: boolean | null
          started_at?: string | null
          completed_at?: string | null
          can_cancel?: boolean | null
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          kyc_status: string | null
          kyc_document_url: Json | null
          role: string
          is_admin: boolean
          verified: boolean
          avatar_url: string | null
          bio: string | null
          currency: string | null
          country: string | null
          subscription_plan: string | null
          subscription_type: string | null
          commission_rate: number | null
          rating: number | null
          phone_number: string | null
          subscription_start_date: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          kyc_status?: string | null
          kyc_document_url?: Json | null
          role?: string
          is_admin?: boolean
          verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          currency?: string | null
          country?: string | null
          subscription_plan?: string | null
          subscription_type?: string | null
          commission_rate?: number | null
          rating?: number | null
          phone_number?: string | null
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          kyc_status?: string | null
          kyc_document_url?: Json | null
          role?: string
          is_admin?: boolean
          verified?: boolean
          avatar_url?: string | null
          bio?: string | null
          currency?: string | null
          country?: string | null
          subscription_plan?: string | null
          subscription_type?: string | null
          commission_rate?: number | null
          rating?: number | null
          phone_number?: string | null
          subscription_start_date?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          details?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          payment_link_id: string
          amount: number
          currency: string | null
          status: string
          payment_method: string | null
          flutterwave_ref: string | null
          client_id: string | null
          provider_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          payment_link_id: string
          amount: number
          currency?: string | null
          status?: string
          payment_method?: string | null
          flutterwave_ref?: string | null
          client_id?: string | null
          provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          payment_link_id?: string
          amount?: number
          currency?: string | null
          status?: string
          payment_method?: string | null
          flutterwave_ref?: string | null
          client_id?: string | null
          provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          id: string
          payment_link_id: string | null
          client_name: string
          client_email: string | null
          client_phone: string | null
          reason: string
          description: string | null
          status: string
          created_at: string
          resolution: string | null
          resolved_by: string | null
          resolved_at: string | null
          resolved_in_favor_of: string | null
          admin_notes: string | null
          resolution_type: string | null
          resolution_notes: string | null
          evidence_urls: Json | null
          provider_response: string | null
          provider_response_at: string | null
          provider_evidence_urls: Json | null
        }
        Insert: {
          id?: string
          payment_link_id?: string | null
          client_name: string
          client_email?: string | null
          client_phone?: string | null
          reason: string
          description?: string | null
          status?: string
          created_at?: string
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolved_in_favor_of?: string | null
          admin_notes?: string | null
        }
        Update: {
          id?: string
          payment_link_id?: string | null
          client_name?: string
          client_email?: string | null
          client_phone?: string | null
          reason?: string
          description?: string | null
          status?: string
          created_at?: string
          resolution?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          resolved_in_favor_of?: string | null
          admin_notes?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          transaction_id: string
          reviewer_id: string
          reviewed_id: string
          rating: number
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          reviewer_id: string
          reviewed_id: string
          rating: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          reviewer_id?: string
          reviewed_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_conversations: {
        Row: {
          id: string
          user_id: string
          subject: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      support_messages: {
        Row: {
          id: string
          conversation_id: string
          sender_type: string
          sender_id: string | null
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_type: string
          sender_id?: string | null
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_type?: string
          sender_id?: string | null
          message?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      order_timeline: {
        Row: {
          id: string
          payment_link_id: string
          status: string
          action: string
          description: string | null
          actor_id: string | null
          actor_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_link_id: string
          status: string
          action: string
          description?: string | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_link_id?: string
          status?: string
          action?: string
          description?: string | null
          actor_id?: string | null
          actor_type?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_timeline_payment_link_id_fkey"
            columns: ["payment_link_id"]
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string | null
          related_id: string | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message?: string | null
          related_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string | null
          related_id?: string | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_kyc_submissions: {
        Args: Record<string, never>
        Returns: {
          user_id: string
          email: string
          full_name: string | null
          kyc_status: string | null
          kyc_document_url: Json | null
          created_at: string
        }[]
      }
      admin_update_kyc_status: {
        Args: {
          target_user_id: string
          new_status: string
        }
        Returns: void
      }
      validate_order: {
        Args: { link_id_param: string }
        Returns: Json
      }
      start_order: {
        Args: { link_id_param: string }
        Returns: Json
      }
      complete_order: {
        Args: { link_id_param: string }
        Returns: Json
      }
      cancel_order: {
        Args: { link_id_param: string; reason_param?: string }
        Returns: Json
      }
      create_dispute: {
        Args: {
          link_id_param: string
          reason_param: string
          description_param?: string
        }
        Returns: Json
      }
      process_auto_escrow_releases: {
        Args: Record<string, never>
        Returns: Json
      }
      get_order_timeline: {
        Args: { link_id_param: string }
        Returns: {
          id: string
          payment_link_id: string
          status: string
          action: string
          description: string | null
          actor_id: string | null
          actor_type: string | null
          created_at: string
        }[]
      }
      get_order_support: {
        Args: { payment_link_id_param: string }
        Returns: Json
      }
      create_order_support: {
        Args: {
          payment_link_id_param: string
          client_name_param: string
          client_phone_param?: string
          initial_message_param: string
          message_type_param?: string
          attachment_url_param?: string | null
        }
        Returns: Json
      }
      send_order_support_message: {
        Args: {
          conversation_id_param: string
          content_param: string
          message_type_param?: string
          attachment_url_param?: string | null
        }
        Returns: Json
      }
      admin_resolve_dispute: {
        Args: {
          dispute_id_param: string
          decision_param: string
          resolution_notes_param?: string | null
        }
        Returns: Json
      }
      resolve_dispute: {
        Args: {
          dispute_id_param: string
          resolution_param: string
          decision_param: string
        }
        Returns: Json
      }
      create_support_conversation: {
        Args: {
          subject_param?: string
          payment_link_id_param?: string
        }
        Returns: Json
      }
      send_support_message: {
        Args: {
          conversation_id_param: string
          sender_type_param: string
          content_param: string
          message_type_param?: string
          attachment_url_param?: string | null
        }
        Returns: Json
      }
      submit_provider_dispute_response: {
        Args: {
          link_id_param: string
          response_param: string
          evidence_urls_param?: Json
        }
        Returns: Json
      }
      auto_refund_if_not_started: {
        Args: { link_id_param: string }
        Returns: Json
      }
      subscribe_to_plan: {
        Args: {
          plan_name_param: string
          payment_method_param?: string
        }
        Returns: Json
      }
      update_user_profile: {
        Args: {
          p_full_name?: string
          p_bio?: string
          p_phone_number?: string
          p_country?: string
          p_currency?: string
        }
        Returns: Json
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
