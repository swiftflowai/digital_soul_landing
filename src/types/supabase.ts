export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string
          id: string
          media_url: string | null
          metadata: Json
          role: Database["public"]["Enums"]["message_role"]
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          metadata?: Json
          role: Database["public"]["Enums"]["message_role"]
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          metadata?: Json
          role?: Database["public"]["Enums"]["message_role"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          persona_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          persona_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          persona_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          created_by: string
          evidence_url: string | null
          given_by_name: string | null
          id: string
          notes: string | null
          persona_id: string
          relation: string | null
        }
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          created_by: string
          evidence_url?: string | null
          given_by_name?: string | null
          id?: string
          notes?: string | null
          persona_id: string
          relation?: string | null
        }
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          created_by?: string
          evidence_url?: string | null
          given_by_name?: string | null
          id?: string
          notes?: string | null
          persona_id?: string
          relation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          persona_id: string
          type: Database["public"]["Enums"]["media_type"]
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          persona_id: string
          type: Database["public"]["Enums"]["media_type"]
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          persona_id?: string
          type?: Database["public"]["Enums"]["media_type"]
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string | null
          id: string
          persona_id: string
          role: Database["public"]["Enums"]["persona_role"]
          status: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string | null
          id?: string
          persona_id: string
          role: Database["public"]["Enums"]["persona_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string | null
          id?: string
          persona_id?: string
          role?: Database["public"]["Enums"]["persona_role"]
          status?: Database["public"]["Enums"]["invite_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_invites_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
        ]
      }
      persona_memberships: {
        Row: {
          created_at: string
          persona_id: string
          role: Database["public"]["Enums"]["persona_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          persona_id: string
          role: Database["public"]["Enums"]["persona_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          persona_id?: string
          role?: Database["public"]["Enums"]["persona_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persona_memberships_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persona_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          consent_text: string | null
          consent_type: Database["public"]["Enums"]["consent_type"] | null
          created_at: string
          created_by: string
          creator_type: Database["public"]["Enums"]["creator_type"]
          description: string | null
          id: string
          metadata: Json
          name: string
          photo_url: string | null
          privacy: Database["public"]["Enums"]["persona_privacy"]
          updated_at: string
          video_avatar_url: string | null
          voice_model_url: string | null
        }
        Insert: {
          consent_text?: string | null
          consent_type?: Database["public"]["Enums"]["consent_type"] | null
          created_at?: string
          created_by: string
          creator_type: Database["public"]["Enums"]["creator_type"]
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          photo_url?: string | null
          privacy?: Database["public"]["Enums"]["persona_privacy"]
          updated_at?: string
          video_avatar_url?: string | null
          voice_model_url?: string | null
        }
        Update: {
          consent_text?: string | null
          consent_type?: Database["public"]["Enums"]["consent_type"] | null
          created_at?: string
          created_by?: string
          creator_type?: Database["public"]["Enums"]["creator_type"]
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          photo_url?: string | null
          privacy?: Database["public"]["Enums"]["persona_privacy"]
          updated_at?: string
          video_avatar_url?: string | null
          voice_model_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personas_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_persona_member: {
        Args: {
          p_persona_id: string
          p_roles?: Database["public"]["Enums"]["persona_role"][]
        }
        Returns: boolean
      }
    }
    Enums: {
      consent_type:
        | "IMPLIED"
        | "EXPLICIT_WRITTEN"
        | "EXPLICIT_VERBAL"
        | "LEGAL_GUARDIAN"
      creator_type: "SELF" | "OTHER"
      invite_status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"
      media_type: "PHOTO" | "VIDEO" | "AUDIO" | "DOCUMENT"
      message_role: "SYSTEM" | "USER" | "ASSISTANT"
      persona_privacy: "PRIVATE" | "LINK" | "PUBLIC"
      persona_role: "OWNER" | "CONTRIBUTOR" | "VIEWER"
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
      consent_type: [
        "IMPLIED",
        "EXPLICIT_WRITTEN",
        "EXPLICIT_VERBAL",
        "LEGAL_GUARDIAN",
      ],
      creator_type: ["SELF", "OTHER"],
      invite_status: ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"],
      media_type: ["PHOTO", "VIDEO", "AUDIO", "DOCUMENT"],
      message_role: ["SYSTEM", "USER", "ASSISTANT"],
      persona_privacy: ["PRIVATE", "LINK", "PUBLIC"],
      persona_role: ["OWNER", "CONTRIBUTOR", "VIEWER"],
    },
  },
} as const


