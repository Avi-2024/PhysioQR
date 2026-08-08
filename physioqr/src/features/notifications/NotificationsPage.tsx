import React, { useState } from 'react';
import { Bell, CheckCircle2, ArrowUpRight, Users, Wallet } from 'lucide-react';
import { MOCK_NOTIFICATIONS } from '../../mocks/mockDoctorData';
import { NotificationItem } from '../../types/doctor.types';
import { formatRelativeTime } from '../../lib/formatters';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#17212B' }}>Notifications & System Alerts</h2>
          <p style={{ fontSize: '13.5px', color: '#5D6975', marginTop: '2px' }}>
            Real-time updates regarding patient registrations, commission releases, and bank payouts
          </p>
        </div>

        <button className="btn-outline" onClick={markAllRead}>
          Mark All as Read
        </button>
      </div>

      <div className="card-section" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.map((item) => (
          <div
            key={item.id}
            style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8ED',
              background: item.isRead ? '#FFFFFF' : '#F1FAF8',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem'
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: item.isRead ? '#F6F8FA' : '#DDF3F0', color: '#0F5F5A', display: 'flex', alignItems: 'center', justify: 'center', flexShrink: 0 }}>
              <Bell className="w-4 h-4" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#17212B' }}>{item.title}</h4>
                <span style={{ fontSize: '12px', color: '#84909C' }}>{formatRelativeTime(item.timestamp)}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#5D6975', marginTop: '4px' }}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
