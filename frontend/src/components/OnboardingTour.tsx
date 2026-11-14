'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  MousePointerClick,
  ChevronRight,
} from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigatePage?: (page: 'dashboard' | 'chat' | 'analytics' | 'fx') => void;
}

interface TourStep {
  targetSelector: string;
  title: string;
  badge: string;
  description: string;
  actionHint: string;
  placement: 'bottom' | 'right' | 'top' | 'left';
  highlightAction?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="nav-compensation"]',
    title: 'Compensation Dashboard & Tree Navigation',
    badge: 'Step 1 of 6',
    description:
      'This is your primary workspace. The tree view lets you quickly toggle between All 10,000 Employees and Active Personnel (99.4%).',
    actionHint: 'Click to expand or collapse sub-filters anytime.',
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="nav-ai-chat"]',
    title: 'Dedicated "Ask ACME Pay" AI Copilot',
    badge: 'Step 2 of 6',
    description:
      'Click here to access the specialized full-page AI Assistant powered by Groq (openai/gpt-oss-120b) with safe 3-layer read-only AST SQL guardrails.',
    actionHint: 'Ask queries like "What is the salary of Magnus Davis?" for instant executive profiles.',
    placement: 'right',
  },
  {
    targetSelector: '[data-tour="period-tabs"]',
    title: 'Workforce Status & Period Tabs',
    badge: 'Step 3 of 6',
    description:
      'Quickly filter the entire 10,000-record dataset by employment status: All 10,000, Active (99.4%), Inactive, Terminated, or USD Normalized.',
    actionHint: 'Click any tab to instantly slice the workforce without page reload.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="personnel-card"]',
    title: 'Live Personnel Pulse & Multi-Segment Progress Bar',
    badge: 'Step 4 of 6',
    description:
      'Displays total headcount (10,000) with colored indicator squares for Active (99.4% green), Inactive (0.4% blue), and Terminated (0.2% red).',
    actionHint: 'Hover over the segmented bar to inspect headcount distribution.',
    placement: 'bottom',
  },
  {
    targetSelector: '[data-tour="filter-toolbar"]',
    title: 'Workforce Filter Toolbar & Fuzzy Search',
    badge: 'Step 5 of 6',
    description:
      'Type any name, email, or employee code for sub-millisecond GIN trigram search, or filter by Department, Country, Level, and Status.',
    actionHint: 'Filter by Engineering and Germany to view targeted compensation benchmarks.',
    placement: 'top',
  },
  {
    targetSelector: '[data-tour="add-employee-btn"]',
    title: 'Add Employee & Live USD Preview Drawer',
    badge: 'Step 6 of 6',
    description:
      'Open the slide-over drawer to add or edit personnel. As you type a local salary or change currency, the normalized USD amount recalculates in real-time.',
    actionHint: 'Click to create a new record with strict Zod validation.',
    placement: 'left',
  },
];

export function OnboardingTour({ isOpen, onClose, onNavigatePage }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowDimensions, setWindowDimensions] = useState({ width: 1920, height: 1080 });
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
    updateTargetRect();
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
      }
      updateTargetRect();
    };
    const handleScroll = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [updateTargetRect, currentStep]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep((s) => s + 1);
      }
      if (e.key === 'ArrowLeft' && currentStep > 0) {
        setCurrentStep((s) => s - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleFinish = () => {
    try {
      localStorage.setItem('acme_onboarding_completed', 'true');
    } catch {}
    onClose();
  };

  // Generate SVG path with true cutout hole: zero blur, zero dimming on focused element
  const getCutoutPath = () => {
    const w = windowDimensions.width;
    const h = windowDimensions.height;
    if (!targetRect) {
      return `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z`;
    }
    const padding = 6;
    const x = Math.max(0, targetRect.left - padding);
    const y = Math.max(0, targetRect.top - padding);
    const width = Math.min(w - x, targetRect.width + padding * 2);
    const height = Math.min(h - y, targetRect.height + padding * 2);
    const r = 10;

    return (
      `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h} Z ` +
      `M ${x + r} ${y} ` +
      `H ${x + width - r} ` +
      `A ${r} ${r} 0 0 1 ${x + width} ${y + r} ` +
      `V ${y + height - r} ` +
      `A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} ` +
      `H ${x + r} ` +
      `A ${r} ${r} 0 0 1 ${x} ${y + height - r} ` +
      `V ${y + r} ` +
      `A ${r} ${r} 0 0 1 ${x + r} ${y} Z`
    );
  };

  // Calculate popover style based on targetRect & placement
  const getPopoverStyle = (): React.CSSProperties => {
    const isMobile = windowDimensions.width <= 640;

    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '24px',
        left: '16px',
        right: '16px',
        width: 'calc(100vw - 32px)',
        maxWidth: '500px',
        margin: '0 auto',
        zIndex: 10001,
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      };
    }

    if (!targetRect) {
      // Fallback center modal if element not found
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
        width: '420px',
      };
    }

    const popoverWidth = 400;
    const padding = 16;
    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'right':
        top = Math.max(padding, Math.min(window.innerHeight - 300, targetRect.top));
        left = targetRect.right + padding;
        break;
      case 'bottom':
        top = targetRect.bottom + padding;
        left = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, targetRect.left));
        break;
      case 'top':
        top = Math.max(padding, targetRect.top - 260);
        left = Math.max(padding, Math.min(window.innerWidth - popoverWidth - padding, targetRect.left));
        break;
      case 'left':
        top = Math.max(padding, Math.min(window.innerHeight - 300, targetRect.top));
        left = Math.max(padding, targetRect.left - popoverWidth - padding);
        break;
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 10001,
      width: `${popoverWidth}px`,
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    };
  };

  return (
    <>
      {/* SVG True Cutout Overlay: Zero Blur & Zero Dimming on Focused Element */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <path
          d={getCutoutPath()}
          fill="rgba(15, 23, 42, 0.6)"
          fillRule="evenodd"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          onClick={onClose}
        />
      </svg>

      {/* Target Element Spotlight Highlight Ring (Crisp, High-Contrast & Unblurred) */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: '10px',
            border: '2.5px solid #2563eb',
            boxShadow: '0 0 20px 4px rgba(37, 99, 235, 0.55)',
            zIndex: 10000,
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* Anchored Popover Callout Card */}
      <div ref={popoverRef} style={getPopoverStyle()} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px 24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge variant="blue" label={step.badge} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                <MousePointerClick size={14} className="text-blue-500" />
                <span>Element Focus</span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Title & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px' }}>
              {step.title}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
              {step.description}
            </div>
          </div>

          {/* Action Callout Box */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
              {step.actionHint}
            </span>
          </div>

          {/* Step Progress Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '4px 0' }}>
            {TOUR_STEPS.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentStep(idx)}
                style={{
                  width: idx === currentStep ? '20px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: idx === currentStep ? '#2563eb' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Footer Navigation Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <Button
              variant="secondary"
              size="sm"
              label="Previous"
              isDisabled={isFirst}
              clickAction={() => setCurrentStep((s) => s - 1)}
            />

            {isLast ? (
              <Button
                variant="primary"
                size="sm"
                label="Finish Tour"
                clickAction={handleFinish}
              />
            ) : (
              <Button
                variant="primary"
                size="sm"
                label="Next Target →"
                clickAction={() => setCurrentStep((s) => s + 1)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
