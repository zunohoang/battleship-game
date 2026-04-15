export const STATUS_BADGE_CLASS: Record<string, string> = {
  waiting: 'text-(--text-subtle)',
  setup: 'text-(--accent-warning)',
  in_game: 'text-(--accent-secondary)',
  finished: 'text-(--accent-success)',
  closed: 'text-(--accent-danger)',
  pending: 'text-(--accent-warning)',
  resolved: 'text-(--accent-success)',
  dismissed: 'text-(--text-subtle)',
  temporary: 'text-(--accent-warning)',
  permanent: 'text-(--accent-danger)',
  not_banned: 'text-(--accent-success)',
  low: 'text-(--text-subtle)',
  medium: 'text-(--accent-warning)',
  high: 'text-(--accent-danger)',
};

export const fmtDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString() : '-';
