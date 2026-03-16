import { useEffect, useRef, useState } from 'react';
import { MessageSquare, ScrollText, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MissionLogEntry } from '@/types/game';

export interface MissionLogPanelProps {
  title: string;
  subtitle?: string;
  entries: MissionLogEntry[];
  className?: string;
  logHeightClassName?: string;
}

type MissionLogTab = 'logs' | 'chats';

interface MissionLogTabButtonProps {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function getLogHighlightClass(highlight?: MissionLogEntry['highlight']) {
  if (highlight === 'critical' || highlight === 'error') {
    return 'font-bold text-[rgba(255,110,100,0.96)]';
  }

  if (highlight === 'enemy') {
    return 'font-bold text-[rgba(255,180,80,0.95)]';
  }

  if (highlight === 'friendly') {
    return 'font-bold text-(--accent-secondary)';
  }

  if (highlight === 'miss') {
    return 'text-(--text-muted)';
  }

  if (highlight === 'info') {
    return 'text-(--accent-secondary)';
  }

  return 'text-(--text-main)';
}

function MissionLogTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: MissionLogTabButtonProps) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`cursor-pointer flex h-12 w-12 items-center justify-center rounded-md border transition-colors ${
        active
          ? 'border-[rgba(117,235,255,0.72)] bg-[rgba(117,235,255,0.16)] text-(--accent-secondary) shadow-[0_0_18px_rgba(34,211,238,0.16)]'
          : 'ui-state-idle text-(--text-muted) hover:text-(--text-main)'
      }`}
    >
      <Icon size={18} strokeWidth={2.25} />
    </button>
  );
}

export function MissionLogPanel({
  title,
  subtitle,
  entries,
  className = '',
  logHeightClassName = 'h-28',
}: MissionLogPanelProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<MissionLogTab>('logs');
  const isLogsTab = activeTab === 'logs';
  const panelTitle = isLogsTab ? title : t('gameBattle.chatTitle');
  const panelSubtitle = isLogsTab ? subtitle : t('gameBattle.chatsTab');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [activeTab, entries]);

  return (
    <div className={`${className} flex items-stretch gap-3`}>
      <div className='flex shrink-0 flex-col gap-2'>
        <MissionLogTabButton
          active={activeTab === 'logs'}
          icon={ScrollText}
          label={t('gameBattle.logsTab')}
          onClick={() => setActiveTab('logs')}
        />
        <MissionLogTabButton
          active={activeTab === 'chats'}
          icon={MessageSquare}
          label={t('gameBattle.chatsTab')}
          onClick={() => setActiveTab('chats')}
        />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between gap-3'>
          <p className='font-mono text-[10px] font-black uppercase tracking-[0.28em] text-(--accent-secondary)'>
            {panelTitle}
          </p>
          {panelSubtitle ? (
            <p className='font-mono text-[9px] tracking-[0.16em] text-(--text-subtle)'>
              {panelSubtitle}
            </p>
          ) : null}
        </div>
        <div
          ref={containerRef}
          className={`themed-scrollbar mt-2 overflow-y-auto pr-1 ${logHeightClassName}`}
        >
          {isLogsTab ? (
            <>
              {entries.map((entry, index) => (
                <p key={`${entry.id}-${index}`} className='font-mono text-[11px] leading-6'>
                  <span className='text-(--text-subtle)'>[{entry.timestamp}] </span>
                  <span className={getLogHighlightClass(entry.highlight)}>
                    {entry.message}
                  </span>
                </p>
              ))}
            </>
          ) : (
            <p className='font-mono text-[11px] leading-6'>
              <span className='text-(--text-subtle)'>[SYS] </span>
              <span className='text-(--text-muted)'>
                {t('gameBattle.chatPlaceholder')}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
