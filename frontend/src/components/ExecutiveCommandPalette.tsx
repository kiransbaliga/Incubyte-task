'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Filter, Compass, ArrowRight, CornerDownLeft } from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'ai' | 'filter' | 'navigation';
  title: string;
  subtitle: string;
  action: () => void;
  badge?: string;
}

interface ExecutiveCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onSelectFilterPreset: (filters: { department?: string; country?: string; status?: string; salaryMin?: number }) => void;
  onTriggerAiQuery: (question: string) => void;
}

export function ExecutiveCommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onSelectFilterPreset,
  onTriggerAiQuery,
}: ExecutiveCommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build command items
  const commands: CommandItem[] = [
    // AI Questions
    {
      id: 'ai-top-earners',
      category: 'ai',
      title: 'Top 10 highest paid in Engineering',
      subtitle: 'Ask AI Copilot to run indexed ranking query',
      badge: 'AI Query',
      action: () => {
        onTriggerAiQuery('Top 10 highest paid in Engineering');
        onClose();
      },
    },
    {
      id: 'ai-magnus',
      category: 'ai',
      title: 'What is the salary of Magnus Davis?',
      subtitle: 'Retrieve base pay, target bonus, and tier for Magnus Davis',
      badge: 'AI Query',
      action: () => {
        onTriggerAiQuery('What is the salary of Magnus Davis?');
        onClose();
      },
    },
    {
      id: 'ai-compare-de-us',
      category: 'ai',
      title: 'Compare median pay for L4 in Germany vs US',
      subtitle: 'Normalized USD compensation comparison across entities',
      badge: 'AI Query',
      action: () => {
        onTriggerAiQuery('Compare median pay for L4 in Germany vs US');
        onClose();
      },
    },
    {
      id: 'ai-dept-spend',
      category: 'ai',
      title: 'Show average base salary and headcount by department',
      subtitle: 'Aggregate organizational averages and distributions',
      badge: 'AI Query',
      action: () => {
        onTriggerAiQuery('Show average base salary and headcount grouped by department');
        onClose();
      },
    },
    {
      id: 'ai-cost-gate-test',
      category: 'ai',
      title: 'Calculate pairwise salary disparity matrix for all employee pairs',
      subtitle: 'Demonstrates pre-flight EXPLAIN cost gate circuit breaker (exceeds budget)',
      badge: 'Circuit Breaker',
      action: () => {
        onTriggerAiQuery('Calculate pairwise salary disparity matrix for all employee pairs');
        onClose();
      },
    },

    // Filter Presets
    {
      id: 'filter-active',
      category: 'filter',
      title: 'Filter: Active Personnel Only (9,940)',
      subtitle: 'Slice workforce table by status = active',
      badge: 'Preset',
      action: () => {
        onSelectFilterPreset({ status: 'active', department: 'all', country: 'all' });
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'filter-eng',
      category: 'filter',
      title: 'Filter: Engineering Department',
      subtitle: 'Show all global Engineering personnel',
      badge: 'Preset',
      action: () => {
        onSelectFilterPreset({ department: 'Engineering', status: 'all' });
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'filter-de',
      category: 'filter',
      title: 'Filter: Germany (DE) Personnel',
      subtitle: 'Show all personnel based in Germany with EUR normalization',
      badge: 'Preset',
      action: () => {
        onSelectFilterPreset({ country: 'DE', department: 'all' });
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'filter-high-earners',
      category: 'filter',
      title: 'Filter: High Earners (> $200k USD)',
      subtitle: 'Show employees with base salary >= $200,000 USD',
      badge: 'Preset',
      action: () => {
        onSelectFilterPreset({ salaryMin: 200000, department: 'all', country: 'all' });
        onNavigate('dashboard');
        onClose();
      },
    },

    // Navigation
    {
      id: 'nav-dashboard',
      category: 'navigation',
      title: 'Go to Workforce Compensation Dashboard',
      subtitle: 'Overview cards and 10,000 employee records',
      badge: 'Navigation',
      action: () => {
        onNavigate('dashboard');
        onClose();
      },
    },
    {
      id: 'nav-chat',
      category: 'navigation',
      title: 'Go to AI Compensation Copilot Chat',
      subtitle: 'Interactive Text-to-SQL conversational terminal',
      badge: 'Navigation',
      action: () => {
        onNavigate('chat');
        onClose();
      },
    },
    {
      id: 'nav-analytics',
      category: 'navigation',
      title: 'Go to Executive Analytics & Distributions',
      subtitle: 'Headcount and spend distribution breakdown',
      badge: 'Navigation',
      action: () => {
        onNavigate('analytics');
        onClose();
      },
    },
    {
      id: 'nav-fx',
      category: 'navigation',
      title: 'Go to FX Normalization & Planning Rates',
      subtitle: 'Corporate exchange rates (USD, EUR, GBP, INR, SGD, JPY)',
      badge: 'Navigation',
      action: () => {
        onNavigate('fx');
        onClose();
      },
    },
  ];

  // Filter commands by user input
  const filteredCommands = commands.filter((cmd) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cmd.title.toLowerCase().includes(q) || cmd.subtitle.toLowerCase().includes(q);
  });

  // Handle keyboard navigation (Arrow Up, Down, Enter, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            gap: '12px',
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, ask an AI question, or filter..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              fontFamily: 'inherit',
              color: '#0f172a',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results List */}
        <div style={{ overflowY: 'auto', padding: '8px' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              No matching commands or queries found.
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isSelected ? '#f8fafc' : 'transparent',
                    border: isSelected ? '1px solid #e2e8f0' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          item.category === 'ai'
                            ? '#ecfdf5'
                            : item.category === 'filter'
                            ? '#eff6ff'
                            : '#f8fafc',
                        color:
                          item.category === 'ai'
                            ? '#059669'
                            : item.category === 'filter'
                            ? '#2563eb'
                            : '#64748b',
                      }}
                    >
                      {item.category === 'ai' && <Sparkles size={15} />}
                      {item.category === 'filter' && <Filter size={15} />}
                      {item.category === 'navigation' && <Compass size={15} />}
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background:
                            item.category === 'ai'
                              ? '#dcfce7'
                              : item.category === 'filter'
                              ? '#dbeafe'
                              : '#f1f5f9',
                          color:
                            item.category === 'ai'
                              ? '#15803d'
                              : item.category === 'filter'
                              ? '#1d4ed8'
                              : '#475569',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && <CornerDownLeft size={13} color="#94a3b8" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span>↑ ↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span style={{ fontWeight: 600, color: '#334155' }}>ACME Quick Command</span>
        </div>
      </div>
    </div>
  );
}
