import { Button } from '@/components/ui/Button';
import type {
  AiDifficulty,
  BotPlacementMode,
  BotPlacementStrategy,
  BotVBotSettings,
} from '@/types/game';

interface BotVsBotMenuProps {
  settings: BotVBotSettings;
  onChange: (settings: BotVBotSettings) => void;
  editTargetBot: 'botA' | 'botB';
  onEditTargetBotChange: (bot: 'botA' | 'botB') => void;
}

const DIFFICULTIES: AiDifficulty[] = ['random', 'learning', 'probability'];
const PLACEMENT_STRATEGIES: BotPlacementStrategy[] = ['random', 'strategic'];
const PLACEMENT_MODES: BotPlacementMode[] = ['auto', 'manual'];

interface BotConfigCardProps {
  title: string;
  settings: BotVBotSettings;
  botKey: 'botA' | 'botB';
  onChange: (settings: BotVBotSettings) => void;
}

function BotConfigCard({
  title,
  settings,
  botKey,
  onChange,
}: BotConfigCardProps) {
  const config = settings[botKey];

  return (
    <div className="ui-subpanel rounded-sm px-4 py-3">
      <p className="ui-panel-title">{title}</p>

      <div className="mt-3">
        <p className="ui-data-label mb-2">Difficulty</p>
        <div className="grid grid-cols-3 gap-1">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={`${botKey}-${difficulty}`}
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  [botKey]: {
                    ...config,
                    difficulty,
                  },
                })
              }
              className={`ui-button-shell rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                config.difficulty === difficulty
                  ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                  : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
              }`}
            >
              {difficulty}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="ui-data-label mb-2">Placement mode</p>
        <div className="grid grid-cols-2 gap-1">
          {PLACEMENT_MODES.map((placementMode) => (
            <button
              key={`${botKey}-${placementMode}`}
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  [botKey]: {
                    ...config,
                    placementMode,
                  },
                })
              }
              className={`ui-button-shell rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                (config.placementMode ?? 'auto') === placementMode
                  ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                  : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
              }`}
            >
              {placementMode}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="ui-data-label mb-2">Ship placement</p>
        <div className="grid grid-cols-2 gap-1">
          {PLACEMENT_STRATEGIES.map((placementStrategy) => (
            <button
              key={`${botKey}-${placementStrategy}`}
              type="button"
              onClick={() =>
                onChange({
                  ...settings,
                  [botKey]: {
                    ...config,
                    placementStrategy,
                  },
                })
              }
              className={`ui-button-shell rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                config.placementStrategy === placementStrategy
                  ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                  : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
              }`}
            >
              {placementStrategy}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BotVsBotMenu({
  settings,
  onChange,
  editTargetBot,
  onEditTargetBotChange,
}: BotVsBotMenuProps) {
  const hasManualBot =
    (settings.botA.placementMode ?? 'auto') === 'manual' ||
    (settings.botB.placementMode ?? 'auto') === 'manual';

  return (
    <div className="ui-panel ui-panel-strong rounded-md p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-panel-title">Bot vs Bot Configuration</p>
          <p className="mt-1 text-sm text-(--text-muted)">
            Choose difficulty and ship placement strategy for each bot.
          </p>
        </div>
        <Button
          onClick={() =>
            onChange({
              botA: {
                difficulty: 'random',
                placementStrategy: 'random',
                placementMode: 'auto',
              },
              botB: {
                difficulty: 'random',
                placementStrategy: 'random',
                placementMode: 'auto',
              },
            })
          }
          className="h-8 px-3 text-[10px]"
        >
          Reset to random
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <BotConfigCard
          title="BOT A"
          settings={settings}
          botKey="botA"
          onChange={onChange}
        />
        <BotConfigCard
          title="BOT B"
          settings={settings}
          botKey="botB"
          onChange={onChange}
        />
      </div>

      {hasManualBot ? (
        <div className="ui-subpanel mt-3 rounded-sm px-4 py-3">
          <p className="ui-data-label mb-2">Manual configuration target</p>
          <div className="grid grid-cols-2 gap-1 sm:max-w-64">
            {(['botA', 'botB'] as const).map((botKey) => (
              <button
                key={`manual-target-${botKey}`}
                type="button"
                onClick={() => onEditTargetBotChange(botKey)}
                className={`ui-button-shell rounded-sm border px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ${
                  editTargetBot === botKey
                    ? 'border-[rgba(117,235,255,0.95)] bg-[rgba(34,211,238,0.16)] text-(--text-main)'
                    : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
                }`}
              >
                {botKey === 'botA' ? 'BOT A' : 'BOT B'}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
