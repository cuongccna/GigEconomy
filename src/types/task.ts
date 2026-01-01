import { LucideIcon } from "lucide-react";

// Task from API response
export interface ApiTask {
  id: string;
  title: string;
  reward: number;
  link: string;
  icon: string;
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
  isCompleted: boolean;
}

// API Response types
export interface TasksResponse {
  tasks: ApiTask[];
  userBalance: number;
}

export interface ClaimResponse {
  success: boolean;
  message: string;
  newBalance: number;
  reward: number;
}
