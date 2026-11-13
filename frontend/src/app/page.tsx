'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { VStack } from '@astryxdesign/core/VStack';
import { Layout, LayoutContent } from '@astryxdesign/core/Layout';
import { KpiStrip } from '../components/KpiStrip';
import { FilterBar } from '../components/FilterBar';
import { EmployeeGrid } from '../components/EmployeeGrid';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { AskAcmePay } from '../components/AskAcmePay';
import {
  getEmployees,
  getStats,
  getFxRates,
  createEmployee,
  updateEmployee,
} from '../lib/api';
import type { Employee, EmployeeFilters } from '../lib/types';

export default function HomePage() {
  const queryClient = useQueryClient();

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
    ]);
  };

  return (
    <Layout
      height="auto"
      header={
        <TopNav
          label="ACME Compensation Navigation"
          heading={
            <TopNavHeading
              heading="ACME Compensation Hub"
              subheading="Global Compensation & Workforce Intelligence Platform"
            />
          }
          endContent={
            <HStack gap={2} align="center">
              <Button
                variant="secondary"
                label="Ask ACME Pay"
                onClick={() => setIsAiDrawerOpen(true)}
              />
              <Button
                variant="primary"
                label="+ Add Employee"
                onClick={handleAddEmployee}
              />
            </HStack>
          }
        />
      }
      content={
        <LayoutContent padding={4} isScrollable={false}>
          <VStack gap={4} width="100%">
            <KpiStrip
              stats={statsQuery.data}
              isLoading={statsQuery.isLoading}
            />

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
        </LayoutContent>
      }
    >
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
    </Layout>
  );
}
