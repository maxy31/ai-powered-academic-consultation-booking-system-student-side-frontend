export interface NotificationItem {
  id: number;
  recipientUserId: number;
  type: string; // e.g. APPOINTMENT_CREATED, ANNOUNCEMENT, SYSTEM
  title: string;
  message: string;
  relatedAppointmentId?: number;
  createdAt: string; // ISO
  readAt?: string;
  deletedAt?: string;
  messageKey?: string;
  messageArgs?: string; // JSON string optionally
}

export const deriveIsRead = (n: NotificationItem) => !!n.readAt;
