// Minimal hand-written schema types so the Supabase client types inserts/updates
// (without these, the untyped client infers `never` for write payloads).
import type { MatchResult, Preferences, SessionStatus } from "./types";

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          code: string;
          region: string;
          status: SessionStatus;
          result: MatchResult | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          region?: string;
          status?: SessionStatus;
          result?: MatchResult | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          session_id: string;
          client_id: string;
          label: string;
          prefs: Preferences | null;
          submitted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          client_id: string;
          label: string;
          prefs?: Preferences | null;
          submitted?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
