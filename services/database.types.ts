// ============================================================================
// SUPABASE DATABASE TYPES
// Auto-generated types for type-safe database queries
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          website: string | null
          industry: string | null
          plan: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          website?: string | null
          industry?: string | null
          plan?: string
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          timezone: string
          created_at: string
          updated_at: string
          is_super_admin: boolean
        }
        Insert: {
          id: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
          is_super_admin?: boolean
        }
        Update: {
          id?: string
          organization_id?: string | null
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          timezone?: string
          created_at?: string
          updated_at?: string
          is_super_admin?: boolean
        }
      }
      permissions: {
        Row: {
          id: string
          key: string
          name: string
          description: string | null
          category: string | null
        }
        Insert: {
          id?: string
          key: string
          name: string
          description?: string | null
          category?: string | null
        }
        Update: {
          id?: string
          key?: string
          name?: string
          description?: string | null
          category?: string | null
        }
      }
      roles: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          color: string
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          color?: string
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          color?: string
          is_system?: boolean
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
        }
        Insert: {
          role_id: string
          permission_id: string
        }
        Update: {
          role_id?: string
          permission_id?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role_id: string | null
          status: string
          invited_by: string | null
          invited_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role_id?: string | null
          status?: string
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role_id?: string | null
          status?: string
          invited_by?: string | null
          invited_at?: string | null
          joined_at?: string
        }
      }
      event_types: {
        Row: {
          id: string
          name: string
          icon: string | null
          description: string | null
          category: string | null
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          description?: string | null
          category?: string | null
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          description?: string | null
          category?: string | null
        }
      }
      programs: {
        Row: {
          id: string
          organization_id: string | null
          title: string
          slug: string | null
          description: string | null
          cover_image_url: string | null
          industry_category: string | null
          event_type_id: string | null
          status: string
          visibility: string
          deadline: string | null
          timezone: string
          entries_count: number
          created_at: string
          updated_at: string
          created_by: string | null
          active_form_id: string | null
          allow_multiple_submissions: boolean
          max_submissions: number
          submission_mode: string
          min_team_size: number
          max_team_size: number
        }
        Insert: {
          id?: string
          organization_id?: string | null
          title: string
          slug?: string | null
          description?: string | null
          cover_image_url?: string | null
          industry_category?: string | null
          event_type_id?: string | null
          status?: string
          visibility?: string
          deadline?: string | null
          timezone?: string
          entries_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          active_form_id?: string | null
          allow_multiple_submissions?: boolean
          max_submissions?: number
          submission_mode?: string
          min_team_size?: number
          max_team_size?: number
        }
        Update: {
          id?: string
          organization_id?: string | null
          title?: string
          slug?: string | null
          description?: string | null
          cover_image_url?: string | null
          industry_category?: string | null
          event_type_id?: string | null
          status?: string
          visibility?: string
          deadline?: string | null
          timezone?: string
          entries_count?: number
          created_at?: string
          updated_at?: string
          created_by?: string | null
          active_form_id?: string | null
          allow_multiple_submissions?: boolean
          max_submissions?: number
          submission_mode?: string
          min_team_size?: number
          max_team_size?: number
        }
      }
      program_payment_configs: {
        Row: {
          id: string
          program_id: string
          enabled: boolean
          provider: string
          currency: string
          fee_amount: number
          fee_type: string
          public_key: string | null
          secret_key_encrypted: string | null
          webhook_secret_encrypted: string | null
          connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          enabled?: boolean
          provider?: string
          currency?: string
          fee_amount?: number
          fee_type?: string
          public_key?: string | null
          secret_key_encrypted?: string | null
          webhook_secret_encrypted?: string | null
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          enabled?: boolean
          provider?: string
          currency?: string
          fee_amount?: number
          fee_type?: string
          public_key?: string | null
          secret_key_encrypted?: string | null
          webhook_secret_encrypted?: string | null
          connected?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          program_id: string
          parent_id: string | null
          title: string
          description: string | null
          icon: string | null
          color: string | null
          sort_order: number
          entries_count: number
          max_entries: number | null
          created_at: string
        }
        Insert: {
          id?: string
          program_id: string
          parent_id?: string | null
          title: string
          description?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          entries_count?: number
          max_entries?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          parent_id?: string | null
          title?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          sort_order?: number
          entries_count?: number
          max_entries?: number | null
          created_at?: string
        }
      }
      rounds: {
        Row: {
          id: string
          program_id: string
          title: string
          description: string | null
          type: string
          start_date: string
          end_date: string
          status: string
          sort_order: number
          settings: Json
          advancement_criteria: Json
          advancement_trigger: string
          is_finalized: boolean
          created_at: string
        }
        Insert: {
          id?: string
          program_id: string
          title: string
          description?: string | null
          type: string
          start_date: string
          end_date: string
          status?: string
          sort_order?: number
          settings?: Json
          advancement_criteria?: Json
          advancement_trigger?: string
          is_finalized?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          title?: string
          description?: string | null
          type?: string
          start_date?: string
          end_date?: string
          status?: string
          sort_order?: number
          settings?: Json
          advancement_criteria?: Json
          advancement_trigger?: string
          is_finalized?: boolean
          created_at?: string
        }
      }
      round_submissions: {
        Row: {
          id: string
          round_id: string
          submission_id: string
          status: string
          enrolled_at: string
          advanced_at: string | null
          eliminated_at: string | null
          elimination_reason: string | null
          source_round_id: string | null
          carried_score: number | null
          metadata: Json
        }
        Insert: {
          id?: string
          round_id: string
          submission_id: string
          status?: string
          enrolled_at?: string
          advanced_at?: string | null
          eliminated_at?: string | null
          elimination_reason?: string | null
          source_round_id?: string | null
          carried_score?: number | null
          metadata?: Json
        }
        Update: {
          id?: string
          round_id?: string
          submission_id?: string
          status?: string
          enrolled_at?: string
          advanced_at?: string | null
          eliminated_at?: string | null
          elimination_reason?: string | null
          source_round_id?: string | null
          carried_score?: number | null
          metadata?: Json
        }
      }
      voting_configs: {
        Row: {
          id: string
          round_id: string
          votes_per_user: number
          votes_per_submission: number
          require_auth: boolean
          allow_anonymous: boolean
          show_results_publicly: boolean
          show_leaderboard: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          round_id: string
          votes_per_user?: number
          votes_per_submission?: number
          require_auth?: boolean
          allow_anonymous?: boolean
          show_results_publicly?: boolean
          show_leaderboard?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          round_id?: string
          votes_per_user?: number
          votes_per_submission?: number
          require_auth?: boolean
          allow_anonymous?: boolean
          show_results_publicly?: boolean
          show_leaderboard?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      advancement_events: {
        Row: {
          id: string
          round_id: string
          target_round_id: string | null
          trigger_type: string
          criteria_used: Json
          total_participants: number
          advanced_count: number
          eliminated_count: number
          had_ties: boolean
          tie_resolution: Json | null
          executed_by: string | null
          executed_at: string
          status: string
          metadata: Json
        }
        Insert: {
          id?: string
          round_id: string
          target_round_id?: string | null
          trigger_type: string
          criteria_used: Json
          total_participants: number
          advanced_count: number
          eliminated_count: number
          had_ties?: boolean
          tie_resolution?: Json | null
          executed_by?: string | null
          executed_at?: string
          status?: string
          metadata?: Json
        }
        Update: {
          id?: string
          round_id?: string
          target_round_id?: string | null
          trigger_type?: string
          criteria_used?: Json
          total_participants?: number
          advanced_count?: number
          eliminated_count?: number
          had_ties?: boolean
          tie_resolution?: Json | null
          executed_by?: string | null
          executed_at?: string
          status?: string
          metadata?: Json
        }
      }
      advancement_details: {
        Row: {
          id: string
          advancement_event_id: string
          submission_id: string
          outcome: string
          rank: number | null
          score: number | null
          vote_count: number | null
          was_at_cutoff_boundary: boolean
          override_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          advancement_event_id: string
          submission_id: string
          outcome: string
          rank?: number | null
          score?: number | null
          vote_count?: number | null
          was_at_cutoff_boundary?: boolean
          override_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          advancement_event_id?: string
          submission_id?: string
          outcome?: string
          rank?: number | null
          score?: number | null
          vote_count?: number | null
          was_at_cutoff_boundary?: boolean
          override_reason?: string | null
          created_at?: string
        }
      }
      submission_teams: {
        Row: {
          id: string
          program_id: string
          name: string
          team_lead_id: string
          submission_id: string | null
          invite_code: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          program_id: string
          name: string
          team_lead_id: string
          submission_id?: string | null
          invite_code?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          name?: string
          team_lead_id?: string
          submission_id?: string | null
          invite_code?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      submission_team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
      }
      team_chat_messages: {
        Row: {
          id: string
          team_id: string
          sender_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          sender_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          sender_id?: string
          message?: string
          created_at?: string
        }
      }
      submissions: {
        Row: {
          id: string
          program_id: string
          category_id: string | null
          applicant_id: string | null
          title: string
          description: string | null
          cover_image_url: string | null
          status: string
          average_score: number | null
          total_scores: number
          payment_status: string
          payment_amount: number | null
          payment_id: string | null
          submission_data: Json
          submitted_at: string
          updated_at: string
          applicant_name: string | null
          applicant_email: string | null
        }
        Insert: {
          id?: string
          program_id: string
          category_id?: string | null
          applicant_id?: string | null
          title: string
          description?: string | null
          cover_image_url?: string | null
          status?: string
          average_score?: number | null
          total_scores?: number
          payment_status?: string
          payment_amount?: number | null
          payment_id?: string | null
          submission_data?: Json
          submitted_at?: string
          updated_at?: string
          applicant_name?: string | null
          applicant_email?: string | null
        }
        Update: {
          id?: string
          program_id?: string
          category_id?: string | null
          applicant_id?: string | null
          title?: string
          description?: string | null
          cover_image_url?: string | null
          status?: string
          average_score?: number | null
          total_scores?: number
          payment_status?: string
          payment_amount?: number | null
          payment_id?: string | null
          submission_data?: Json
          submitted_at?: string
          updated_at?: string
          applicant_name?: string | null
          applicant_email?: string | null
        }
      }
      submission_files: {
        Row: {
          id: string
          submission_id: string
          file_name: string
          file_url: string
          file_type: string | null
          file_size: number | null
          sort_order: number
          uploaded_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          file_name: string
          file_url: string
          file_type?: string | null
          file_size?: number | null
          sort_order?: number
          uploaded_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          file_name?: string
          file_url?: string
          file_type?: string | null
          file_size?: number | null
          sort_order?: number
          uploaded_at?: string
        }
      }
      judges: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          name: string
          email: string
          avatar_url: string | null
          bio: string | null
          status: string
          invited_at: string
          accepted_at: string | null
          assigned_count: number
          completed_count: number
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          name: string
          email: string
          avatar_url?: string | null
          bio?: string | null
          status?: string
          invited_at?: string
          accepted_at?: string | null
          assigned_count?: number
          completed_count?: number
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          name?: string
          email?: string
          avatar_url?: string | null
          bio?: string | null
          status?: string
          invited_at?: string
          accepted_at?: string | null
          assigned_count?: number
          completed_count?: number
        }
      }
      judging_criteria: {
        Row: {
          id: string
          program_id: string
          name: string
          description: string | null
          weight: number
          min_score: number
          max_score: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          program_id: string
          name: string
          description?: string | null
          weight?: number
          min_score?: number
          max_score?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          program_id?: string
          name?: string
          description?: string | null
          weight?: number
          min_score?: number
          max_score?: number
          sort_order?: number
          created_at?: string
        }
      }
      submission_judges: {
        Row: {
          id: string
          submission_id: string
          judge_id: string
          assigned_at: string
          assigned_by: string | null
          status: string
          completed_at: string | null
          round_id: string | null
        }
        Insert: {
          id?: string
          submission_id: string
          judge_id: string
          assigned_at?: string
          assigned_by?: string | null
          status?: string
          completed_at?: string | null
          round_id?: string | null
        }
        Update: {
          id?: string
          submission_id?: string
          judge_id?: string
          assigned_at?: string
          assigned_by?: string | null
          status?: string
          completed_at?: string | null
          round_id?: string | null
        }
      }
      scores: {
        Row: {
          id: string
          submission_judge_id: string
          criterion_id: string
          score: number
          comment: string | null
          scored_at: string
        }
        Insert: {
          id?: string
          submission_judge_id: string
          criterion_id: string
          score: number
          comment?: string | null
          scored_at?: string
        }
        Update: {
          id?: string
          submission_judge_id?: string
          criterion_id?: string
          score?: number
          comment?: string | null
          scored_at?: string
        }
      }
      judge_comments: {
        Row: {
          id: string
          submission_judge_id: string
          overall_comment: string | null
          private_notes: string | null
          recommendation: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          submission_judge_id: string
          overall_comment?: string | null
          private_notes?: string | null
          recommendation?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          submission_judge_id?: string
          overall_comment?: string | null
          private_notes?: string | null
          recommendation?: string | null
          submitted_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          name: string
          email: string
          phone: string | null
          avatar_url: string | null
          source: string | null
          survey_answer: string | null
          tags: string[] | null
          status: string
          last_active_at: string | null
          joined_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          source?: string | null
          survey_answer?: string | null
          tags?: string[] | null
          status?: string
          last_active_at?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          source?: string | null
          survey_answer?: string | null
          tags?: string[] | null
          status?: string
          last_active_at?: string | null
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      message_threads: {
        Row: {
          id: string
          organization_id: string | null
          subject: string | null
          thread_type: string
          related_submission_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          subject?: string | null
          thread_type?: string
          related_submission_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          subject?: string | null
          thread_type?: string
          related_submission_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string | null
          content: string
          is_system_message: boolean
          attachments: Json
          sent_at: string
          sender_name: string | null
          sender_avatar: string | null
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id?: string | null
          content: string
          is_system_message?: boolean
          attachments?: Json
          sent_at?: string
          sender_name?: string | null
          sender_avatar?: string | null
        }
        Update: {
          id?: string
          thread_id?: string
          sender_id?: string | null
          content?: string
          is_system_message?: boolean
          attachments?: Json
          sent_at?: string
          sender_name?: string | null
          sender_avatar?: string | null
        }
      }
      social_accounts: {
        Row: {
          id: string
          organization_id: string
          platform: string
          platform_user_id: string | null
          handle: string | null
          avatar_url: string | null
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          status: string
          connected_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          platform: string
          platform_user_id?: string | null
          handle?: string | null
          avatar_url?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          status?: string
          connected_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          platform?: string
          platform_user_id?: string | null
          handle?: string | null
          avatar_url?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          status?: string
          connected_at?: string
        }
      }
      scheduled_posts: {
        Row: {
          id: string
          organization_id: string
          program_id: string | null
          content: string
          image_url: string | null
          link_url: string | null
          platforms: string[]
          scheduled_for: string
          trigger_type: string
          status: string
          posted_at: string | null
          error_message: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          program_id?: string | null
          content: string
          image_url?: string | null
          link_url?: string | null
          platforms: string[]
          scheduled_for: string
          trigger_type?: string
          status?: string
          posted_at?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          program_id?: string | null
          content?: string
          image_url?: string | null
          link_url?: string | null
          platforms?: string[]
          scheduled_for?: string
          trigger_type?: string
          status?: string
          posted_at?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          action: string
          action_type: string
          resource_type: string | null
          resource_id: string | null
          details: string | null
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          user_name: string | null
          user_avatar: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          action: string
          action_type: string
          resource_type?: string | null
          resource_id?: string | null
          details?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          user_name?: string | null
          user_avatar?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          action?: string
          action_type?: string
          resource_type?: string | null
          resource_id?: string | null
          details?: string | null
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          user_name?: string | null
          user_avatar?: string | null
          created_at?: string
        }
      }
      testimonials: {
        Row: {
          id: string
          name: string
          role: string | null
          company: string | null
          content: string
          avatar_url: string | null
          rating: number
          is_featured: boolean
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          company?: string | null
          content: string
          avatar_url?: string | null
          rating?: number
          is_featured?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          company?: string | null
          content?: string
          avatar_url?: string | null
          rating?: number
          is_featured?: boolean
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      pricing_tiers: {
        Row: {
          id: string
          name: string
          slug: string
          price_monthly: number | null
          price_yearly: number | null
          price_display: string | null
          description: string | null
          features: Json
          limits: Json
          is_recommended: boolean
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          price_monthly?: number | null
          price_yearly?: number | null
          price_display?: string | null
          description?: string | null
          features?: Json
          limits?: Json
          is_recommended?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          price_monthly?: number | null
          price_yearly?: number | null
          price_display?: string | null
          description?: string | null
          features?: Json
          limits?: Json
          is_recommended?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      features: {
        Row: {
          id: string
          title: string
          description: string | null
          icon: string | null
          color: string | null
          items: Json
          category: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          icon?: string | null
          color?: string | null
          items?: Json
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          items?: Json
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      use_cases: {
        Row: {
          id: string
          title: string
          category: string | null
          description: string | null
          icon: string | null
          gradient: string | null
          image_url: string | null
          stats: Json
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          category?: string | null
          description?: string | null
          icon?: string | null
          gradient?: string | null
          image_url?: string | null
          stats?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          category?: string | null
          description?: string | null
          icon?: string | null
          gradient?: string | null
          image_url?: string | null
          stats?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      how_it_works_steps: {
        Row: {
          id: string
          step_number: number
          title: string
          description: string | null
          icon: string | null
          items: Json
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          step_number: number
          title: string
          description?: string | null
          icon?: string | null
          items?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          step_number?: number
          title?: string
          description?: string | null
          icon?: string | null
          items?: Json
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      case_studies: {
        Row: {
          id: string
          title: string
          slug: string
          industry: string | null
          company_name: string | null
          company_logo_url: string | null
          cover_image_url: string | null
          color: string | null
          challenge: string | null
          solution: string | null
          results: string | null
          quote: string | null
          quote_author: string | null
          quote_author_role: string | null
          stats: Json
          is_featured: boolean
          is_active: boolean
          published_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          industry?: string | null
          company_name?: string | null
          company_logo_url?: string | null
          cover_image_url?: string | null
          color?: string | null
          challenge?: string | null
          solution?: string | null
          results?: string | null
          quote?: string | null
          quote_author?: string | null
          quote_author_role?: string | null
          stats?: Json
          is_featured?: boolean
          is_active?: boolean
          published_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          industry?: string | null
          company_name?: string | null
          company_logo_url?: string | null
          cover_image_url?: string | null
          color?: string | null
          challenge?: string | null
          solution?: string | null
          results?: string | null
          quote?: string | null
          quote_author?: string | null
          quote_author_role?: string | null
          stats?: Json
          is_featured?: boolean
          is_active?: boolean
          published_at?: string | null
          created_at?: string
        }
      }
      faqs: {
        Row: {
          id: string
          question: string
          answer: string
          category: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          question: string
          answer: string
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          question?: string
          answer?: string
          category?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
      }
      program_templates: {
        Row: {
          id: string
          title: string
          description: string | null
          icon: string | null
          cover_image_url: string | null
          industry_category: string | null
          event_type_id: string | null
          default_categories: Json
          default_rounds: Json
          default_criteria: Json
          default_form_fields: Json
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          icon?: string | null
          cover_image_url?: string | null
          industry_category?: string | null
          event_type_id?: string | null
          default_categories?: Json
          default_rounds?: Json
          default_criteria?: Json
          default_form_fields?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          icon?: string | null
          cover_image_url?: string | null
          industry_category?: string | null
          event_type_id?: string | null
          default_categories?: Json
          default_rounds?: Json
          default_criteria?: Json
          default_form_fields?: Json
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      campaign_templates: {
        Row: {
          id: string
          organization_id: string | null
          title: string
          description: string | null
          content: string
          icon: string | null
          color: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          title: string
          description?: string | null
          content: string
          icon?: string | null
          color?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          title?: string
          description?: string | null
          content?: string
          icon?: string | null
          color?: string | null
          is_system?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      submission_details: {
        Row: {
          id: string | null
          program_id: string | null
          category_id: string | null
          applicant_id: string | null
          title: string | null
          description: string | null
          cover_image_url: string | null
          status: string | null
          average_score: number | null
          total_scores: number | null
          payment_status: string | null
          payment_amount: number | null
          submitted_at: string | null
          updated_at: string | null
          applicant_name: string | null
          applicant_email: string | null
          program_title: string | null
          program_status: string | null
          category_title: string | null
          applicant_full_name: string | null
          applicant_avatar: string | null
          assigned_judges_count: number | null
          completed_judges_count: number | null
        }
      }
      judge_workload: {
        Row: {
          id: string | null
          organization_id: string | null
          user_id: string | null
          name: string | null
          email: string | null
          avatar_url: string | null
          bio: string | null
          status: string | null
          invited_at: string | null
          accepted_at: string | null
          total_assigned: number | null
          total_completed: number | null
          total_pending: number | null
          progress_percentage: number | null
        }
      }
      program_stats: {
        Row: {
          id: string | null
          title: string | null
          status: string | null
          entries_count: number | null
          pending_count: number | null
          under_review_count: number | null
          shortlisted_count: number | null
          accepted_count: number | null
          rejected_count: number | null
          judges_count: number | null
          total_revenue: number | null
        }
      }
    }
    Functions: {
      setup_new_organization: {
        Args: {
          p_org_name: string
          p_org_slug: string
          p_owner_user_id: string
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_organization_id: string
          p_action: string
          p_action_type: string
          p_resource_type?: string
          p_resource_id?: string
          p_details?: string
          p_metadata?: Json
        }
        Returns: string
      }
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

// Convenience type aliases
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Program = Tables<'programs'>
export type Category = Tables<'categories'>
export type Round = Tables<'rounds'>
export type Submission = Tables<'submissions'>
export type Judge = Tables<'judges'>
export type JudgingCriterion = Tables<'judging_criteria'>
export type Contact = Tables<'contacts'>
export type Message = Tables<'messages'>
export type Role = Tables<'roles'>
export type AuditLog = Tables<'audit_logs'>
export type Testimonial = Tables<'testimonials'>
export type PricingTier = Tables<'pricing_tiers'>
export type Feature = Tables<'features'>
export type UseCase = Tables<'use_cases'>
export type FAQ = Tables<'faqs'>
export type CaseStudy = Tables<'case_studies'>
export type ProgramTemplate = Tables<'program_templates'>

export type RoundSubmission = Tables<'round_submissions'>
export type VotingConfig = Tables<'voting_configs'>
export type AdvancementEvent = Tables<'advancement_events'>
export type AdvancementDetail = Tables<'advancement_details'>
export type SubmissionTeam = Tables<'submission_teams'>
export type SubmissionTeamMember = Tables<'submission_team_members'>
export type TeamChatMessage = Tables<'team_chat_messages'>

// View types
export type SubmissionDetail = Views<'submission_details'>
export type JudgeWorkload = Views<'judge_workload'>
export type ProgramStats = Views<'program_stats'>
