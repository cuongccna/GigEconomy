import { LucideIcon } from "lucide-react";

// Task from API response
export interface ApiTask {
  id: string;
  title: string;
  reward: number;
  link: string;
  icon: string;
  type: string;
  isActive: boolean;
  isCompleted: boolean;
}

// Task with resolved icon for UI
export interface Task {
  id: string;
  title: string;
  reward: number;
  link: string;
  icon: LucideIcon;
  iconName: string;
  type?: string;
  isCompleted: boolean;
}

// Pagination info
export interface PaginationInfo {
  hasMore: boolean;
  nextCursor: string | null;
  total: number;
}

// Filter info
export interface FilterInfo {
  types: { type: string; count: number }[];
}

// API Response types
export interface TasksResponse {
  tasks: ApiTask[];
  userBalance: number;
  pagination?: PaginationInfo;
  filters?: FilterInfo;
}

export interface ClaimResponse {
  success: boolean;
  message: string;
  newBalance: number;
  reward: number;
}
