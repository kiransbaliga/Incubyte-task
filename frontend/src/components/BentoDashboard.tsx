'use client';

import React from 'react';
import { BentoExecutivePulse } from './BentoExecutivePulse';
import { BentoFxConverter } from './BentoFxConverter';
import { BentoDepartmentMatrix } from './BentoDepartmentMatrix';
import { BentoRegionalBenchmarks } from './BentoRegionalBenchmarks';
import type { StatsResponse, AnalyticsResponse } from '../lib/types';

interface BentoDashboardProps {
  stats?: StatsResponse;
  analytics?: AnalyticsResponse;
  rates?: Record<string, number>;
  selectedDepartment?: string;
  selectedCountry?: string;
  onSelectDepartment: (dept: string) => void;
  onSelectCountry: (country: string) => void;
}

export function BentoDashboard({
  stats,
  analytics,
  rates,
  selectedDepartment,
  selectedCountry,
  onSelectDepartment,
  onSelectCountry,
}: BentoDashboardProps) {
  return (
    <div className="bento-grid">
      {/* Bento Top Row: Executive Pulse (8 cols) + FX Normalization Converter (4 cols) */}
      <div className="bento-col-8">
        <BentoExecutivePulse stats={stats} analytics={analytics} />
      </div>

      <div className="bento-col-4">
        <BentoFxConverter rates={rates} />
      </div>

      {/* Bento Middle Row: Department Spend Matrix (6 cols) + Regional Benchmarks (6 cols) */}
      <div className="bento-col-6">
        <BentoDepartmentMatrix
          departments={analytics?.departments}
          selectedDepartment={selectedDepartment}
          onSelectDepartment={onSelectDepartment}
        />
      </div>

      <div className="bento-col-6">
        <BentoRegionalBenchmarks
          countries={analytics?.countries}
          selectedCountry={selectedCountry}
          onSelectCountry={onSelectCountry}
        />
      </div>
    </div>
  );
}
