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
      active_timer_tickets: {
        Row: {
          position: number
          ticket_id: string
          user_id: string
        }
        Insert: {
          position?: number
          ticket_id: string
          user_id: string
        }
        Update: {
          position?: number
          ticket_id?: string
          user_id?: string
        }
        Relationships: []
      }
      active_timers: {
        Row: {
          discipline: Database["public"]["Enums"]["log_discipline"]
          started_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          discipline: Database["public"]["Enums"]["log_discipline"]
          started_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          discipline?: Database["public"]["Enums"]["log_discipline"]
          started_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_timers_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_timers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_epics: {
        Row: {
          created_at: string
          epic_name: string | null
          id: number
          project_id: string
        }
        Insert: {
          created_at?: string
          epic_name?: string | null
          id?: number
          project_id: string
        }
        Update: {
          created_at?: string
          epic_name?: string | null
          id?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_epics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          role: Database["public"]["Enums"]["project_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          role?: Database["public"]["Enums"]["project_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          acronym: string
          client_name: string | null
          created_at: string
          id: string
          links: Json
          name: string
          rate_per_hour: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          acronym: string
          client_name?: string | null
          created_at?: string
          id?: string
          links?: Json
          name: string
          rate_per_hour?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          acronym?: string
          client_name?: string | null
          created_at?: string
          id?: string
          links?: Json
          name?: string
          rate_per_hour?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      status_derivation_rules: {
        Row: {
          be_statuses: Database["public"]["Enums"]["discipline_status"][]
          created_at: string
          fe_statuses: Database["public"]["Enums"]["discipline_status"][]
          id: string
          operator: string
          position: number
          status_id: string
          updated_at: string
        }
        Insert: {
          be_statuses?: Database["public"]["Enums"]["discipline_status"][]
          created_at?: string
          fe_statuses?: Database["public"]["Enums"]["discipline_status"][]
          id?: string
          operator: string
          position: number
          status_id: string
          updated_at?: string
        }
        Update: {
          be_statuses?: Database["public"]["Enums"]["discipline_status"][]
          created_at?: string
          fe_statuses?: Database["public"]["Enums"]["discipline_status"][]
          id?: string
          operator?: string
          position?: number
          status_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_derivation_rules_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          category: Database["public"]["Enums"]["status_category"]
          color: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["status_category"]
          color?: string
          created_at?: string
          id?: string
          name: string
          position: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["status_category"]
          color?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_color: string
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          email: string
          id?: string
          name: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ticket_assignees: {
        Row: {
          created_at: string
          slot: Database["public"]["Enums"]["assignee_slot"]
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          slot: Database["public"]["Enums"]["assignee_slot"]
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          slot?: Database["public"]["Enums"]["assignee_slot"]
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_assignees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_estimate_changes: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          delta: number | null
          discipline: Database["public"]["Enums"]["assignee_slot"]
          id: string
          new_hours: number
          previous_hours: number
          reason: string | null
          status: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          delta?: number | null
          discipline: Database["public"]["Enums"]["assignee_slot"]
          id?: string
          new_hours: number
          previous_hours: number
          reason?: string | null
          status?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          delta?: number | null
          discipline?: Database["public"]["Enums"]["assignee_slot"]
          id?: string
          new_hours?: number
          previous_hours?: number
          reason?: string | null
          status?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_estimate_changes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_estimate_changes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actual_backend_hours: number
          actual_frontend_hours: number
          actual_project_hours: number
          be_status: Database["public"]["Enums"]["discipline_status"]
          created_at: string
          current_be_estimate: number
          current_fe_estimate: number
          current_project_estimate: number
          epic_id: number | null
          fe_status: Database["public"]["Enums"]["discipline_status"]
          formatted_id: string
          id: string
          original_be_estimate: number
          original_fe_estimate: number
          original_project_estimate: number
          position: number
          project_id: string
          project_status_override: boolean
          status_id: string | null
          ticket_number: number
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          actual_backend_hours?: number
          actual_frontend_hours?: number
          actual_project_hours?: number
          be_status?: Database["public"]["Enums"]["discipline_status"]
          created_at?: string
          current_be_estimate?: number
          current_fe_estimate?: number
          current_project_estimate?: number
          epic_id?: number | null
          fe_status?: Database["public"]["Enums"]["discipline_status"]
          formatted_id: string
          id?: string
          original_be_estimate?: number
          original_fe_estimate?: number
          original_project_estimate?: number
          position?: number
          project_id: string
          project_status_override?: boolean
          status_id?: string | null
          ticket_number: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          actual_backend_hours?: number
          actual_frontend_hours?: number
          actual_project_hours?: number
          be_status?: Database["public"]["Enums"]["discipline_status"]
          created_at?: string
          current_be_estimate?: number
          current_fe_estimate?: number
          current_project_estimate?: number
          epic_id?: number | null
          fe_status?: Database["public"]["Enums"]["discipline_status"]
          formatted_id?: string
          id?: string
          original_be_estimate?: number
          original_fe_estimate?: number
          original_project_estimate?: number
          position?: number
          project_id?: string
          project_status_override?: boolean
          status_id?: string | null
          ticket_number?: number
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_epic_id_fkey"
            columns: ["epic_id"]
            isOneToOne: false
            referencedRelation: "project_epics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          created_at: string
          discipline: Database["public"]["Enums"]["log_discipline"]
          hours: number
          id: string
          logged_at: string
          note: string | null
          source: Database["public"]["Enums"]["log_source"]
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline: Database["public"]["Enums"]["log_discipline"]
          hours: number
          id?: string
          logged_at?: string
          note?: string | null
          source?: Database["public"]["Enums"]["log_source"]
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline?: Database["public"]["Enums"]["log_discipline"]
          hours?: number
          id?: string
          logged_at?: string
          note?: string | null
          source?: Database["public"]["Enums"]["log_source"]
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      first_status_in_category: {
        Args: { _cat: Database["public"]["Enums"]["status_category"] }
        Returns: string
      }
      reapply_status_rules: { Args: never; Returns: undefined }
    }
    Enums: {
      assignee_slot: "FE" | "BE" | "Project"
      discipline_status: "todo" | "in_progress" | "for_integration" | "done"
      log_discipline: "FE" | "BE" | "Project"
      log_source: "timer" | "manual"
      project_role:
        | "Frontend"
        | "Backend"
        | "Fullstack"
        | "QA"
        | "PMBA"
        | "Design"
      status_category: "backlog" | "active" | "done"
      ticket_type: "Standard" | "Bug" | "CR" | "Proj"
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
      assignee_slot: ["FE", "BE", "Project"],
      discipline_status: ["todo", "in_progress", "for_integration", "done"],
      log_discipline: ["FE", "BE", "Project"],
      log_source: ["timer", "manual"],
      project_role: [
        "Frontend",
        "Backend",
        "Fullstack",
        "QA",
        "PMBA",
        "Design",
      ],
      status_category: ["backlog", "active", "done"],
      ticket_type: ["Standard", "Bug", "CR", "Proj"],
    },
  },
} as const
