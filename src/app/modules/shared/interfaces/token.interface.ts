export interface Token {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  avatar: string;
  isTooltipActive: boolean;
  status?: string;
  lastActivity?: Date;
  _id?: string;
}
