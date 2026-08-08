import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex flex-wrap items-center gap-1" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-1">
              {isLast ? (
                <span
                  className="text-sm font-medium text-gray-800 truncate max-w-[200px]"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className={cn(
                        'text-sm text-gray-500 hover:text-primary-600 transition-colors',
                        'truncate max-w-[150px]'
                      )}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-500 truncate max-w-[150px]">
                      {item.label}
                    </span>
                  )}
                  <ChevronRight
                    size={14}
                    className="text-gray-400 shrink-0"
                    aria-hidden="true"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumbs.displayName = 'Breadcrumbs';

export { Breadcrumbs };
export default Breadcrumbs;
