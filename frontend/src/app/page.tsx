'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LeftNavSidebar, type ActiveNavPage } from '../components/LeftNavSidebar';
import { CleanDashboardView } from '../components/CleanDashboardView';
import { DedicatedChatView } from '../components/DedicatedChatView';
import { AnalyticsView } from '../components/AnalyticsView';
import { FxRatesView } from '../components/FxRatesView';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
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
import { useAppTheme } from './providers';

export default function HomePage() {
  const queryClient = useQueryClient();
  const { setThemeName } = useAppTheme();

  // Active top-level page: 'dashboard' | 'chat' | 'analytics' | 'fx'
  const [activePage, setActivePage] = useState<ActiveNavPage>('dashboard');

  // Sidebar sub-filter (for tree navigation)
  const [activeSubFilter, setActiveSubFilter] = useState<string>('all');

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

  // Set default theme to Matcha on first visit
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('acme_theme_name');
      if (!savedTheme) {
        setThemeName('matcha');
        localStorage.setItem('acme_theme_name', 'matcha');
      }
    } catch {}
  }, [setThemeName]);

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

  const ratesMap: Record<string, number> = useMemo(() => {
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
    setActiveSubFilter('all');
  };

  const handleSubFilterSelect = (sub: string) => {
    setActiveSubFilter(sub);
    setPage(1);
    if (sub === 'all') {
      setStatus('all');
      setDepartment('all');
      setCountry('all');
    } else if (sub === 'active') {
      setStatus('active');
    }
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

  return (
    <>
      <div className="app-container">
        {/* Left Navigation Sidebar (Reference Design Pattern) */}
        <LeftNavSidebar
          activePage={activePage}
          onSelectPage={setActivePage}
          onOpenTour={() => setIsTourOpen(true)}
          activeSubFilter={activeSubFilter}
          onSelectSubFilter={handleSubFilterSelect}
        />

        {/* Main Stage */}
        <main className="main-stage">
          {/* VIEW 1: Clean Dashboard with Overview Cards & 10,000 Employee Records */}
          {activePage === 'dashboard' && (
            <CleanDashboardView
              stats={statsQuery.data}
              analytics={analyticsQuery.data}
              employees={employeesQuery.data?.data || []}
              isLoadingEmployees={employeesQuery.isLoading}
              page={page}
              pageSize={pageSize}
              totalCount={employeesQuery.data?.pagination?.totalCount || 0}
              totalPages={employeesQuery.data?.pagination?.totalPages || 1}
              queryMeta={employeesQuery.data?.meta}
              onPageChange={setPage}
              onEditEmployee={handleEditEmployee}
              onAddEmployee={handleAddEmployee}
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
              onResetFilters={handleResetFilters}
              onNavigateToFx={() => setActivePage('fx')}
            />
          )}

          {/* VIEW 2: Dedicated Specialized AI Compensation Copilot Chat Page */}
          {activePage === 'chat' && <DedicatedChatView />}

          {/* VIEW 3: Executive Analytics & Org Distributions */}
          {activePage === 'analytics' && (
            <AnalyticsView
              analytics={analyticsQuery.data}
              isLoading={analyticsQuery.isLoading}
            />
          )}

          {/* VIEW 4: FX Normalization & Corporate Planning Rates */}
          {activePage === 'fx' && (
            <FxRatesView
              rates={ratesMap}
              fxList={fxRatesQuery.data}
            />
          )}
        </main>
      </div>

      {/* Edit / Create Employee Slide-Over Drawer */}
      <EmployeeDrawer
        isOpen={isEmployeeDrawerOpen}
        onOpenChange={setIsEmployeeDrawerOpen}
        employee={selectedEmployee}
        fxRates={fxRatesQuery.data}
        onSave={handleSaveEmployee}
      />

      {/* Interactive 5-Step Product Tour */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />
    </>
  );
}
