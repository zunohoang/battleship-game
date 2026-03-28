import { useEffect, useRef, useState } from 'react';
import { MessageSquare, ScrollText, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MissionLogEntry } from '@/types/game';
import type { ChatMessage } from '@/types/chat';

export interface MissionLogPanelProps {
  title: string;
  subtitle?: string;
  entries: MissionLogEntry[];
  chatMessages?: ChatMessage[];
  currentUserId?: string | null;
  isChatDisabled?: boolean;
  onSendMessage?: (content: string) => void;
  resolveChatAuthorLabel?: (senderId: string) => string;
  showComposer?: boolean;
  className?: string;
  logHeightClassName?: string;
  defaultTab?: MissionLogTab;
  mode?: 'tabs' | 'chat-only';
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
      type="button"
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
  chatMessages = [],
  currentUserId,
  isChatDisabled = false,
  onSendMessage,
  resolveChatAuthorLabel,
  showComposer = true,
  className = '',
  logHeightClassName = 'h-28',
  defaultTab = 'logs',
  mode = 'tabs',
}: MissionLogPanelProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<MissionLogTab>(defaultTab);
  const [draftMessage, setDraftMessage] = useState('');
  const isChatOnly = mode === 'chat-only';
  const isLogsTab = !isChatOnly && activeTab === 'logs';
  const isChatTab = isChatOnly || activeTab === 'chats';
  const panelTitle = isChatOnly
    ? t('gameBattle.chatTitle')
    : isLogsTab
      ? title
      : t('gameBattle.chatTitle');
  const panelSubtitle = isChatOnly
    ? undefined
    : isLogsTab
      ? subtitle
      : t('gameBattle.chatsTab');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [activeTab, chatMessages, entries, isChatOnly]);

  const handleSubmit = () => {
    const content = draftMessage.trim();
    if (!content || !onSendMessage || isChatDisabled) {
      return;
    }

    onSendMessage(content);
    setDraftMessage('');
  };

  const renderChatContent = () => {
    if (chatMessages.length === 0) {
      return (
        <p className="font-mono text-[11px] leading-6">
          <span className="text-(--text-subtle)">[SYS] </span>
          <span className="text-(--text-muted)">
            {t('gameBattle.chatPlaceholder')}
          </span>
        </p>
      );
    }

    return chatMessages.map((message) => {
      const isOwnMessage = currentUserId && message.senderId === currentUserId;
      const authorLabel = resolveChatAuthorLabel
        ? resolveChatAuthorLabel(message.senderId)
        : isOwnMessage
          ? t('gameBattle.chatYouLabel')
          : t('gameBattle.chatOpponentLabel');
      const timeLabel = new Date(message.sentAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        <p key={message.id} className="font-mono text-[11px] leading-6">
          <span className="text-(--text-subtle)">[{timeLabel}] </span>
          <span
            className={
              isOwnMessage
                ? 'text-(--accent-secondary)'
                : 'text-(--text-subtle)'
            }
          >
            [{authorLabel}]
          </span>
          <span className="text-(--text-main)">{message.content}</span>
        </p>
      );
    });
  };

  return (
    <div className={`${className} flex items-stretch gap-3`}>
      {!isChatOnly ? (
        <div className="flex shrink-0 flex-col gap-2">
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
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.28em] text-(--accent-secondary)">
            {panelTitle}
          </p>
          {panelSubtitle ? (
            <p className="font-mono text-[9px] tracking-[0.16em] text-(--text-subtle)">
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
                <p
                  key={`${entry.id}-${index}`}
                  className="font-mono text-[11px] leading-6"
                >
                  <span className="text-(--text-subtle)">
                    [{entry.timestamp}]{' '}
                  </span>
                  <span className={getLogHighlightClass(entry.highlight)}>
                    {entry.message}
                  </span>
                </p>
              ))}
            </>
          ) : (
            renderChatContent()
          )}
        </div>
        {showComposer && isChatTab && onSendMessage ? (
          <div className="mt-3 border-t border-(--border-main) pt-3">
            <div className="flex w-full min-w-0 items-stretch gap-2">
              <input
                type="text"
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={t('gameBattle.chatInputPlaceholder')}
                disabled={isChatDisabled}
                maxLength={280}
                className="ui-input min-w-0 flex-1 basis-0 rounded-sm px-3 py-2 font-mono text-[11px] outline-none transition-colors placeholder:text-(--text-muted) disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isChatDisabled || draftMessage.trim().length === 0}
                className="shrink-0 cursor-pointer self-center rounded-sm border border-[rgba(117,235,255,0.68)] bg-[rgba(117,235,255,0.12)] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-(--accent-secondary) transition-colors hover:bg-[rgba(117,235,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('gameBattle.chatSend')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
