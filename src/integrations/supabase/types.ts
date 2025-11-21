export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent: {
        Row: {
          created: string
          id: string
          last_activity_time: string
          name: string
          updated: string
          work_queue_id: string
        }
        Insert: {
          created?: string
          id?: string
          last_activity_time?: string
          name: string
          updated?: string
          work_queue_id: string
        }
        Update: {
          created?: string
          id?: string
          last_activity_time?: string
          name?: string
          updated?: string
          work_queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_agent__work_queue_id__work_queue"
            columns: ["work_queue_id"]
            isOneToOne: false
            referencedRelation: "work_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      artifact: {
        Row: {
          created: string
          data: Json | null
          description: string | null
          flow_run_id: string | null
          id: string
          key: string | null
          metadata_: Json | null
          task_run_id: string | null
          type: string | null
          updated: string
        }
        Insert: {
          created?: string
          data?: Json | null
          description?: string | null
          flow_run_id?: string | null
          id?: string
          key?: string | null
          metadata_?: Json | null
          task_run_id?: string | null
          type?: string | null
          updated?: string
        }
        Update: {
          created?: string
          data?: Json | null
          description?: string | null
          flow_run_id?: string | null
          id?: string
          key?: string | null
          metadata_?: Json | null
          task_run_id?: string | null
          type?: string | null
          updated?: string
        }
        Relationships: []
      }
      artifact_collection: {
        Row: {
          created: string
          data: Json | null
          description: string | null
          flow_run_id: string | null
          id: string
          key: string
          latest_id: string
          metadata_: Json | null
          task_run_id: string | null
          type: string | null
          updated: string
        }
        Insert: {
          created?: string
          data?: Json | null
          description?: string | null
          flow_run_id?: string | null
          id?: string
          key: string
          latest_id: string
          metadata_?: Json | null
          task_run_id?: string | null
          type?: string | null
          updated?: string
        }
        Update: {
          created?: string
          data?: Json | null
          description?: string | null
          flow_run_id?: string | null
          id?: string
          key?: string
          latest_id?: string
          metadata_?: Json | null
          task_run_id?: string | null
          type?: string | null
          updated?: string
        }
        Relationships: []
      }
      automation: {
        Row: {
          actions: Json
          actions_on_resolve: Json
          actions_on_trigger: Json
          created: string
          description: string
          enabled: boolean
          id: string
          name: string
          trigger: Json
          updated: string
        }
        Insert: {
          actions: Json
          actions_on_resolve?: Json
          actions_on_trigger?: Json
          created?: string
          description: string
          enabled?: boolean
          id?: string
          name: string
          trigger: Json
          updated?: string
        }
        Update: {
          actions?: Json
          actions_on_resolve?: Json
          actions_on_trigger?: Json
          created?: string
          description?: string
          enabled?: boolean
          id?: string
          name?: string
          trigger?: Json
          updated?: string
        }
        Relationships: []
      }
      automation_bucket: {
        Row: {
          automation_id: string
          bucketing_key: Json
          count: number
          created: string
          end: string
          id: string
          last_event: Json | null
          last_operation: string | null
          start: string
          trigger_id: string
          triggered_at: string | null
          updated: string
        }
        Insert: {
          automation_id: string
          bucketing_key: Json
          count: number
          created?: string
          end: string
          id?: string
          last_event?: Json | null
          last_operation?: string | null
          start: string
          trigger_id: string
          triggered_at?: string | null
          updated?: string
        }
        Update: {
          automation_id?: string
          bucketing_key?: Json
          count?: number
          created?: string
          end?: string
          id?: string
          last_event?: Json | null
          last_operation?: string | null
          start?: string
          trigger_id?: string
          triggered_at?: string | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_automation_bucket__automation_id__automation"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_event_follower: {
        Row: {
          created: string
          follower: Json
          follower_event_id: string
          id: string
          leader_event_id: string
          received: string
          scope: string
          updated: string
        }
        Insert: {
          created?: string
          follower: Json
          follower_event_id: string
          id?: string
          leader_event_id: string
          received: string
          scope: string
          updated?: string
        }
        Update: {
          created?: string
          follower?: Json
          follower_event_id?: string
          id?: string
          leader_event_id?: string
          received?: string
          scope?: string
          updated?: string
        }
        Relationships: []
      }
      automation_related_resource: {
        Row: {
          automation_id: string
          automation_owned_by_resource: boolean
          created: string
          id: string
          resource_id: string | null
          updated: string
        }
        Insert: {
          automation_id: string
          automation_owned_by_resource?: boolean
          created?: string
          id?: string
          resource_id?: string | null
          updated?: string
        }
        Update: {
          automation_id?: string
          automation_owned_by_resource?: boolean
          created?: string
          id?: string
          resource_id?: string | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_automation_related_resource__automation_id__automation"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation"
            referencedColumns: ["id"]
          },
        ]
      }
      block_document: {
        Row: {
          block_schema_id: string
          block_type_id: string
          block_type_name: string | null
          created: string
          data: Json
          id: string
          is_anonymous: boolean
          name: string
          updated: string
        }
        Insert: {
          block_schema_id: string
          block_type_id: string
          block_type_name?: string | null
          created?: string
          data?: Json
          id?: string
          is_anonymous?: boolean
          name: string
          updated?: string
        }
        Update: {
          block_schema_id?: string
          block_type_id?: string
          block_type_name?: string | null
          created?: string
          data?: Json
          id?: string
          is_anonymous?: boolean
          name?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_block__block_schema_id__block_schema"
            columns: ["block_schema_id"]
            isOneToOne: false
            referencedRelation: "block_schema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_block_document__block_type_id__block_type"
            columns: ["block_type_id"]
            isOneToOne: false
            referencedRelation: "block_type"
            referencedColumns: ["id"]
          },
        ]
      }
      block_document_reference: {
        Row: {
          created: string
          id: string
          name: string
          parent_block_document_id: string
          reference_block_document_id: string
          updated: string
        }
        Insert: {
          created?: string
          id?: string
          name: string
          parent_block_document_id: string
          reference_block_document_id: string
          updated?: string
        }
        Update: {
          created?: string
          id?: string
          name?: string
          parent_block_document_id?: string
          reference_block_document_id?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_block_document_reference__parent_block_document_id___328f"
            columns: ["parent_block_document_id"]
            isOneToOne: false
            referencedRelation: "block_document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_block_document_reference__reference_block_document_i_5759"
            columns: ["reference_block_document_id"]
            isOneToOne: false
            referencedRelation: "block_document"
            referencedColumns: ["id"]
          },
        ]
      }
      block_schema: {
        Row: {
          block_type_id: string
          capabilities: Json
          checksum: string
          created: string
          fields: Json
          id: string
          updated: string
          version: string
        }
        Insert: {
          block_type_id: string
          capabilities?: Json
          checksum: string
          created?: string
          fields?: Json
          id?: string
          updated?: string
          version?: string
        }
        Update: {
          block_type_id?: string
          capabilities?: Json
          checksum?: string
          created?: string
          fields?: Json
          id?: string
          updated?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_block_schema__block_type_id__block_type"
            columns: ["block_type_id"]
            isOneToOne: false
            referencedRelation: "block_type"
            referencedColumns: ["id"]
          },
        ]
      }
      block_schema_reference: {
        Row: {
          created: string
          id: string
          name: string
          parent_block_schema_id: string
          reference_block_schema_id: string
          updated: string
        }
        Insert: {
          created?: string
          id?: string
          name: string
          parent_block_schema_id: string
          reference_block_schema_id: string
          updated?: string
        }
        Update: {
          created?: string
          id?: string
          name?: string
          parent_block_schema_id?: string
          reference_block_schema_id?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_block_schema_reference__parent_block_schema_id__block_schema"
            columns: ["parent_block_schema_id"]
            isOneToOne: false
            referencedRelation: "block_schema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_block_schema_reference__reference_block_schema_id__b_6e5d"
            columns: ["reference_block_schema_id"]
            isOneToOne: false
            referencedRelation: "block_schema"
            referencedColumns: ["id"]
          },
        ]
      }
      block_type: {
        Row: {
          code_example: string | null
          created: string
          description: string | null
          documentation_url: string | null
          id: string
          is_protected: boolean
          logo_url: string | null
          name: string
          slug: string
          updated: string
        }
        Insert: {
          code_example?: string | null
          created?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_protected?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated?: string
        }
        Update: {
          code_example?: string | null
          created?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_protected?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated?: string
        }
        Relationships: []
      }
      budget_insights: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          insight_text: string | null
          per_capita: number | null
          percentage: number | null
          priority_level: string | null
          source_page: string | null
          subcategory: string | null
          trend: string | null
          trend_percentage: number | null
          year: number
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          insight_text?: string | null
          per_capita?: number | null
          percentage?: number | null
          priority_level?: string | null
          source_page?: string | null
          subcategory?: string | null
          trend?: string | null
          trend_percentage?: number | null
          year: number
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          insight_text?: string | null
          per_capita?: number | null
          percentage?: number | null
          priority_level?: string | null
          source_page?: string | null
          subcategory?: string | null
          trend?: string | null
          trend_percentage?: number | null
          year?: number
        }
        Relationships: []
      }
      budget_qa: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          question: string
          user_id: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question: string
          user_id?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
          user_id?: string | null
        }
        Relationships: []
      }
      composite_trigger_child_firing: {
        Row: {
          automation_id: string
          child_fired_at: string | null
          child_firing: Json
          child_firing_id: string
          child_trigger_id: string
          created: string
          id: string
          parent_trigger_id: string
          updated: string
        }
        Insert: {
          automation_id: string
          child_fired_at?: string | null
          child_firing: Json
          child_firing_id: string
          child_trigger_id: string
          created?: string
          id?: string
          parent_trigger_id: string
          updated?: string
        }
        Update: {
          automation_id?: string
          child_fired_at?: string | null
          child_firing?: Json
          child_firing_id?: string
          child_trigger_id?: string
          created?: string
          id?: string
          parent_trigger_id?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_composite_trigger_child_firing__automation_id__automation"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation"
            referencedColumns: ["id"]
          },
        ]
      }
      concurrency_limit: {
        Row: {
          active_slots: Json
          concurrency_limit: number
          created: string
          id: string
          tag: string
          updated: string
        }
        Insert: {
          active_slots?: Json
          concurrency_limit: number
          created?: string
          id?: string
          tag: string
          updated?: string
        }
        Update: {
          active_slots?: Json
          concurrency_limit?: number
          created?: string
          id?: string
          tag?: string
          updated?: string
        }
        Relationships: []
      }
      concurrency_limit_v2: {
        Row: {
          active: boolean
          active_slots: number
          avg_slot_occupancy_seconds: number
          created: string
          denied_slots: number
          id: string
          limit: number
          name: string
          slot_decay_per_second: number
          updated: string
        }
        Insert: {
          active: boolean
          active_slots: number
          avg_slot_occupancy_seconds: number
          created?: string
          denied_slots: number
          id?: string
          limit: number
          name: string
          slot_decay_per_second: number
          updated?: string
        }
        Update: {
          active?: boolean
          active_slots?: number
          avg_slot_occupancy_seconds?: number
          created?: string
          denied_slots?: number
          id?: string
          limit?: number
          name?: string
          slot_decay_per_second?: number
          updated?: string
        }
        Relationships: []
      }
      configuration: {
        Row: {
          created: string
          id: string
          key: string
          updated: string
          value: Json
        }
        Insert: {
          created?: string
          id?: string
          key: string
          updated?: string
          value: Json
        }
        Update: {
          created?: string
          id?: string
          key?: string
          updated?: string
          value?: Json
        }
        Relationships: []
      }
      csrf_token: {
        Row: {
          client: string
          created: string
          expiration: string
          id: string
          token: string
          updated: string
        }
        Insert: {
          client: string
          created?: string
          expiration: string
          id?: string
          token: string
          updated?: string
        }
        Update: {
          client?: string
          created?: string
          expiration?: string
          id?: string
          token?: string
          updated?: string
        }
        Relationships: []
      }
      deployment: {
        Row: {
          concurrency_limit: number | null
          concurrency_limit_id: string | null
          concurrency_options: Json | null
          created: string
          created_by: Json | null
          description: string | null
          enforce_parameter_schema: boolean
          entrypoint: string | null
          flow_id: string
          id: string
          infra_overrides: Json
          infrastructure_document_id: string | null
          labels: Json | null
          last_polled: string | null
          name: string
          parameter_openapi_schema: Json | null
          parameters: Json
          path: string | null
          paused: boolean
          pull_steps: Json | null
          status: Database["public"]["Enums"]["deployment_status"]
          storage_document_id: string | null
          tags: Json
          updated: string
          updated_by: Json | null
          version: string | null
          version_id: string | null
          work_queue_id: string | null
          work_queue_name: string | null
        }
        Insert: {
          concurrency_limit?: number | null
          concurrency_limit_id?: string | null
          concurrency_options?: Json | null
          created?: string
          created_by?: Json | null
          description?: string | null
          enforce_parameter_schema?: boolean
          entrypoint?: string | null
          flow_id: string
          id?: string
          infra_overrides?: Json
          infrastructure_document_id?: string | null
          labels?: Json | null
          last_polled?: string | null
          name: string
          parameter_openapi_schema?: Json | null
          parameters?: Json
          path?: string | null
          paused?: boolean
          pull_steps?: Json | null
          status?: Database["public"]["Enums"]["deployment_status"]
          storage_document_id?: string | null
          tags?: Json
          updated?: string
          updated_by?: Json | null
          version?: string | null
          version_id?: string | null
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Update: {
          concurrency_limit?: number | null
          concurrency_limit_id?: string | null
          concurrency_options?: Json | null
          created?: string
          created_by?: Json | null
          description?: string | null
          enforce_parameter_schema?: boolean
          entrypoint?: string | null
          flow_id?: string
          id?: string
          infra_overrides?: Json
          infrastructure_document_id?: string | null
          labels?: Json | null
          last_polled?: string | null
          name?: string
          parameter_openapi_schema?: Json | null
          parameters?: Json
          path?: string | null
          paused?: boolean
          pull_steps?: Json | null
          status?: Database["public"]["Enums"]["deployment_status"]
          storage_document_id?: string | null
          tags?: Json
          updated?: string
          updated_by?: Json | null
          version?: string | null
          version_id?: string | null
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_deployment__concurrency_limit_id__concurrency_limit_v2"
            columns: ["concurrency_limit_id"]
            isOneToOne: false
            referencedRelation: "concurrency_limit_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deployment__flow_id__flow"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deployment__infrastructure_document_id__block_document"
            columns: ["infrastructure_document_id"]
            isOneToOne: false
            referencedRelation: "block_document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deployment__storage_document_id__block_document"
            columns: ["storage_document_id"]
            isOneToOne: false
            referencedRelation: "block_document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deployment__work_queue_id__work_queue"
            columns: ["work_queue_id"]
            isOneToOne: false
            referencedRelation: "work_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_schedule: {
        Row: {
          active: boolean
          created: string
          deployment_id: string
          id: string
          max_scheduled_runs: number | null
          parameters: Json
          schedule: Json
          slug: string | null
          updated: string
        }
        Insert: {
          active: boolean
          created?: string
          deployment_id: string
          id?: string
          max_scheduled_runs?: number | null
          parameters?: Json
          schedule: Json
          slug?: string | null
          updated?: string
        }
        Update: {
          active?: boolean
          created?: string
          deployment_id?: string
          id?: string
          max_scheduled_runs?: number | null
          parameters?: Json
          schedule?: Json
          slug?: string | null
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_deployment_schedule__deployment_id__deployment"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployment"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_version: {
        Row: {
          branch: string | null
          created: string
          deployment_id: string
          description: string | null
          enforce_parameter_schema: boolean
          entrypoint: string | null
          id: string
          infra_overrides: Json
          labels: Json | null
          parameter_openapi_schema: Json | null
          parameters: Json
          pull_steps: Json | null
          tags: Json
          updated: string
          version_info: Json
          work_queue_id: string | null
          work_queue_name: string | null
        }
        Insert: {
          branch?: string | null
          created?: string
          deployment_id: string
          description?: string | null
          enforce_parameter_schema?: boolean
          entrypoint?: string | null
          id?: string
          infra_overrides?: Json
          labels?: Json | null
          parameter_openapi_schema?: Json | null
          parameters?: Json
          pull_steps?: Json | null
          tags?: Json
          updated?: string
          version_info?: Json
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Update: {
          branch?: string | null
          created?: string
          deployment_id?: string
          description?: string | null
          enforce_parameter_schema?: boolean
          entrypoint?: string | null
          id?: string
          infra_overrides?: Json
          labels?: Json | null
          parameter_openapi_schema?: Json | null
          parameters?: Json
          pull_steps?: Json | null
          tags?: Json
          updated?: string
          version_info?: Json
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_deployment_version__deployment_id__deployment"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_deployment_version__work_queue_id__work_queue"
            columns: ["work_queue_id"]
            isOneToOne: false
            referencedRelation: "work_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      event_resources: {
        Row: {
          created: string
          event_id: string
          id: string
          occurred: string
          resource: Json
          resource_id: string
          resource_role: string
          updated: string
        }
        Insert: {
          created?: string
          event_id: string
          id?: string
          occurred: string
          resource: Json
          resource_id: string
          resource_role: string
          updated?: string
        }
        Update: {
          created?: string
          event_id?: string
          id?: string
          occurred?: string
          resource?: Json
          resource_id?: string
          resource_role?: string
          updated?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created: string
          event: string
          follows: string | null
          id: string
          occurred: string
          payload: Json
          received: string
          recorded: string
          related: Json
          related_resource_ids: Json
          resource: Json
          resource_id: string
          updated: string
        }
        Insert: {
          created?: string
          event: string
          follows?: string | null
          id?: string
          occurred: string
          payload: Json
          received: string
          recorded: string
          related?: Json
          related_resource_ids?: Json
          resource: Json
          resource_id: string
          updated?: string
        }
        Update: {
          created?: string
          event?: string
          follows?: string | null
          id?: string
          occurred?: string
          payload?: Json
          received?: string
          recorded?: string
          related?: Json
          related_resource_ids?: Json
          resource?: Json
          resource_id?: string
          updated?: string
        }
        Relationships: []
      }
      flow: {
        Row: {
          created: string
          id: string
          labels: Json | null
          name: string
          tags: Json
          updated: string
        }
        Insert: {
          created?: string
          id?: string
          labels?: Json | null
          name: string
          tags?: Json
          updated?: string
        }
        Update: {
          created?: string
          id?: string
          labels?: Json | null
          name?: string
          tags?: Json
          updated?: string
        }
        Relationships: []
      }
      flow_run: {
        Row: {
          auto_scheduled: boolean
          context: Json
          created: string
          created_by: Json | null
          deployment_id: string | null
          deployment_version: string | null
          empirical_policy: Json
          end_time: string | null
          expected_start_time: string | null
          flow_id: string
          flow_version: string | null
          id: string
          idempotency_key: string | null
          infrastructure_document_id: string | null
          infrastructure_pid: string | null
          job_variables: Json | null
          labels: Json | null
          name: string
          next_scheduled_start_time: string | null
          parameters: Json
          parent_task_run_id: string | null
          run_count: number
          start_time: string | null
          state_id: string | null
          state_name: string | null
          state_timestamp: string | null
          state_type: Database["public"]["Enums"]["state_type"] | null
          tags: Json
          total_run_time: unknown
          updated: string
          work_queue_id: string | null
          work_queue_name: string | null
        }
        Insert: {
          auto_scheduled?: boolean
          context?: Json
          created?: string
          created_by?: Json | null
          deployment_id?: string | null
          deployment_version?: string | null
          empirical_policy?: Json
          end_time?: string | null
          expected_start_time?: string | null
          flow_id: string
          flow_version?: string | null
          id?: string
          idempotency_key?: string | null
          infrastructure_document_id?: string | null
          infrastructure_pid?: string | null
          job_variables?: Json | null
          labels?: Json | null
          name: string
          next_scheduled_start_time?: string | null
          parameters?: Json
          parent_task_run_id?: string | null
          run_count?: number
          start_time?: string | null
          state_id?: string | null
          state_name?: string | null
          state_timestamp?: string | null
          state_type?: Database["public"]["Enums"]["state_type"] | null
          tags?: Json
          total_run_time?: unknown
          updated?: string
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Update: {
          auto_scheduled?: boolean
          context?: Json
          created?: string
          created_by?: Json | null
          deployment_id?: string | null
          deployment_version?: string | null
          empirical_policy?: Json
          end_time?: string | null
          expected_start_time?: string | null
          flow_id?: string
          flow_version?: string | null
          id?: string
          idempotency_key?: string | null
          infrastructure_document_id?: string | null
          infrastructure_pid?: string | null
          job_variables?: Json | null
          labels?: Json | null
          name?: string
          next_scheduled_start_time?: string | null
          parameters?: Json
          parent_task_run_id?: string | null
          run_count?: number
          start_time?: string | null
          state_id?: string | null
          state_name?: string | null
          state_timestamp?: string | null
          state_type?: Database["public"]["Enums"]["state_type"] | null
          tags?: Json
          total_run_time?: unknown
          updated?: string
          work_queue_id?: string | null
          work_queue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_flow_run__flow_id__flow"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flow"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flow_run__infrastructure_document_id__block_document"
            columns: ["infrastructure_document_id"]
            isOneToOne: false
            referencedRelation: "block_document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flow_run__parent_task_run_id__task_run"
            columns: ["parent_task_run_id"]
            isOneToOne: false
            referencedRelation: "task_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flow_run__state_id__flow_run_state"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "flow_run_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flow_run__work_queue_id__work_queue"
            columns: ["work_queue_id"]
            isOneToOne: false
            referencedRelation: "work_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_run_input: {
        Row: {
          created: string
          flow_run_id: string
          id: string
          key: string
          sender: string | null
          updated: string
          value: string
        }
        Insert: {
          created?: string
          flow_run_id: string
          id?: string
          key: string
          sender?: string | null
          updated?: string
          value: string
        }
        Update: {
          created?: string
          flow_run_id?: string
          id?: string
          key?: string
          sender?: string | null
          updated?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_flow_run_input__flow_run_id__flow_run"
            columns: ["flow_run_id"]
            isOneToOne: false
            referencedRelation: "flow_run"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_run_state: {
        Row: {
          created: string
          data: Json | null
          flow_run_id: string
          id: string
          message: string | null
          name: string
          result_artifact_id: string | null
          state_details: Json
          timestamp: string
          type: Database["public"]["Enums"]["state_type"]
          updated: string
        }
        Insert: {
          created?: string
          data?: Json | null
          flow_run_id: string
          id?: string
          message?: string | null
          name: string
          result_artifact_id?: string | null
          state_details?: Json
          timestamp?: string
          type: Database["public"]["Enums"]["state_type"]
          updated?: string
        }
        Update: {
          created?: string
          data?: Json | null
          flow_run_id?: string
          id?: string
          message?: string | null
          name?: string
          result_artifact_id?: string | null
          state_details?: Json
          timestamp?: string
          type?: Database["public"]["Enums"]["state_type"]
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_flow_run_state__flow_run_id__flow_run"
            columns: ["flow_run_id"]
            isOneToOne: false
            referencedRelation: "flow_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_flow_run_state__result_artifact_id__artifact"
            columns: ["result_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifact"
            referencedColumns: ["id"]
          },
        ]
      }
      food_suggestions: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      foods: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          fatsecret_id: number | null
          id: string
          name: string
          protein: number | null
          serving_size: string | null
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fatsecret_id?: number | null
          id?: string
          name: string
          protein?: number | null
          serving_size?: string | null
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          fatsecret_id?: number | null
          id?: string
          name?: string
          protein?: number | null
          serving_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          amount: number | null
          category: string | null
          description: string | null
          insight_text: string
          per_capita: number | null
          percentage_of_budget: number | null
          priority_level: string | null
          source_page: string | null
          subcategory: string | null
          trend: string | null
          trend_percentage: string | null
          uuid: string
          year: number | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          description?: string | null
          insight_text: string
          per_capita?: number | null
          percentage_of_budget?: number | null
          priority_level?: string | null
          source_page?: string | null
          subcategory?: string | null
          trend?: string | null
          trend_percentage?: string | null
          uuid?: string
          year?: number | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          description?: string | null
          insight_text?: string
          per_capita?: number | null
          percentage_of_budget?: number | null
          priority_level?: string | null
          source_page?: string | null
          subcategory?: string | null
          trend?: string | null
          trend_percentage?: string | null
          uuid?: string
          year?: number | null
        }
        Relationships: []
      }
      log: {
        Row: {
          created: string
          flow_run_id: string | null
          id: string
          level: number
          message: string
          name: string
          task_run_id: string | null
          timestamp: string
          updated: string
        }
        Insert: {
          created?: string
          flow_run_id?: string | null
          id?: string
          level: number
          message: string
          name: string
          task_run_id?: string | null
          timestamp: string
          updated?: string
        }
        Update: {
          created?: string
          flow_run_id?: string | null
          id?: string
          level?: number
          message?: string
          name?: string
          task_run_id?: string | null
          timestamp?: string
          updated?: string
        }
        Relationships: []
      }
      mbta_alerts: {
        Row: {
          created_at: string
          current: boolean
          description: string | null
          end_time: string | null
          header: string
          id: string
          start_time: string | null
          stops: string[] | null
          type: string
          upcoming: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          current?: boolean
          description?: string | null
          end_time?: string | null
          header: string
          id: string
          start_time?: string | null
          stops?: string[] | null
          type: string
          upcoming?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          current?: boolean
          description?: string | null
          end_time?: string | null
          header?: string
          id?: string
          start_time?: string | null
          stops?: string[] | null
          type?: string
          upcoming?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      mbta_bus_connections: {
        Row: {
          bus_route: string
          created_at: string | null
          id: number
          station_id: string
          updated_at: string | null
        }
        Insert: {
          bus_route: string
          created_at?: string | null
          id?: number
          station_id: string
          updated_at?: string | null
        }
        Update: {
          bus_route?: string
          created_at?: string | null
          id?: number
          station_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mbta_bus_connections_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "mbta_stations"
            referencedColumns: ["station_id"]
          },
        ]
      }
      mbta_line_directions: {
        Row: {
          created_at: string | null
          direction_id: string
          direction_name: string
          id: number
          line_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction_id: string
          direction_name: string
          id?: number
          line_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction_id?: string
          direction_name?: string
          id?: number
          line_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mbta_line_directions_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "mbta_transit_lines"
            referencedColumns: ["line_id"]
          },
        ]
      }
      mbta_station_stops: {
        Row: {
          created_at: string | null
          direction_id: string
          id: number
          station_id: string
          stop_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction_id: string
          id?: number
          station_id: string
          stop_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction_id?: string
          id?: number
          station_id?: string
          stop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mbta_station_stops_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "mbta_stations"
            referencedColumns: ["station_id"]
          },
        ]
      }
      mbta_stations: {
        Row: {
          accessible: boolean | null
          created_at: string | null
          enclosed_bike_parking: boolean | null
          id: number
          line_id: string
          order_num: number
          pedal_park: boolean | null
          short_name: string | null
          station_id: string
          stop_name: string
          terminus: boolean | null
          updated_at: string | null
        }
        Insert: {
          accessible?: boolean | null
          created_at?: string | null
          enclosed_bike_parking?: boolean | null
          id?: number
          line_id: string
          order_num: number
          pedal_park?: boolean | null
          short_name?: string | null
          station_id: string
          stop_name: string
          terminus?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accessible?: boolean | null
          created_at?: string | null
          enclosed_bike_parking?: boolean | null
          id?: number
          line_id?: string
          order_num?: number
          pedal_park?: boolean | null
          short_name?: string | null
          station_id?: string
          stop_name?: string
          terminus?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mbta_stations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "mbta_transit_lines"
            referencedColumns: ["line_id"]
          },
        ]
      }
      mbta_transit_lines: {
        Row: {
          created_at: string | null
          id: number
          line_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          line_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          line_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mbta_travel_times: {
        Row: {
          arr_dt: string
          benchmark_travel_time_sec: number
          created_at: string
          date: string
          dep_dt: string
          dep_dt_key: string | null
          direction: number
          from_stop: string
          id: string
          route_id: string
          time_key: string | null
          to_stop: string
          travel_time_sec: number
        }
        Insert: {
          arr_dt: string
          benchmark_travel_time_sec: number
          created_at?: string
          date: string
          dep_dt: string
          dep_dt_key?: string | null
          direction: number
          from_stop: string
          id?: string
          route_id: string
          time_key?: string | null
          to_stop: string
          travel_time_sec: number
        }
        Update: {
          arr_dt?: string
          benchmark_travel_time_sec?: number
          created_at?: string
          date?: string
          dep_dt?: string
          dep_dt_key?: string | null
          direction?: number
          from_stop?: string
          id?: string
          route_id?: string
          time_key?: string | null
          to_stop?: string
          travel_time_sec?: number
        }
        Relationships: []
      }
      meal_entries: {
        Row: {
          created_at: string
          date: string
          food_id: string | null
          id: string
          meal_type: string
          quantity: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          food_id?: string | null
          id?: string
          meal_type: string
          quantity: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          food_id?: string | null
          id?: string
          meal_type?: string
          quantity?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_entries_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search: {
        Row: {
          created: string
          filters: Json
          id: string
          name: string
          updated: string
        }
        Insert: {
          created?: string
          filters?: Json
          id?: string
          name: string
          updated?: string
        }
        Update: {
          created?: string
          filters?: Json
          id?: string
          name?: string
          updated?: string
        }
        Relationships: []
      }
      task_run: {
        Row: {
          cache_expiration: string | null
          cache_key: string | null
          created: string
          dynamic_key: string
          empirical_policy: Json
          end_time: string | null
          expected_start_time: string | null
          flow_run_id: string | null
          flow_run_run_count: number
          id: string
          labels: Json | null
          name: string
          next_scheduled_start_time: string | null
          run_count: number
          start_time: string | null
          state_id: string | null
          state_name: string | null
          state_timestamp: string | null
          state_type: Database["public"]["Enums"]["state_type"] | null
          tags: Json
          task_inputs: Json
          task_key: string
          task_version: string | null
          total_run_time: unknown
          updated: string
        }
        Insert: {
          cache_expiration?: string | null
          cache_key?: string | null
          created?: string
          dynamic_key: string
          empirical_policy?: Json
          end_time?: string | null
          expected_start_time?: string | null
          flow_run_id?: string | null
          flow_run_run_count?: number
          id?: string
          labels?: Json | null
          name: string
          next_scheduled_start_time?: string | null
          run_count?: number
          start_time?: string | null
          state_id?: string | null
          state_name?: string | null
          state_timestamp?: string | null
          state_type?: Database["public"]["Enums"]["state_type"] | null
          tags?: Json
          task_inputs?: Json
          task_key: string
          task_version?: string | null
          total_run_time?: unknown
          updated?: string
        }
        Update: {
          cache_expiration?: string | null
          cache_key?: string | null
          created?: string
          dynamic_key?: string
          empirical_policy?: Json
          end_time?: string | null
          expected_start_time?: string | null
          flow_run_id?: string | null
          flow_run_run_count?: number
          id?: string
          labels?: Json | null
          name?: string
          next_scheduled_start_time?: string | null
          run_count?: number
          start_time?: string | null
          state_id?: string | null
          state_name?: string | null
          state_timestamp?: string | null
          state_type?: Database["public"]["Enums"]["state_type"] | null
          tags?: Json
          task_inputs?: Json
          task_key?: string
          task_version?: string | null
          total_run_time?: unknown
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_run__flow_run_id__flow_run"
            columns: ["flow_run_id"]
            isOneToOne: false
            referencedRelation: "flow_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_run__state_id__task_run_state"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "task_run_state"
            referencedColumns: ["id"]
          },
        ]
      }
      task_run_state: {
        Row: {
          created: string
          data: Json | null
          id: string
          message: string | null
          name: string
          result_artifact_id: string | null
          state_details: Json
          task_run_id: string
          timestamp: string
          type: Database["public"]["Enums"]["state_type"]
          updated: string
        }
        Insert: {
          created?: string
          data?: Json | null
          id?: string
          message?: string | null
          name: string
          result_artifact_id?: string | null
          state_details?: Json
          task_run_id: string
          timestamp?: string
          type: Database["public"]["Enums"]["state_type"]
          updated?: string
        }
        Update: {
          created?: string
          data?: Json | null
          id?: string
          message?: string | null
          name?: string
          result_artifact_id?: string | null
          state_details?: Json
          task_run_id?: string
          timestamp?: string
          type?: Database["public"]["Enums"]["state_type"]
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_task_run_state__result_artifact_id__artifact"
            columns: ["result_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifact"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_task_run_state__task_run_id__task_run"
            columns: ["task_run_id"]
            isOneToOne: false
            referencedRelation: "task_run"
            referencedColumns: ["id"]
          },
        ]
      }
      task_run_state_cache: {
        Row: {
          cache_expiration: string | null
          cache_key: string
          created: string
          id: string
          task_run_state_id: string
          updated: string
        }
        Insert: {
          cache_expiration?: string | null
          cache_key: string
          created?: string
          id?: string
          task_run_state_id: string
          updated?: string
        }
        Update: {
          cache_expiration?: string | null
          cache_key?: string
          created?: string
          id?: string
          task_run_state_id?: string
          updated?: string
        }
        Relationships: []
      }
      variable: {
        Row: {
          created: string
          id: string
          name: string
          tags: Json
          updated: string
          value: Json | null
        }
        Insert: {
          created?: string
          id?: string
          name: string
          tags?: Json
          updated?: string
          value?: Json | null
        }
        Update: {
          created?: string
          id?: string
          name?: string
          tags?: Json
          updated?: string
          value?: Json | null
        }
        Relationships: []
      }
      visitor_analytics: {
        Row: {
          city: string | null
          country: string | null
          id: string
          ip_address: string | null
          last_active: string | null
          page_path: string | null
          referrer: string | null
          region: string | null
          user_agent: string | null
          visit_date: string | null
          visit_duration: number | null
          visit_timestamp: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          page_path?: string | null
          referrer?: string | null
          region?: string | null
          user_agent?: string | null
          visit_date?: string | null
          visit_duration?: number | null
          visit_timestamp?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          ip_address?: string | null
          last_active?: string | null
          page_path?: string | null
          referrer?: string | null
          region?: string | null
          user_agent?: string | null
          visit_date?: string | null
          visit_duration?: number | null
          visit_timestamp?: string | null
        }
        Relationships: []
      }
      visitor_tracking: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_returning: boolean | null
          page_path: string
          referrer: string | null
          region: string | null
          screen_size: string | null
          session_id: string
          updated_at: string | null
          user_agent: string | null
          visit_duration: number | null
          visit_timestamp: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_returning?: boolean | null
          page_path: string
          referrer?: string | null
          region?: string | null
          screen_size?: string | null
          session_id: string
          updated_at?: string | null
          user_agent?: string | null
          visit_duration?: number | null
          visit_timestamp?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_returning?: boolean | null
          page_path?: string
          referrer?: string | null
          region?: string | null
          screen_size?: string | null
          session_id?: string
          updated_at?: string | null
          user_agent?: string | null
          visit_duration?: number | null
          visit_timestamp?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      weather_data: {
        Row: {
          conditions: string
          current_conditions: Json
          data: Json
          fetched_at: string
          humidity: number
          icon: string
          id: string
          location: string
          temp: number
        }
        Insert: {
          conditions: string
          current_conditions: Json
          data: Json
          fetched_at?: string
          humidity: number
          icon: string
          id?: string
          location: string
          temp: number
        }
        Update: {
          conditions?: string
          current_conditions?: Json
          data?: Json
          fetched_at?: string
          humidity?: number
          icon?: string
          id?: string
          location?: string
          temp?: number
        }
        Relationships: []
      }
      work_pool: {
        Row: {
          base_job_template: Json
          concurrency_limit: number | null
          created: string
          default_queue_id: string | null
          description: string | null
          id: string
          is_paused: boolean
          last_status_event_id: string | null
          last_transitioned_status_at: string | null
          name: string
          status: Database["public"]["Enums"]["work_pool_status"]
          storage_configuration: Json
          type: string
          updated: string
        }
        Insert: {
          base_job_template?: Json
          concurrency_limit?: number | null
          created?: string
          default_queue_id?: string | null
          description?: string | null
          id?: string
          is_paused?: boolean
          last_status_event_id?: string | null
          last_transitioned_status_at?: string | null
          name: string
          status?: Database["public"]["Enums"]["work_pool_status"]
          storage_configuration?: Json
          type: string
          updated?: string
        }
        Update: {
          base_job_template?: Json
          concurrency_limit?: number | null
          created?: string
          default_queue_id?: string | null
          description?: string | null
          id?: string
          is_paused?: boolean
          last_status_event_id?: string | null
          last_transitioned_status_at?: string | null
          name?: string
          status?: Database["public"]["Enums"]["work_pool_status"]
          storage_configuration?: Json
          type?: string
          updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_work_pool__default_queue_id__work_queue"
            columns: ["default_queue_id"]
            isOneToOne: false
            referencedRelation: "work_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      work_queue: {
        Row: {
          concurrency_limit: number | null
          created: string
          description: string
          filter: Json | null
          id: string
          is_paused: boolean
          last_polled: string | null
          name: string
          priority: number
          status: Database["public"]["Enums"]["work_queue_status"]
          updated: string
          work_pool_id: string
        }
        Insert: {
          concurrency_limit?: number | null
          created?: string
          description?: string
          filter?: Json | null
          id?: string
          is_paused?: boolean
          last_polled?: string | null
          name: string
          priority?: number
          status?: Database["public"]["Enums"]["work_queue_status"]
          updated?: string
          work_pool_id: string
        }
        Update: {
          concurrency_limit?: number | null
          created?: string
          description?: string
          filter?: Json | null
          id?: string
          is_paused?: boolean
          last_polled?: string | null
          name?: string
          priority?: number
          status?: Database["public"]["Enums"]["work_queue_status"]
          updated?: string
          work_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_work_queue__work_pool_id__work_pool"
            columns: ["work_pool_id"]
            isOneToOne: false
            referencedRelation: "work_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      worker: {
        Row: {
          created: string
          heartbeat_interval_seconds: number | null
          id: string
          last_heartbeat_time: string
          name: string
          status: Database["public"]["Enums"]["worker_status"]
          updated: string
          work_pool_id: string
        }
        Insert: {
          created?: string
          heartbeat_interval_seconds?: number | null
          id?: string
          last_heartbeat_time?: string
          name: string
          status?: Database["public"]["Enums"]["worker_status"]
          updated?: string
          work_pool_id: string
        }
        Update: {
          created?: string
          heartbeat_interval_seconds?: number | null
          id?: string
          last_heartbeat_time?: string
          name?: string
          status?: Database["public"]["Enums"]["worker_status"]
          updated?: string
          work_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_worker__work_pool_id__work_pool"
            columns: ["work_pool_id"]
            isOneToOne: false
            referencedRelation: "work_pool"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_daily_totals: {
        Args: { p_user_id: string; p_date: string }
        Returns: {
          total_calories: number
          total_protein: number
          total_carbs: number
          total_fat: number
        }[]
      }
      fetch_and_store_travel_times: {
        Args: { p_date: string; p_from_stop: string; p_to_stop: string }
        Returns: string
      }
      get_daily_visitor_counts: {
        Args: { days_ago: number }
        Returns: {
          visit_date: string
          count: number
        }[]
      }
      get_visitor_count_by_day: {
        Args: { days_back?: number }
        Returns: {
          visit_date: string
          visitor_count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      deployment_status: "READY" | "NOT_READY"
      state_type:
        | "SCHEDULED"
        | "PENDING"
        | "RUNNING"
        | "COMPLETED"
        | "FAILED"
        | "CANCELLED"
        | "CRASHED"
        | "PAUSED"
        | "CANCELLING"
      work_pool_status: "READY" | "NOT_READY" | "PAUSED"
      work_queue_status: "READY" | "NOT_READY" | "PAUSED"
      worker_status: "ONLINE" | "OFFLINE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      deployment_status: ["READY", "NOT_READY"],
      state_type: [
        "SCHEDULED",
        "PENDING",
        "RUNNING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "CRASHED",
        "PAUSED",
        "CANCELLING",
      ],
      work_pool_status: ["READY", "NOT_READY", "PAUSED"],
      work_queue_status: ["READY", "NOT_READY", "PAUSED"],
      worker_status: ["ONLINE", "OFFLINE"],
    },
  },
} as const
