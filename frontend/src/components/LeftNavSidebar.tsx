'use client';

import React from 'react';
import { Badge } from '@astryxdesign/core/Badge';
import {
  Home,
  Bot,
  BarChart3,
  ArrowRightLeft,
  Compass,
  ChevronDown,
  Building2,
  Database,
} from 'lucide-react';

export type ActiveNavPage = 'dashboard' | 'chat' | 'analytics' | 'fx';

interface LeftNavSidebarProps {
  activePage: ActiveNavPage;
  onSelectPage: (page: ActiveNavPage) => void;
  onOpenTour: () => void;
  activeSubFilter?: string;
  onSelectSubFilter?: (filter: string) => void;
}

export function LeftNavSidebar({
  activePage,
  onSelectPage,
  onOpenTour,
  activeSubFilter = 'all',
  onSelectSubFilter,
}: LeftNavSidebarProps) {
  return (
    <aside className="left-sidebar" data-tour="left-sidebar">
      {/* Top Section: Logo & Nav Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 6px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#334155', // Slate/Neutral Gray
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 6px rgba(51, 65, 85, 0.25)',
              fontWeight: 800,
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px', color: 'inherit' }}>
              Acme Inc
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)' }}>
              Compensation Hub
            </div>
          </div>
        </div>

        {/* Navigation Items Group */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Item 1: Home / Dashboard */}
          <div data-tour="nav-compensation">
            <div
              className={`nav-link ${activePage === 'dashboard' ? 'is-active' : ''}`}
              onClick={() => onSelectPage('dashboard')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Home size={18} />
                <span>Compensation</span>
              </div>
              <ChevronDown
                size={14}
                style={{
                  transform: activePage === 'dashboard' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: 'var(--color-text-secondary, #64748b)',
                }}
              />
            </div>

            {/* Tree Sub-items */}
            {activePage === 'dashboard' && (
              <div className="nav-submenu">
                <div
                  className={`nav-subitem ${activeSubFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => onSelectSubFilter && onSelectSubFilter('all')}
                >
                  All 10,000 Employees
                </div>
                <div
                  className={`nav-subitem ${activeSubFilter === 'active' ? 'is-active' : ''}`}
                  onClick={() => onSelectSubFilter && onSelectSubFilter('active')}
                >
                  Active Personnel (99.4%)
                </div>
              </div>
            )}
          </div>

          {/* Item 2: Dedicated Specialized AI Chat Page */}
          <div
            data-tour="nav-ai-chat"
            className={`nav-link ${activePage === 'chat' ? 'is-active' : ''}`}
            onClick={() => onSelectPage('chat')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={18} />
              <span>Ask ACME Pay</span>
            </div>
            <Badge variant="blue" label="AI Copilot" />
          </div>

          {/* Item 3: Executive Analytics */}
          <div
            className={`nav-link ${activePage === 'analytics' ? 'is-active' : ''}`}
            onClick={() => onSelectPage('analytics')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={18} />
              <span>Executive Analytics</span>
            </div>
          </div>

          {/* Item 4: FX & Currencies */}
          <div
            className={`nav-link ${activePage === 'fx' ? 'is-active' : ''}`}
            onClick={() => onSelectPage('fx')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowRightLeft size={18} />
              <span>FX Normalization</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #64748b)' }}>
              6 Pegs
            </span>
          </div>

          {/* Item 5: Product Tour */}
          <div
            data-tour="nav-guided-tour"
            className="nav-link"
            onClick={onOpenTour}
            style={{ marginTop: '4px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={18} />
              <span>Guided Tour</span>
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Section: Database Connection Status */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-subtle, #e2e8f0)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} color="#64748b" />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary, #64748b)' }}>
            PostgreSQL 16
          </span>
        </div>
        <Badge variant="neutral" label="Connected" />
      </div>
    </aside>
  );
}
