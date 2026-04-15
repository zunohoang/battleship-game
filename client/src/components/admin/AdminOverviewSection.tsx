import type { AdminOverview } from '@/types/admin';
import { AdminStatusBadge } from './adminUi';

export function AdminOverviewSection({ overview }: { overview: AdminOverview }) {
  return (
    <div className='space-y-4'>
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {[
          ['Online Users', overview.onlineUsers],
          ['Active Rooms', overview.activeRooms],
          ['In-game Matches', overview.inGameMatches],
          ['New Posts (24h)', overview.newPosts24h],
          ['Pending Reports', overview.pendingReports],
          ['Active Bans', overview.activeBans],
        ].map(([label, value]) => (
          <div key={String(label)} className='ui-subpanel rounded-sm px-3 py-3'>
            <p className='ui-data-label'>{label}</p>
            <p className='mt-1 font-mono text-xl font-bold'>{value}</p>
          </div>
        ))}
      </div>

      <div className='ui-subpanel rounded-sm p-4'>
        <p className='ui-panel-title'>System Alerts</p>
        <div className='mt-2 space-y-2'>
          {overview.alerts.map((alert) => (
            <p key={alert.id} className='text-sm'>
              [<AdminStatusBadge value={alert.level} />] {alert.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
