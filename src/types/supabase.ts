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
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          credits?: number
          session_id?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          created_at?: string
          updated_at?: string | null
          full_name?: string | null
          credits?: number
          session_id?: string | null
        }
      }
      credit_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          description?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits: {
        Args: {
          user_id: string
          amount: number
          description: string
        }
        Returns: undefined
      }
      add_credits: {
        Args: {
          user_id: string
          amount: number
          type: string
          description: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
