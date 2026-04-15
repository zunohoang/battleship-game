export interface ChatMessageSnapshot {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  sequence: number;
  sentAt: string;
}
