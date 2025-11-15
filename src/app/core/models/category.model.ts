import { SyncStatus } from './user.model';

export interface Category {
  id: string;
  business_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}

