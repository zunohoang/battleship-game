import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import type { GamePhase, GameResult } from '@/types/game';

interface UseGamePlayMusicParams {
  phase: GamePhase;
  result: GameResult | null;
}

export function useGamePlayMusic({
  phase,
  result,
}: UseGamePlayMusicParams) {
  const { playBackgroundMusic, stopBackgroundMusic, fadeOutBackgroundMusic } =
    useSettings();

  useEffect(() => {
    if (phase === 'playing' && result === null) {
      void playBackgroundMusic();
      return;
    }

    if (phase === 'gameover') {
      fadeOutBackgroundMusic(500);
    }
  }, [fadeOutBackgroundMusic, phase, playBackgroundMusic, result]);

  useEffect(
    () => () => {
      stopBackgroundMusic();
    },
    [stopBackgroundMusic],
  );

  return {
    stopBackgroundMusic,
  };
}