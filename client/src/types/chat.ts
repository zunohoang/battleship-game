export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  content: string
  sequence: number
  sentAt: string
}

export interface ChatHistoryPayload {
  roomId?: string
}

export interface SendChatMessagePayload {
  roomId?: string
  content: string
}
