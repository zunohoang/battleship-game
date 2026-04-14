import apiClient from '@/services/axios';
import type { BoardConfig, Shot } from '@/types/game';

interface LlmBotShotRequest {
  boardConfig: BoardConfig;
  shots: Shot[];
  shipSizes: number[];
}

interface LlmBotShotResponse {
  target: {
    x: number;
    y: number;
    source: 'llm' | 'fallback';
  } | null;
}

export async function requestLlmBotShot(
  payload: LlmBotShotRequest,
): Promise<{ x: number; y: number } | null> {
  const { data } = await apiClient.post<LlmBotShotResponse>(
    '/game/bot/llm-shot',
    payload,
  );

  if (!data?.target) {
    return null;
  }

  return {
    x: data.target.x,
    y: data.target.y,
  };
}
