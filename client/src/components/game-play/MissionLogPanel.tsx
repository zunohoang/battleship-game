import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, ScrollText, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { MissionLogEntry } from '@/types/game';
import type { ChatMessage } from '@/types/chat';

export interface MissionLogPanelProps {
  title: string;
  entries: MissionLogEntry[];
  chatMessages?: ChatMessage[];
  currentUserId?: string | null;
  onSendMessage?: (content: string) => void;
  resolveChatAuthorLabel?: (senderId: string) => string;
  jumpToChatSignal?: number;
  className?: string;
  logHeightClassName?: string;
  defaultTab?: MissionLogTab;
  mode?: 'tabs' | 'chat-only' | 'logs-only';
}

type MissionLogTab = 'logs' | 'chats';

interface PendingJumpToChat {
  signal: number;
  chatCount: number;
}

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

function formatChatTime(sentAt: string) {
  return new Date(sentAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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
  entries,
  chatMessages = [],
  currentUserId,
  resolveChatAuthorLabel,
  jumpToChatSignal = 0,
  defaultTab = 'logs',
  mode = 'tabs',
}: MissionLogPanelProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<MissionLogTab>(defaultTab);
  const isChatOnly = mode === 'chat-only';
  const isLogsOnly = mode === 'logs-only';
  const isLogsTab = isLogsOnly || (!isChatOnly && activeTab === 'logs');
  const currentTab: MissionLogTab = isChatOnly ? 'chats' : isLogsOnly ? 'logs' : activeTab;
  const panelTitle = isChatOnly
    ? t('gameBattle.chatTitle')
    : isLogsTab
      ? title
      : t('gameBattle.chatTitle');
  const showTabButtons = !isChatOnly && !isLogsOnly;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const logsScrollTopRef = useRef(0);
  const chatsScrollTopRef = useRef(0);
  const chatCountRef = useRef(chatMessages.length);
  const handledJumpSignalRef = useRef(0);
  const pendingJumpRef = useRef<PendingJumpToChat | null>(null);

  // Lưu vị trí scroll khi chuyển tab để có thể khôi phục lại khi quay lại tab đó
  const saveTabScrollTop = useCallback((tab: MissionLogTab) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (tab === 'chats') {
      chatsScrollTopRef.current = container.scrollTop;
      return;
    }

    logsScrollTopRef.current = container.scrollTop;
  }, []);

  // Khôi phục vị trí scroll đã lưu khi người dùng quay lại tab đó
  const restoreTabScrollTop = useCallback((tab: MissionLogTab) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop =
      tab === 'chats' ? chatsScrollTopRef.current : logsScrollTopRef.current;
  }, []);

  // Cuộn xuống cuối khi có tín hiệu mới nhảy đến chat và chưa xử lý tín hiệu đó
  const scrollToBottom = useCallback((targetTab: MissionLogTab) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;

    saveTabScrollTop(targetTab);
  }, [saveTabScrollTop]);

  // Xử lý scroll
  const handleContainerScroll = useCallback(() => {
    saveTabScrollTop(currentTab);
  }, [currentTab, saveTabScrollTop]);

  // Xử lý chuyển tab
  const handleTabChange = useCallback((nextTab: MissionLogTab) => {
    saveTabScrollTop(currentTab);
    setActiveTab(nextTab);
  }, [currentTab, saveTabScrollTop]);

  // Cập nhật số lượng tin nhắn khi messages thay đổi
  useEffect(() => {
    chatCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  // Khôi phục vị trí scroll khi chuyển tab
  useEffect(() => {
    restoreTabScrollTop(currentTab);
  }, [currentTab, restoreTabScrollTop]);

  useEffect(() => {
    if (currentTab !== 'logs') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToBottom('logs');
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    }
  }, [currentTab, entries.length, scrollToBottom])

  // Xử lý nhảy đến chat khi có tín hiệu mới
  useEffect(() => {
    if (
      jumpToChatSignal <= 0 ||
      jumpToChatSignal === handledJumpSignalRef.current
    ) {
      return;
    }

    handledJumpSignalRef.current = jumpToChatSignal;

    pendingJumpRef.current = {
      signal: jumpToChatSignal,
      chatCount: chatCountRef.current,
    };

    let tabFrameId: number | null = null;
    let scrollFrameId: number | null = null;

    if (!isChatOnly) {
      tabFrameId = window.requestAnimationFrame(() => {
        setActiveTab('chats');
        scrollFrameId = window.requestAnimationFrame(() => {
          scrollToBottom('chats');
        });
      });
    } else {
      scrollFrameId = window.requestAnimationFrame(() => {
        scrollToBottom('chats');
      });
    }

    const timeoutId = window.setTimeout(() => {
      if (pendingJumpRef.current?.signal === jumpToChatSignal) {
        pendingJumpRef.current = null;
      }
    }, 5000);

    return () => {
      if (tabFrameId !== null) {
        window.cancelAnimationFrame(tabFrameId);
      }
      if (scrollFrameId !== null) {
        window.cancelAnimationFrame(scrollFrameId);
      }
      window.clearTimeout(timeoutId);
    };
  }, [isChatOnly, jumpToChatSignal, scrollToBottom]);

  useEffect(() => {
    const pendingJump = pendingJumpRef.current;
    if (!pendingJump || pendingJump.signal !== jumpToChatSignal) {
      return;
    }

    if (!isChatOnly && activeTab !== 'chats') {
      return;
    }

    if (chatMessages.length <= pendingJump.chatCount) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollToBottom('chats');
      pendingJumpRef.current = null;
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeTab, chatMessages.length, isChatOnly, jumpToChatSignal, scrollToBottom]);

  const renderChatContent = () => {
    if (chatMessages.length === 0) {
      return (
        <p className='font-mono text-[11px] leading-6'>
          <span className='text-(--text-subtle)'>[SYS] </span>
          <span className='text-(--text-muted)'>
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
      const timeLabel = formatChatTime(message.sentAt);

      return (
        <p key={message.id} className='font-mono text-[11px] leading-6'>
          <span className='text-(--text-subtle)'>[{timeLabel}] </span>
          <span
            className={
              isOwnMessage
                ? 'text-(--accent-secondary)'
                : 'text-(--text-subtle)'
            }
          >
            [{authorLabel}]
          </span>
          <span className='text-(--text-main)'>{message.content}</span>
        </p>
      );
    });
  };

  return (
    <div className='px-3 pt-3 pb-2 sm:px-4 flex items-stretch gap-3'>
      {showTabButtons ? (
        <div className='flex shrink-0 flex-col gap-2'>
          <MissionLogTabButton
            active={activeTab === 'logs'}
            icon={ScrollText}
            label={t('gameBattle.logsTab')}
            onClick={() => handleTabChange('logs')}
          />
          <MissionLogTabButton
            active={activeTab === 'chats'}
            icon={MessageSquare}
            label={t('gameBattle.chatsTab')}
            onClick={() => handleTabChange('chats')}
          />
        </div>
      ) : null}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-3'>
          <p className='font-mono text-[10px] font-black uppercase tracking-[0.28em] text-(--accent-secondary)'>
            {panelTitle}
          </p>
        </div>
        <div
          ref={containerRef}
          onScroll={handleContainerScroll}
          className='themed-scrollbar overflow-y-auto pr-1 h-11 sm:h-30'
        >
          {isLogsTab ? (
            <>
              {entries.map((entry, index) => (
                <p
                  key={`${entry.id}-${index}`}
                  className='font-mono text-[11px] leading-6'
                >
                  <span className='text-(--text-subtle)'>
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
      </div>
    </div>
  );
}
