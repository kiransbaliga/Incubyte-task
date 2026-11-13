'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Selector } from '@astryxdesign/core/Selector';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { BentoDashboard } from '../components/BentoDashboard';
import { FilterBar } from '../components/FilterBar';
import { EmployeeGrid } from '../components/EmployeeGrid';
import { AnalyticsView } from '../components/AnalyticsView';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { AskAcmePaySidePanel } from '../components/AskAcmePaySidePanel';
import { OnboardingTour } from '../components/OnboardingTour';
import {
  getEmployees,
  getStats,
  getAnalytics,
  getFxRates,
  createEmployee,
  updateEmployee,
} from '../lib/api';
import type { Employee, EmployeeFilters } from '../lib/types';
import { useAppTheme, type AppThemeName } from './providers';
import { Building2, Compass, SidebarClose, SidebarOpen, Sun, Moon } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'stone', label: 'Stone (Executive Slate)' },
  { value: 'neutral', label: 'Neutral (Quiet Grays)' },
  { value: 'chocolate', label: 'Chocolate (Warm Editorial)' },
  { value: 'matcha', label: 'Matcha (Organic Forest)' },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const { themeName, setThemeName, themeMode, setThemeMode } = useAppTheme();

  // Active sub-view: 'grid' or 'hierarchy'
  const [activeView, setActiveView] = useState<'grid' | 'hierarchy'>('grid');

  // Side Panel open state (ALWAYS OPEN by default)
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  // Onboarding tour state
  const [isTourOpen, setIsTourOpen] = useState(false);

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

  // Check if tour should run on first visit
  useEffect(() => {
    try {
      const tourDone = localStorage.getItem('acme_onboarding_completed');
      if (!tourDone) {
        const timer = setTimeout(() => setIsTourOpen(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

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

  const ratesMap: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = { USD: 1.0 };
    if (fxRatesQuery.data) {
      fxRatesQuery.data.forEach((item) => {
        map[item.currencyCode] = parseFloat(item.rateToUsd) || 1.0;
      });
    }
    return map;
  }, [fxRatesQuery.data]);

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
                  subheading="Global Workforce Intelligence • Bento Architecture"
                />
              </HStack>
            }
            endContent={
              <HStack gap={2} align="center">
                {/* Guided Tour Trigger */}
                <Button
                  variant="ghost"
                  size="md"
                  label="Guided Tour"
                  clickAction={() => setIsTourOpen(true)}
                />

                {/* Theme Selector */}
                <Selector
                  label="Theme"
                  options={THEME_OPTIONS}
                  value={themeName}
                  onChange={(val) => setThemeName(val as AppThemeName)}
                  width={180}
                />

                {/* Dark/Light Mode Toggle */}
                <Button
                  variant="ghost"
                  size="md"
                  label={themeMode === 'dark' ? 'Light' : 'Dark'}
                  clickAction={toggleMode}
                />

                {/* Side Panel Dock Toggle */}
                <Button
                  variant="secondary"
                  size="md"
                  label={isSidePanelOpen ? 'Hide Copilot' : 'Show Copilot'}
                  clickAction={() => setIsSidePanelOpen((prev) => !prev)}
                />

                {/* Add Employee */}
                <Button
                  variant="primary"
                  size="md"
                  label="+ Add Employee"
                  clickAction={handleAddEmployee}
                />
              </HStack>
            }
          />
        }
        content={
          <LayoutContent padding={4} isScrollable={false}>
            {/* Split Screen Container: Bento Dashboard + Always Open AI Side Panel */}
            <div className="split-layout-container">
              {/* Main Area: Bento Grid & Data Explorer */}
              <div className="split-layout-main">
                {/* Executive Bento Grid */}
                <BentoDashboard
                  stats={statsQuery.data}
                  analytics={analyticsQuery.data}
                  rates={ratesMap}
                  selectedDepartment={department}
                  selectedCountry={country}
                  onSelectDepartment={(dept) => {
                    setDepartment(dept);
                    setPage(1);
                  }}
                  onSelectCountry={(ctry) => {
                    setCountry(ctry);
                    setPage(1);
                  }}
                />

                {/* View Switcher Controls */}
                <HStack justify="between" align="center" width="100%">
                  <SegmentedControl
                    value={activeView}
                    onChange={(val) => setActiveView(val as 'grid' | 'hierarchy')}
                    label="Workspace View Mode"
                  >
                    <SegmentedControlItem
                      value="grid"
                      label="Employee Compensation Grid (10,000 Personnel)"
                    />
                    <SegmentedControlItem
                      value="hierarchy"
                      label="Deep Career Hierarchy & Level Distributions (L1-L6)"
                    />
                  </SegmentedControl>

                  <HStack gap={2} align="center">
                    <Badge variant="blue" label="10k Live Records" />
                    <Badge variant="success" label="PostgreSQL 16 Read-Only Replica" />
                  </HStack>
                </HStack>

                {/* Primary Data Grid */}
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

                {/* Secondary Deep Analytics & Hierarchy View */}
                {activeView === 'hierarchy' && (
                  <AnalyticsView
                    analytics={analyticsQuery.data}
                    isLoading={analyticsQuery.isLoading}
                  />
                )}
              </div>

              {/* Persistent AI Assistant Side Panel (Always Open) */}
              {isSidePanelOpen && (
                <div className="split-layout-side-panel">
                  <AskAcmePaySidePanel
                    onToggleCollapse={() => setIsSidePanelOpen(false)}
                  />
                </div>
              )}
            </div>
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

      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </>
  );
}
