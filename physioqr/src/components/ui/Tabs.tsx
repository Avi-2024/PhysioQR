import React from 'react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Tabs = ({ tabs, activeTab, onChange, className }: TabsProps) => (
  <div
    role="tablist"
    aria-label="Tabs"
    className={cn(
      'flex items-end gap-0 border-b border-gray-200 overflow-x-auto scrollbar-none',
      className
    )}
  >
    {tabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          type="button"
          aria-selected={isActive}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap',
            'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
            isActive
              ? 'text-primary-600 border-b-2 border-primary-600 -mb-px'
              : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none min-w-[20px]',
                isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-500'
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

Tabs.displayName = 'Tabs';

export { Tabs };
export default Tabs;
