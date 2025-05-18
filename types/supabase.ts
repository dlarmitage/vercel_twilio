// Auto-generated types for Supabase tables

export interface PhoneNumber {
  id: string;
  number: string;
  created_at: string;
}

export interface Call {
  id: string;
  phone_number_id: string;
  twilio_call_sid?: string;
  started_at: string;
  ended_at?: string | null;
  summary?: string | null;
}

export type MessageDirection = 'inbound' | 'outbound';

export interface Message {
  id: string;
  call_id: string;
  twilio_message_sid?: string;
  direction: MessageDirection;
  body: string;
  sent_at: string;
  status?: string | null;
}

// Supabase Database type for strict typing with supabase-js
export interface Database {
  public: {
    Tables: {
      phone_numbers: {
        Row: PhoneNumber;
        Insert: Omit<PhoneNumber, 'id' | 'created_at'> & Partial<Pick<PhoneNumber, 'id' | 'created_at'>>;
        Update: Partial<PhoneNumber>;
      };
      calls: {
        Row: Call;
        Insert: Omit<Call, 'id' | 'started_at'> & Partial<Pick<Call, 'id' | 'started_at'>>;
        Update: Partial<Call>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'sent_at'> & Partial<Pick<Message, 'id' | 'sent_at'>>;
        Update: Partial<Message>;
      };
    };
  };
}
