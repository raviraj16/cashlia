import { SyncStatus } from './user.model';

export interface Book {
  id: string;
  business_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  sync_status: SyncStatus;
}

