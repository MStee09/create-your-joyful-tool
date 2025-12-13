import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1 text-sm mb-4">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {index === 0 && items.length > 1 ? (
                <span className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  {item.label}
                </span>
              ) : (
                item.label
              )}
            </button>
          ) : (
            <span className="text-foreground font-medium">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
