export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CreditLedgerType =
  | "grant"
  | "purchase"
  | "debit"
  | "refund"
  | "admin_adjustment"

export type CreditReferenceType =
  | "message"
  | "regenerate"
  | "payment"
  | "refund"
  | "free_trial"
  | "admin"

export type ChatThreadStatus = "active"

export type ChatRole = "user" | "assistant" | "system"

export type ChatContentType = "text" | "system"

export type ChatMessageStatus =
  | "sent"
  | "pending"
  | "generating"
  | "awaiting_payment"
  | "completed"
  | "failed"

export type PaymentProvider = "mayar"

export type PaymentStatus = "pending" | "paid" | "failed" | "expired"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          created_at: string | null
          updated_at: string | null
          free_credits_granted: boolean | null
          signup_ip: string | null
          signup_fingerprint: string | null
          signup_user_agent: string | null
          status: string | null
          current_plan: string | null
          has_consented: boolean | null
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          free_credits_granted?: boolean | null
          signup_ip?: string | null
          signup_fingerprint?: string | null
          signup_user_agent?: string | null
          status?: string | null
          current_plan?: string | null
          has_consented?: boolean | null
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          created_at?: string | null
          updated_at?: string | null
          free_credits_granted?: boolean | null
          signup_ip?: string | null
          signup_fingerprint?: string | null
          signup_user_agent?: string | null
          status?: string | null
          current_plan?: string | null
          has_consented?: boolean | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: string
          user_id: string | null
          balance: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          balance?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          balance?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string | null
          wallet_id: string | null
          type: CreditLedgerType
          amount: number
          balance_after: number
          reference_type: CreditReferenceType | null
          reference_id: string | null
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          wallet_id?: string | null
          type: CreditLedgerType
          amount: number
          balance_after: number
          reference_type?: CreditReferenceType | null
          reference_id?: string | null
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          wallet_id?: string | null
          type?: CreditLedgerType
          amount?: number
          balance_after?: number
          reference_type?: CreditReferenceType | null
          reference_id?: string | null
          note?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          id: string
          user_id: string | null
          title: string | null
          created_at: string | null
          updated_at: string | null
          last_message_at: string | null
          status: ChatThreadStatus | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_message_at?: string | null
          status?: ChatThreadStatus | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string | null
          created_at?: string | null
          updated_at?: string | null
          last_message_at?: string | null
          status?: ChatThreadStatus | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          thread_id: string | null
          user_id: string | null
          role: ChatRole
          content_text: string | null
          content_type: ChatContentType | null
          status: ChatMessageStatus | null
          parent_message_id: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          thread_id?: string | null
          user_id?: string | null
          role: ChatRole
          content_text?: string | null
          content_type?: ChatContentType | null
          status?: ChatMessageStatus | null
          parent_message_id?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          thread_id?: string | null
          user_id?: string | null
          role?: ChatRole
          content_text?: string | null
          content_type?: ChatContentType | null
          status?: ChatMessageStatus | null
          parent_message_id?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string | null
          thread_id: string | null
          user_id: string | null
          file_type: string | null
          mime_type: string | null
          storage_path: string | null
          public_url: string | null
          file_name: string | null
          file_size: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          message_id?: string | null
          thread_id?: string | null
          user_id?: string | null
          file_type?: string | null
          mime_type?: string | null
          storage_path?: string | null
          public_url?: string | null
          file_name?: string | null
          file_size?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          message_id?: string | null
          thread_id?: string | null
          user_id?: string | null
          file_type?: string | null
          mime_type?: string | null
          storage_path?: string | null
          public_url?: string | null
          file_name?: string | null
          file_size?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          user_id: string | null
          provider: PaymentProvider | null
          package_code: string
          amount_idr: number
          credits_to_add: number
          external_payment_id: string | null
          external_invoice_id: string | null
          status: PaymentStatus | null
          created_at: string | null
          updated_at: string | null
          paid_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          provider?: PaymentProvider | null
          package_code: string
          amount_idr: number
          credits_to_add: number
          external_payment_id?: string | null
          external_invoice_id?: string | null
          status?: PaymentStatus | null
          created_at?: string | null
          updated_at?: string | null
          paid_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          provider?: PaymentProvider | null
          package_code?: string
          amount_idr?: number
          credits_to_add?: number
          external_payment_id?: string | null
          external_invoice_id?: string | null
          status?: PaymentStatus | null
          created_at?: string | null
          updated_at?: string | null
          paid_at?: string | null
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          id: string
          payment_id: string | null
          provider: string | null
          external_event_id: string | null
          event_type: string | null
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          payment_id?: string | null
          provider?: string | null
          external_event_id?: string | null
          event_type?: string | null
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          payment_id?: string | null
          provider?: string | null
          external_event_id?: string | null
          event_type?: string | null
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      abuse_signals: {
        Row: {
          id: string
          user_id: string | null
          fingerprint: string | null
          ip: string | null
          signal_type: string | null
          signal_value: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          fingerprint?: string | null
          ip?: string | null
          signal_type?: string | null
          signal_value?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          fingerprint?: string | null
          ip?: string | null
          signal_type?: string | null
          signal_value?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"]
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"]

export type WalletRow = Database["public"]["Tables"]["wallets"]["Row"]
export type WalletInsert = Database["public"]["Tables"]["wallets"]["Insert"]
export type WalletUpdate = Database["public"]["Tables"]["wallets"]["Update"]

export type CreditLedgerRow =
  Database["public"]["Tables"]["credit_ledger"]["Row"]
export type CreditLedgerInsert =
  Database["public"]["Tables"]["credit_ledger"]["Insert"]
export type CreditLedgerUpdate =
  Database["public"]["Tables"]["credit_ledger"]["Update"]

export type ChatThreadRow = Database["public"]["Tables"]["chat_threads"]["Row"]
export type ChatThreadInsert =
  Database["public"]["Tables"]["chat_threads"]["Insert"]
export type ChatThreadUpdate =
  Database["public"]["Tables"]["chat_threads"]["Update"]

export type ChatMessageRow =
  Database["public"]["Tables"]["chat_messages"]["Row"]
export type ChatMessageInsert =
  Database["public"]["Tables"]["chat_messages"]["Insert"]
export type ChatMessageUpdate =
  Database["public"]["Tables"]["chat_messages"]["Update"]

export type MessageAttachmentRow =
  Database["public"]["Tables"]["message_attachments"]["Row"]
export type MessageAttachmentInsert =
  Database["public"]["Tables"]["message_attachments"]["Insert"]
export type MessageAttachmentUpdate =
  Database["public"]["Tables"]["message_attachments"]["Update"]

export type PaymentRow = Database["public"]["Tables"]["payments"]["Row"]
export type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"]
export type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"]

export type PaymentEventRow =
  Database["public"]["Tables"]["payment_events"]["Row"]
export type PaymentEventInsert =
  Database["public"]["Tables"]["payment_events"]["Insert"]
export type PaymentEventUpdate =
  Database["public"]["Tables"]["payment_events"]["Update"]

export type AbuseSignalRow =
  Database["public"]["Tables"]["abuse_signals"]["Row"]
export type AbuseSignalInsert =
  Database["public"]["Tables"]["abuse_signals"]["Insert"]
export type AbuseSignalUpdate =
  Database["public"]["Tables"]["abuse_signals"]["Update"]
