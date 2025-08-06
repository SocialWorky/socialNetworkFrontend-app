import { User } from '@shared/interfaces/user.interface';

export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user',
  GUEST = 'guest'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UserUpdateRequest {
  id: string;
  username?: string;
  name?: string;
  lastName?: string;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
  avatar?: string;
  token?: string;
  password?: string;
  isTooltipActive?: boolean;
  isDarkMode?: boolean;
  lastConnection?: Date;
}

export interface SendVerificationEmailRequest {
  userId: string;
  email: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 