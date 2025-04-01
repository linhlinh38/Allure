export class NotificationData {
  title: string;

  body: string;

  data?: Record<string, any>;

  createdAt?: Date;

  accountIds?: string[];

  isRead?: boolean;
}
