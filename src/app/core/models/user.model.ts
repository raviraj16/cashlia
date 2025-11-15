export interface User {
  id: string;
  email: string;
  mobile?: string;
  password_hash?: string;
  firebase_uid?: string;
  created_at: string;
  updated_at: string;
}

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

