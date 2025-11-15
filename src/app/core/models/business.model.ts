import { SyncStatus } from './user.model';

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  sync_status: SyncStatus;
}

export type BusinessRole = 'owner' | 'business_partner' | 'staff_member';

export interface BusinessTeam {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  invited_by: string;
  joined_at: string;
  sync_status: SyncStatus;
}

