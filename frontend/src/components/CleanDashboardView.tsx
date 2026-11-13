'use client';

import React from 'react';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { FilterBar } from './FilterBar';
import { EmployeeGrid } from './EmployeeGrid';
import { formatUsd } from '../lib/formatters';
import type { Employee, StatsResponse, AnalyticsResponse } from '../lib/types';
import { Plus, ArrowUpRight, Globe, CheckCircle2 } from 'lucide-react';

interface CleanDashboardViewProps {
  stats?: StatsResponse;
  analytics?: AnalyticsResponse;
  employees: Employee[];
  isLoadingEmployees: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEditEmployee: (emp: Employee) => void;
  onAddEmployee: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  country: string;
  onCountryChange: (val: string) => void;
  level: string;
  onLevelChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onResetFilters: () => void;
  onNavigateToFx?: () => void;
}

export function CleanDashboardView({
  stats,
  analytics,
  employees,
  isLoadingEmployees,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onEditEmployee,
  onAddEmployee,
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  country,
  onCountryChange,
  level,
  onLevelChange,
  status,
  onStatusChange,
  onResetFilters,
  onNavigateToFx,
}: CleanDashboardViewProps) {
  const headcount = stats?.totalHeadcount ?? 10000;
  const totalPayroll = stats?.totalPayrollUsd ?? 980978182.55;
  const medianPay = stats?.medianBaseSalaryUsd ?? 85225.5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Period Tabs (Reference Image Pattern) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
              Compensation & Workforce
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #64748b)', margin: '4px 0 0 0' }}>
              Here's overview of your global payroll and 10,000 personnel
            </p>
          </div>

          <HStack gap={2} align="center">
            <div data-tour="add-employee-btn">
              <Button
                variant="primary"
                size="md"
                label="+ Add Employee"
                clickAction={onAddEmployee}
              />
            </div>
          </HStack>
        </div>

        {/* Period / Filter Tabs Group (Exact Reference Image Style) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div className="period-tab-group" data-tour="period-tabs">
            <div
              className={`period-tab-item ${status === 'all' ? 'is-active' : ''}`}
              onClick={() => onStatusChange('all')}
            >
              All 10,000
            </div>
            <div
              className={`period-tab-item ${status === 'active' ? 'is-active' : ''}`}
              onClick={() => onStatusChange('active')}
            >
              Active (99.4%)
            </div>
            <div
              className={`period-tab-item ${status === 'inactive' ? 'is-active' : ''}`}
              onClick={() => onStatusChange('inactive')}
            >
              Inactive
            </div>
            <div
              className={`period-tab-item ${status === 'terminated' ? 'is-active' : ''}`}
              onClick={() => onStatusChange('terminated')}
            >
              Terminated
            </div>
            <div
              className="period-tab-item"
              onClick={onNavigateToFx}
            >
              USD Normalized
            </div>
          </div>

          <HStack gap={1.5} align="center">
            <Badge variant="blue" label="10k Live Records" />
            <Badge variant="green" label="PostgreSQL 16 Read-Only" />
          </HStack>
        </div>
      </div>

      {/* Overview Stat Cards Grid (Inspired Directly by the Reference Image) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Card 1: All Personnel Breakdown (Exact Reference Image Layout) */}
        <div className="clean-stat-card" data-tour="personnel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)' }}>
              All personnel
            </span>
            <span
              onClick={onNavigateToFx}
              style={{
                fontSize: '12px',
                color: '#15803d',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontWeight: 500,
              }}
            >
              See FX rates <ArrowUpRight size={12} />
            </span>
          </div>

          {/* Huge Number */}
          <div style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1px', margin: '4px 0 16px 0', fontFamily: 'inherit' }} data-tabular-nums>
            {headcount.toLocaleString()}
          </div>

          {/* Legend with colored squares (Reference Image) */}
          <div style={{ display: 'flex', gap: '24px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#22c55e', display: 'inline-block' }}></span>
              <span>Active (99.4%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
              <span>Inactive (0.4%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
              <span>Terminated (0.2%)</span>
            </div>
          </div>

          {/* Metric Numbers Underneath Legend */}
          <div style={{ display: 'flex', gap: '48px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px', fontWeight: 700 }} data-tabular-nums>9,940</span>
            <span style={{ fontSize: '20px', fontWeight: 700 }} data-tabular-nums>40</span>
            <span style={{ fontSize: '20px', fontWeight: 700 }} data-tabular-nums>20</span>
          </div>

          {/* Segmented Progress Bar (Reference Image) */}
          <div className="segmented-progress-bar">
            <div style={{ width: '99.4%', backgroundColor: '#22c55e' }} title="Active 99.4%"></div>
            <div style={{ width: '0.4%', backgroundColor: '#3b82f6' }} title="Inactive 0.4%"></div>
            <div style={{ width: '0.2%', backgroundColor: '#ef4444' }} title="Terminated 0.2%"></div>
          </div>
        </div>

        {/* Card 2: Annualized Spend & Allocation */}
        <div className="clean-stat-card" data-tour="spend-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)' }}>
              Annualized payroll spend
            </span>
            <Badge variant="green" label="Normalized USD" />
          </div>

          {/* Huge Number */}
          <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px', color: '#15803d', margin: '4px 0 16px 0' }} data-tabular-nums>
            {formatUsd(totalPayroll)}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
              <span>Engineering (36%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              <span>Sales (20%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary, #64748b)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
              <span>Product (14%)</span>
            </div>
          </div>

          {/* Sub Numbers */}
          <div style={{ display: 'flex', gap: '36px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700 }} data-tabular-nums>$361.4M</span>
            <span style={{ fontSize: '18px', fontWeight: 700 }} data-tabular-nums>$165.2M</span>
            <span style={{ fontSize: '18px', fontWeight: 700 }} data-tabular-nums>$138.2M</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="segmented-progress-bar">
            <div style={{ width: '36%', backgroundColor: '#3b82f6' }} title="Engineering 36%"></div>
            <div style={{ width: '20%', backgroundColor: '#10b981' }} title="Sales 20%"></div>
            <div style={{ width: '14%', backgroundColor: '#f59e0b' }} title="Product 14%"></div>
            <div style={{ width: '30%', backgroundColor: '#a855f7' }} title="Other BUs 30%"></div>
          </div>
        </div>

        {/* Card 3: Median Base Pay & Regional Benchmark */}
        <div className="clean-stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)' }}>
              Median compensation
            </span>
            <Badge variant="cyan" label="P50 Global" />
          </div>

          {/* Huge Number */}
          <div style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1px', margin: '4px 0 16px 0' }} data-tabular-nums>
            {formatUsd(medianPay)}{' '}
            <span style={{ fontSize: '16px', color: 'var(--color-text-secondary, #64748b)', fontWeight: 500 }}>
              / USD
            </span>
          </div>

          {/* Regional Quick Benchmark Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #64748b)', fontWeight: 600 }}>
              REGIONAL ENTITY MEDIANS
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <Badge variant="neutral" label="🇺🇸 US: $110,200" />
              <Badge variant="neutral" label="🇩🇪 DE: $88,400" />
              <Badge variant="neutral" label="🇬🇧 GB: $85,000" />
              <Badge variant="neutral" label="🇸🇬 SG: $78,900" />
              <Badge variant="neutral" label="🇯🇵 JP: $72,100" />
              <Badge variant="neutral" label="🇮🇳 IN: $32,500" />
            </div>
          </div>
        </div>
      </div>

      {/* Workforce Filter Toolbar & 10,000 Live Employee Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
        <div data-tour="filter-toolbar">
          <FilterBar
            search={search}
            onSearchChange={onSearchChange}
            department={department}
            onDepartmentChange={onDepartmentChange}
            country={country}
            onCountryChange={onCountryChange}
            level={level}
            onLevelChange={onLevelChange}
            status={status}
            onStatusChange={onStatusChange}
            onReset={onResetFilters}
          />
        </div>

        <div data-tour="employee-table">
          <EmployeeGrid
            employees={employees}
            isLoading={isLoadingEmployees}
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onEdit={onEditEmployee}
          />
        </div>
      </div>
    </div>
  );
}
