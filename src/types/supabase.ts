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
      profiles: {
        Row: {
          id: string
          email: string | null
          created_at: string
          updated_at: string | null
          full_name: string | null
          credits: number
          session_id: string | null
          signup_bonus_given: boolean
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          credits?: number
          session_id?: string | null
          signup_bonus_given?: boolean
        }
        Update: {
          id?: string
          email?: string | null
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          credits?: number
          session_id?: string | null
          signup_bonus_given?: boolean
        }
      }
      credit_packages: {
        Row: {
          id: string
          package_id: string
          name: string
          credits: number
          price: number
          original_price: number | null
          bonus: number
          is_popular: boolean
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          package_id: string
          name: string
          credits: number
          price: number
          original_price?: number | null
          bonus?: number
          is_popular?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          package_id?: string
          name?: string
          credits?: number
          price?: number
          original_price?: number | null
          bonus?: number
          is_popular?: boolean
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          package_id: string
          package_name: string
          price: number
          credits: number
          status: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_provider: string | null
          payment_order_id: string | null
          payment_transaction_id: string | null
          error_message: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          package_id: string
          package_name: string
          price: number
          credits: number
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_provider?: string | null
          payment_order_id?: string | null
          payment_transaction_id?: string | null
          error_message?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          package_id?: string
          package_name?: string
          price?: number
          credits?: number
          status?: 'pending' | 'paid' | 'failed' | 'refunded'
          payment_provider?: string | null
          payment_order_id?: string | null
          payment_transaction_id?: string | null
          error_message?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          description: string | null
          order_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          description?: string | null
          order_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          description?: string | null
          order_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      answer_history: {
        Row: {
          id: string
          user_id: string
          question_id: string
          answer_zh: string | null
          answer_en: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          answer_zh?: string | null
          answer_en?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          answer_zh?: string | null
          answer_en?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rate_limits: {
        Row: {
          id: string
          identifier: string
          endpoint: string
          request_count: number
          window_start: string
          created_at: string
        }
        Insert: {
          id?: string
          identifier: string
          endpoint: string
          request_count?: number
          window_start?: string
          created_at?: string
        }
        Update: {
          id?: string
          identifier?: string
          endpoint?: string
          request_count?: number
          window_start?: string
          created_at?: string
        }
      }
      request_logs: {
        Row: {
          id: string
          user_id: string | null
          endpoint: string
          method: string
          ip_address: string | null
          user_agent: string | null
          request_body: Json | null
          response_status: number | null
          response_time_ms: number | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          endpoint: string
          method: string
          ip_address?: string | null
          user_agent?: string | null
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          endpoint?: string
          method?: string
          ip_address?: string | null
          user_agent?: string | null
          request_body?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          error_message?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_type: string
          p_description: string
          p_order_id?: string
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: boolean
      }
      refund_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description: string
          p_order_id?: string
        }
        Returns: boolean
      }
      give_signup_bonus: {
        Args: {
          p_user_id: string
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
