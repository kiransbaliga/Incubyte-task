'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Card } from '@astryxdesign/core/Card';
import { KpiStrip } from '../components/KpiStrip';
import { FilterBar } from '../components/FilterBar';
import { EmployeeGrid } from '../components/EmployeeGrid';
import { AnalyticsView } from '../components/AnalyticsView';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { AskAcmePay } from '../components/AskAcmePay';
import {
  getEmployees,
  getStats,
  getAnalytics,
  getFxRates,
  createEmployee,
  updateEmployee,
} from '../lib/api';
import type { Employee, EmployeeFilters } from '../lib/types';
import { useAppTheme, type AppThemeName, type AppThemeMode } from './providers';
import { Building2, Sparkles, Plus, Users, BarChart3, Sun, Moon, Palette } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'stone', label: 'Stone (Executive Slate)' },
  { value: 'neutral', label: 'Neutral (Quiet Grays)' },
  { value: 'chocolate', label: 'Chocolate (Warm Editorial)' },
  { value: 'matcha', label: 'Matcha (Organic Forest)' },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const { themeName, setThemeName, themeMode, setThemeMode } = useAppTheme();

  // Active view: 'grid' or 'analytics'
  const [activeView, setActiveView] = useState<'grid' | 'analytics'>('grid');

  // Filters state
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [country, setCountry] = useState('all');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Drawer states
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const activeFilters: EmployeeFilters = {
    page,
    pageSize,
    search: search.trim() || undefined,
    department: department !== 'all' ? department : undefined,
    country: country !== 'all' ? country : undefined,
    level: level !== 'all' ? level : undefined,
    status: status !== 'all' ? status : undefined,
  };

  // Queries
  const statsQuery = useQuery({
    queryKey: ['stats', activeFilters.country, activeFilters.department, activeFilters.level, activeFilters.status, activeFilters.search],
    queryFn: () => getStats(activeFilters),
  });

  const employeesQuery = useQuery({
    queryKey: ['employees', page, pageSize, activeFilters.country, activeFilters.department, activeFilters.level, activeFilters.status, activeFilters.search],
    queryFn: () => getEmployees(activeFilters),
  });

  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: () => getAnalytics(),
  });

  const fxRatesQuery = useQuery({
    queryKey: ['fx-rates'],
    queryFn: () => getFxRates(),
  });

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('all');
    setCountry('all');
    setLevel('all');
    setStatus('all');
    setPage(1);
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsEmployeeDrawerOpen(true);
  };

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsEmployeeDrawerOpen(true);
  };

  const handleSaveEmployee = async (data: Partial<Employee>, id?: string) => {
    if (id) {
      await updateEmployee(id, data);
    } else {
      await createEmployee(data);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['employees'] }),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    ]);
  };

  const toggleMode = () => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <Layout
        height="auto"
        header={
          <TopNav
            label="ACME Compensation Navigation"
            heading={
              <HStack gap={2} align="center">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: 'var(--color-primary-main, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <Building2 size={20} />
                </div>
                <TopNavHeading
                  heading="ACME Compensation Hub"
                  subheading="Global Workforce Intelligence & Currency Normalization Engine"
                />
              </HStack>
            }
            endContent={
              <HStack gap={2} align="center">
                {/* Theme Selector */}
                <Selector
                  label="Theme"
                  options={THEME_OPTIONS}
                  value={themeName}
                  onChange={(val) => setThemeName(val as AppThemeName)}
                  width={190}
                />

                {/* Dark/Light Mode Toggle */}
                <Button
                  variant="ghost"
                  size="md"
                  label={themeMode === 'dark' ? 'Light' : 'Dark'}
                  clickAction={toggleMode}
                />

                {/* Ask ACME Pay AI Assistant */}
                <Button
                  variant="secondary"
                  label="Ask ACME Pay"
                  clickAction={() => setIsAiDrawerOpen(true)}
                />

                {/* Add Employee */}
                <Button
                  variant="primary"
                  label="+ Add Employee"
                  clickAction={handleAddEmployee}
                />
              </HStack>
            }
          />
        }
        content={
          <LayoutContent padding={4} isScrollable={false}>
            <VStack gap={4} width="100%">
              {/* Executive KPI Strip */}
              <KpiStrip
                stats={statsQuery.data}
                isLoading={statsQuery.isLoading}
              />

              {/* View Switcher Controls */}
              <HStack justify="between" align="center" width="100%">
                <SegmentedControl
                  value={activeView}
                  onChange={(val) => setActiveView(val as 'grid' | 'analytics')}
                  label="Workspace View Mode"
                >
                  <SegmentedControlItem
                    value="grid"
                    label="Employee Compensation Grid (10,000)"
                  />
                  <SegmentedControlItem
                    value="analytics"
                    label="Executive Insights & Org Distributions"
                  />
                </SegmentedControl>

                <HStack gap={2} align="center">
                  <Badge variant="blue" label="10k Live Records" />
                  <Badge variant="success" label="PostgreSQL 16 Read-Only Isolated" />
                </HStack>
              </HStack>

              {/* VIEW 1: Interactive Compensation Grid */}
              {activeView === 'grid' && (
                <VStack gap={3} width="100%">
                  <FilterBar
                    search={search}
                    onSearchChange={(val) => {
                      setSearch(val);
                      setPage(1);
                    }}
                    department={department}
                    onDepartmentChange={(val) => {
                      setDepartment(val);
                      setPage(1);
                    }}
                    country={country}
                    onCountryChange={(val) => {
                      setCountry(val);
                      setPage(1);
                    }}
                    level={level}
                    onLevelChange={(val) => {
                      setLevel(val);
                      setPage(1);
                    }}
                    status={status}
                    onStatusChange={(val) => {
                      setStatus(val);
                      setPage(1);
                    }}
                    onReset={handleResetFilters}
                  />

                  <EmployeeGrid
                    employees={employeesQuery.data?.data || []}
                    isLoading={employeesQuery.isLoading}
                    page={page}
                    pageSize={pageSize}
                    totalCount={employeesQuery.data?.pagination?.totalCount || 0}
                    totalPages={employeesQuery.data?.pagination?.totalPages || 1}
                    onPageChange={setPage}
                    onEdit={handleEditEmployee}
                  />
                </VStack>
              )}

              {/* VIEW 2: Executive Analytics & Distributions */}
              {activeView === 'analytics' && (
                <AnalyticsView
                  analytics={analyticsQuery.data}
                  isLoading={analyticsQuery.isLoading}
                />
              )}
            </VStack>
          </LayoutContent>
        }
      />

      <EmployeeDrawer
        isOpen={isEmployeeDrawerOpen}
        onOpenChange={setIsEmployeeDrawerOpen}
        employee={selectedEmployee}
        fxRates={fxRatesQuery.data}
        onSave={handleSaveEmployee}
      />

      <AskAcmePay
        isOpen={isAiDrawerOpen}
        onOpenChange={setIsAiDrawerOpen}
      />
    </>
  );
}
