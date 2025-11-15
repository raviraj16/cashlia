import { SyncStatus } from './user.model';

export interface Party {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

