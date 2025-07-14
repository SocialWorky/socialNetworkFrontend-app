export interface Webhook {
  _id: string;
  event: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhook {
  event: string;
  url: string;
}

export interface UpdateWebhook {
  event: string;
  url: string;
}

export interface ToggleWebhook {
  isActive: boolean;
}
