export interface NotificationCenter {
  userId: string;
  type: string;
  content: string;
  read?: boolean;
  link?: string;
  additionalData?: string;
}
