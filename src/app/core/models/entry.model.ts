import { SyncStatus } from './user.model';

export type EntryType = 'cash_in' | 'cash_out';
export type PaymentMode = 'cash' | 'online' | 'credit_card';

export interface Entry {
  id: string;
  book_id: string;
  type: EntryType;
  amount: number;
  party_id?: string;
  category_id?: string;
  payment_mode: PaymentMode;
  date_time: string;
  remarks?: string;
  attachment_path?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

export interface ActivityLog {
  id: string;
  entry_id: string;
  user_id: string;
  action: string;
  details?: string;
  created_at: string;
}

