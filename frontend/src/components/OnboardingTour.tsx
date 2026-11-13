'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import {
  LayoutDashboard,
  Filter,
  ArrowRightLeft,
  Bot,
  Palette,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TourStep {
  title: string;
  badge: string;
  icon: React.ReactNode;
  description: string;
  highlightItems: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Executive Bento Intelligence Grid',
    badge: 'Step 1 of 5',
    icon: <LayoutDashboard size={28} className="text-blue-500" />,
    description:
      'Welcome to ACME Compensation Hub! The Bento-style dashboard delivers an executive-grade view of 10,000 global personnel, $980M+ annualized payroll spend, and median compensation benchmarks across 6 international entities.',
    highlightItems: [
      'Real-time headcount & active status breakdown (99.4% active)',
      'Total annualized payroll spend with corporate FX normalization',
      'P50 Global compensation benchmark at $85,225 USD',
      'High-performance PostgreSQL 16 read-only replica queries',
    ],
  },
  {
    title: 'Interactive Department & Regional Bento Filtering',
    badge: 'Step 2 of 5',
    icon: <Filter size={28} className="text-purple-500" />,
    description:
      'Every card in the Bento grid is directly interactive. Click on any Department card or Country benchmark to instantly filter the live 10,000-record workforce grid below.',
    highlightItems: [
      'Click "Engineering" (35.6% spend) to filter exclusively to engineering roles',
      'Click any country card (e.g. 🇩🇪 Germany or 🇮🇳 India) for country-specific views',
      'Visual active borders show your current active bento filter',
      'Combine with text search, seniority level, and status dropdowns',
    ],
  },
  {
    title: 'Real-Time FX Normalization & Quick Calculator',
    badge: 'Step 3 of 5',
    icon: <ArrowRightLeft size={28} className="text-emerald-500" />,
    description:
      'ACME Pay operates across 6 currencies (USD, EUR, GBP, INR, SGD, JPY). The live FX Bento widget lets you convert any compensation amount to normalized USD in real time using corporate planning rates.',
    highlightItems: [
      'Interactive currency conversion calculator in the top-right Bento card',
      'Live exchange rate ticker for EUR (€0.92), GBP (£0.79), INR (₹83.25), etc.',
      'Dual-currency display across all table records: local pay + normalized USD',
      'Sub-20ms instant calculation with no server roundtrip',
    ],
  },
  {
    title: 'Persistent AI Compensation Copilot (Always Open)',
    badge: 'Step 4 of 5',
    icon: <Bot size={28} className="text-indigo-500" />,
    description:
      'The AI Compensation Copilot on the right panel is always docked and ready to answer complex workforce questions via natural language Text-to-SQL.',
    highlightItems: [
      'Powered by Groq Cloud inference (openai/gpt-oss-120b)',
      '3-layer security guardrail with AST parser and read-only enforcement',
      'Single-employee spotlight card: ask "Magnus Davis salary" for an executive profile',
      'Audit drawer: inspect generated SQL and query execution latency (sub-20ms)',
    ],
  },
  {
    title: 'Astryx Multi-Theme & Dark Mode Styling',
    badge: 'Step 5 of 5',
    icon: <Palette size={28} className="text-amber-500" />,
    description:
      'Personalize the workspace using official Astryx themes and full Light/Dark mode with seamless token recalculation.',
    highlightItems: [
      'Stone (Default): Montserrat headings & Figtree body with slate accents',
      'Neutral: Minimalist monochrome palette for high-contrast enterprise viewing',
      'Chocolate: Warm caramel tones with editorial serif headings (Fraunces)',
      'Matcha: Organic forest palette with DM Sans body typography',
    ],
  },
];

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

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

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleFinish = () => {
    try {
      localStorage.setItem('acme_onboarding_completed', 'true');
    } catch {}
    onClose();
  };

  return (
    <div className="tour-overlay-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="tour-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <Card padding={5}>
          <VStack gap={4}>
            {/* Header with step badge and close button */}
            <HStack justify="between" align="center">
              <HStack gap={2} align="center">
                <Badge variant="blue" label={step.badge} />
                <Badge variant="neutral" label="Interactive Product Tour" />
              </HStack>
              <Button
                variant="ghost"
                size="sm"
                label="Skip"
                clickAction={handleFinish}
              />
            </HStack>

            {/* Step Content */}
            <HStack gap={3} align="start">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '52px',
                  height: '52px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.05))',
                  border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.1))',
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <VStack gap={1}>
                <Heading level={3}>{step.title}</Heading>
                <Text color="secondary" type="body">
                  {step.description}
                </Text>
              </VStack>
            </HStack>

            {/* Feature Highlights */}
            <Card variant="muted" padding={3}>
              <VStack gap={2}>
                <Text weight="semibold" type="supporting" color="secondary">
                  KEY CAPABILITIES
                </Text>
                {step.highlightItems.map((item, idx) => (
                  <HStack key={idx} gap={2} align="center">
                    <CheckCircle2 size={16} className="text-emerald-500" style={{ flexShrink: 0 }} />
                    <Text type="body">{item}</Text>
                  </HStack>
                ))}
              </VStack>
            </Card>

            {/* Step Indicators */}
            <HStack justify="center" gap={1.5} align="center">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  style={{
                    width: idx === currentStep ? '28px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    backgroundColor:
                      idx === currentStep
                        ? 'var(--color-primary-main, #3b82f6)'
                        : 'var(--color-border-strong, #cbd5e1)',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                  title={`Go to step ${idx + 1}`}
                />
              ))}
            </HStack>

            {/* Navigation Footer */}
            <HStack justify="between" align="center">
              <Button
                variant="secondary"
                size="md"
                label="Previous"
                isDisabled={isFirst}
                clickAction={() => setCurrentStep((s) => s - 1)}
              />

              {isLast ? (
                <Button
                  variant="primary"
                  size="md"
                  label="Get Started & Explore"
                  clickAction={handleFinish}
                />
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  label="Next Step"
                  clickAction={() => setCurrentStep((s) => s + 1)}
                />
              )}
            </HStack>
          </VStack>
        </Card>
      </div>
    </div>
  );
}
