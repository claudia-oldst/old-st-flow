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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      epic_discounts: {
        Row: {
          created_at: string
          created_by: string | null
          discipline: Database["public"]["Enums"]["assignee_slot"]
          epic_id: number
          hours: number
          id: string
          project_id: string
          reason: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discipline: Database["public"]["Enums"]["assignee_slot"]
          epic_id: number
          hours: number
          id?: string
          project_id: string
          reason: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discipline?: Database["public"]["Enums"]["assignee_slot"]
          epic_id?: number
          hours?: number
          id?: string
          project_id?: string
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_epic_summaries: {
        Row: {
          ai_draft: string | null
          created_at: string
          delta_hours: number
          epic_id: number
          id: string
          included: boolean
          pmba_text: string | null
          project_id: string
          updated_at: string
        }
        Insert: {
          ai_draft?: string | null
          created_at?: string
          delta_hours?: number
          epic_id: number
          id?: string
          included?: boolean
          pmba_text?: string | null
          project_id: string
          updated_at?: string
        }
        Update: {
          ai_draft?: string | null
          created_at?: string
          delta_hours?: number
          epic_id?: number
          id?: string
          included?: boolean
          pmba_text?: string | null
          project_id?: string
          updated_at?: string
        }
        Relationships: []
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
          archived_at: string | null
          cached_total_cost: number
          cached_total_hours: number
          client_name: string | null
          client_portal_hash: string | null
          client_portal_hash_sha: string | null
          client_summary_draft: string | null
          client_summary_published: string | null
          client_summary_updated_at: string | null
          client_visibility_cutoff: string | null
          created_at: string
          github_owner: string | null
          github_repo: string | null
          github_repo_url: string | null
          id: string
          is_archived: boolean
          links: Json
          name: string
          rate_per_hour: number
          start_date: string | null
          updated_at: string
          vault_checksum: string | null
          vault_row_counts: Json | null
          vault_storage_path: string | null
        }
        Insert: {
          acronym: string
          archived_at?: string | null
          cached_total_cost?: number
          cached_total_hours?: number
          client_name?: string | null
          client_portal_hash?: string | null
          client_portal_hash_sha?: string | null
          client_summary_draft?: string | null
          client_summary_published?: string | null
          client_summary_updated_at?: string | null
          client_visibility_cutoff?: string | null
          created_at?: string
          github_owner?: string | null
          github_repo?: string | null
          github_repo_url?: string | null
          id?: string
          is_archived?: boolean
          links?: Json
          name: string
          rate_per_hour?: number
          start_date?: string | null
          updated_at?: string
          vault_checksum?: string | null
          vault_row_counts?: Json | null
          vault_storage_path?: string | null
        }
        Update: {
          acronym?: string
          archived_at?: string | null
          cached_total_cost?: number
          cached_total_hours?: number
          client_name?: string | null
          client_portal_hash?: string | null
          client_portal_hash_sha?: string | null
          client_summary_draft?: string | null
          client_summary_published?: string | null
          client_summary_updated_at?: string | null
          client_visibility_cutoff?: string | null
          created_at?: string
          github_owner?: string | null
          github_repo?: string | null
          github_repo_url?: string | null
          id?: string
          is_archived?: boolean
          links?: Json
          name?: string
          rate_per_hour?: number
          start_date?: string | null
          updated_at?: string
          vault_checksum?: string | null
          vault_row_counts?: Json | null
          vault_storage_path?: string | null
        }
        Relationships: []
      }
      sprint_capacities: {
        Row: {
          created_at: string
          discipline: Database["public"]["Enums"]["assignee_slot"]
          hours: number
          id: string
          sprint_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discipline: Database["public"]["Enums"]["assignee_slot"]
          hours?: number
          id?: string
          sprint_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discipline?: Database["public"]["Enums"]["assignee_slot"]
          hours?: number
          id?: string
          sprint_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_capacities_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_capacities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_tickets: {
        Row: {
          assigned_user_id: string | null
          created_at: string
          discipline: string
          id: string
          sprint_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          created_at?: string
          discipline: string
          id?: string
          sprint_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          created_at?: string
          discipline?: string
          id?: string
          sprint_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tickets_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tickets_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tickets_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string | null
          project_id: string
          sprint_number: number
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name?: string | null
          project_id: string
          sprint_number: number
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string | null
          project_id?: string
          sprint_number?: number
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprints_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
          auth_user_id: string | null
          avatar_color: string
          created_at: string
          email: string
          github_username: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_color?: string
          created_at?: string
          email: string
          github_username?: string | null
          id?: string
          name: string
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_color?: string
          created_at?: string
          email?: string
          github_username?: string | null
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
      ticket_comments: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ticket_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_comments_user_id_fkey"
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
          acceptance_criteria: string | null
          actual_backend_hours: number
          actual_frontend_hours: number
          actual_project_hours: number
          be_status: Database["public"]["Enums"]["discipline_status"]
          bug_sub_number: number | null
          cr_approval: string | null
          cr_decided_at: string | null
          cr_decided_by: string | null
          created_at: string
          current_be_estimate: number | null
          current_fe_estimate: number | null
          current_project_estimate: number | null
          epic_id: number | null
          fe_status: Database["public"]["Enums"]["discipline_status"]
          formatted_id: string
          github_issue_node_id: string | null
          github_issue_number: number | null
          id: string
          original_be_estimate: number | null
          original_fe_estimate: number | null
          original_project_estimate: number | null
          parent_ticket_id: string | null
          planned_sprint_be_id: string | null
          planned_sprint_fe_id: string | null
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
          acceptance_criteria?: string | null
          actual_backend_hours?: number
          actual_frontend_hours?: number
          actual_project_hours?: number
          be_status?: Database["public"]["Enums"]["discipline_status"]
          bug_sub_number?: number | null
          cr_approval?: string | null
          cr_decided_at?: string | null
          cr_decided_by?: string | null
          created_at?: string
          current_be_estimate?: number | null
          current_fe_estimate?: number | null
          current_project_estimate?: number | null
          epic_id?: number | null
          fe_status?: Database["public"]["Enums"]["discipline_status"]
          formatted_id: string
          github_issue_node_id?: string | null
          github_issue_number?: number | null
          id?: string
          original_be_estimate?: number | null
          original_fe_estimate?: number | null
          original_project_estimate?: number | null
          parent_ticket_id?: string | null
          planned_sprint_be_id?: string | null
          planned_sprint_fe_id?: string | null
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
          acceptance_criteria?: string | null
          actual_backend_hours?: number
          actual_frontend_hours?: number
          actual_project_hours?: number
          be_status?: Database["public"]["Enums"]["discipline_status"]
          bug_sub_number?: number | null
          cr_approval?: string | null
          cr_decided_at?: string | null
          cr_decided_by?: string | null
          created_at?: string
          current_be_estimate?: number | null
          current_fe_estimate?: number | null
          current_project_estimate?: number | null
          epic_id?: number | null
          fe_status?: Database["public"]["Enums"]["discipline_status"]
          formatted_id?: string
          github_issue_node_id?: string | null
          github_issue_number?: number | null
          id?: string
          original_be_estimate?: number | null
          original_fe_estimate?: number | null
          original_project_estimate?: number | null
          parent_ticket_id?: string | null
          planned_sprint_be_id?: string | null
          planned_sprint_fe_id?: string | null
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
            foreignKeyName: "tickets_parent_ticket_id_fkey"
            columns: ["parent_ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_planned_sprint_be_id_fkey"
            columns: ["planned_sprint_be_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_planned_sprint_fe_id_fkey"
            columns: ["planned_sprint_fe_id"]
            isOneToOne: false
            referencedRelation: "sprints"
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      client_approve_cr: {
        Args: { _hash: string; _ticket_id: string }
        Returns: boolean
      }
      current_can_access_ticket: {
        Args: { _ticket_id: string }
        Returns: boolean
      }
      current_is_pmba: { Args: never; Returns: boolean }
      current_is_project_member: { Args: { _pid: string }; Returns: boolean }
      current_team_member_id: { Args: never; Returns: string }
      enqueue_github_sync: { Args: { _ticket_id: string }; Returns: undefined }
      first_status_in_category: {
        Args: { _cat: Database["public"]["Enums"]["status_category"] }
        Returns: string
      }
      get_client_portal: { Args: { _hash: string }; Returns: Json }
      get_client_portal_change_requests: {
        Args: { _hash: string }
        Returns: Json
      }
      get_project_archive_payload: {
        Args: { _project_id: string }
        Returns: Json
      }
      get_project_portal_preview: {
        Args: { _cutoff: string; _project_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_pmba: { Args: { _user_id: string }; Returns: boolean }
      list_project_tickets: {
        Args: {
          _filters?: Json
          _page?: number
          _page_size?: number
          _project_id: string
          _search?: string
          _sort_col?: string
          _sort_dir?: string
        }
        Returns: Json
      }
      purge_project_children: { Args: { _project_id: string }; Returns: Json }
      reapply_status_rules: { Args: never; Returns: undefined }
      rehydrate_project: {
        Args: { _member_map?: Json; _payload: Json; _project_id: string }
        Returns: Json
      }
      rotate_client_portal_hash: {
        Args: { _project_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "PMBA" | "member"
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
      status_category: "backlog" | "active" | "dev done" | "done"
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
      app_role: ["PMBA", "member"],
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
      status_category: ["backlog", "active", "dev done", "done"],
      ticket_type: ["Standard", "Bug", "CR", "Proj"],
    },
  },
} as const
