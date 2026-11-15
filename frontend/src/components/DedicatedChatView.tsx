'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Heading } from '@astryxdesign/core/Heading';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Table } from '@astryxdesign/core/Table';
import { askAcmePay } from '../lib/api';
import { formatUsd } from '../lib/formatters';
import type { AIQueryResponse } from '../lib/types';
import {
  Bot,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Send,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  data?: AIQueryResponse;
  error?: string;
}

const PROMPT_CARDS = [
  {
    title: 'Individual Salary Lookup',
    prompt: 'What is the salary of Magnus Davis?',
    description: 'Retrieve base pay, target bonus, and tier for a specific person',
    icon: '👤',
  },
  {
    title: 'Highest Earners Ranking',
    prompt: 'Top 10 highest paid in Engineering',
    description: 'List top earners with normalized USD salary and department level',
    icon: '🏆',
  },
  {
    title: 'Cross-Country Benchmark',
    prompt: 'Compare median pay for L4 in Germany vs US',
    description: 'Compare normalized USD compensation across operating entities',
    icon: '🌐',
  },
  {
    title: 'Department Spend Aggregation',
    prompt: 'Show average base salary and headcount grouped by department',
    description: 'Calculate organizational averages and personnel distributions',
    icon: '📊',
  },
  {
    title: 'Cost Gate Circuit Breaker',
    prompt: 'Calculate pairwise salary disparity matrix for all employee pairs',
    description: 'Triggers pre-flight EXPLAIN cost gate (>5,000 budget) to block Cartesian cross-join',
    icon: '🛡️',
  },
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  DE: '🇩🇪',
  GB: '🇬🇧',
  IN: '🇮🇳',
  SG: '🇸🇬',
  JP: '🇯🇵',
};

interface DedicatedChatViewProps {
  initialPrompt?: string;
}

export function DedicatedChatView({ initialPrompt }: DedicatedChatViewProps = {}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your ACME Compensation Copilot. Ask me anything about global salaries, department spend, headcount, or individual personnel compensation.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  const toggleSql = (msgId: string) => {
    setExpandedSql((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Conversation cleared. How can I help you analyze ACME compensation data today?',
      },
    ]);
  };

  const handleSend = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: trimmed },
    ]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askAcmePay(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: response.answerSummary,
          data: response,
        },
      ]);
    } catch (err: any) {
      const isCostGate = err.message?.toLowerCase().includes('exceeds the maximum') || err.message?.toLowerCase().includes('cost');
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: isCostGate
            ? 'Execution blocked: PostgreSQL planner estimated cost exceeds the safety budget.'
            : 'I was unable to answer this question.',
          error: err.message || 'An error occurred while evaluating query execution safety.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
        <HStack justify="between" align="center">
          <HStack gap={3} align="center">
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(21, 128, 61, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#15803d',
              }}
            >
              <Bot size={24} />
            </div>
            <VStack gap={0.5}>
              <HStack gap={2} align="center">
                <Heading level={2} style={{ margin: 0 }}>
                  Ask ACME Pay Copilot
                </Heading>
                <Badge variant="green" label="Groq OSS-120B" />
                <Badge variant="blue" label="Safe AST SQL" />
              </HStack>
              <Text color="secondary" type="body">
                Natural Language to SQL Compensation Intelligence with Read-Only DB Isolation
              </Text>
            </VStack>
          </HStack>

          <Button
            variant="secondary"
            size="md"
            label="Clear History"
            clickAction={handleClearHistory}
          />
        </HStack>
      </div>

      {/* Suggested Prompt Cards (shown when only welcome message) */}
      {messages.length === 1 && (
        <div style={{ marginBottom: '24px' }}>
          <Text type="supporting" color="secondary" weight="semibold" style={{ marginBottom: '10px', display: 'block' }}>
            RECOMMENDED EXECUTIVE QUESTIONS
          </Text>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {PROMPT_CARDS.map((card, idx) => (
              <div
                key={idx}
                onClick={() => handleSend(card.prompt)}
                style={{
                  backgroundColor: 'var(--color-surface-default, #ffffff)',
                  border: '1px solid var(--color-border-subtle, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#15803d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle, #e2e8f0)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                }}
              >
                <VStack gap={1}>
                  <HStack gap={1.5} align="center">
                    <span style={{ fontSize: '18px' }}>{card.icon}</span>
                    <Text weight="bold" type="body">
                      {card.title}
                    </Text>
                  </HStack>
                  <Text type="body" style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                    "{card.prompt}"
                  </Text>
                  <Text type="supporting" color="secondary" style={{ fontSize: '11px' }}>
                    {card.description}
                  </Text>
                </VStack>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Stream */}
      <div
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          paddingRight: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const singleEmployee =
            !isUser &&
            msg.data?.rows &&
            msg.data.rows.length === 1 &&
            (msg.data.rows[0].full_name || msg.data.rows[0].employee_code);

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%',
              }}
            >
              {/* Sender Pill */}
              <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Text type="supporting" color="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {isUser ? 'You' : 'ACME Pay Copilot'}
                </Text>
                {!isUser && (
                  <Badge
                    variant={msg.error ? 'red' : 'green'}
                    label={msg.error ? 'Circuit Breaker Intercept' : 'Verified AST Read-Only'}
                  />
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                style={{
                  maxWidth: isUser ? '75%' : '100%',
                  width: isUser ? 'auto' : '100%',
                  padding: isUser ? '12px 18px' : '18px 20px',
                  borderRadius: '16px',
                  backgroundColor: isUser
                    ? '#15803d' // Matcha Forest Green for user bubble
                    : 'var(--color-surface-default, #ffffff)',
                  color: isUser ? '#ffffff' : 'inherit',
                  border: isUser
                    ? 'none'
                    : '1px solid var(--color-border-subtle, #e2e8f0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <VStack gap={3}>
                  {/* Natural language summary text */}
                  <Text type="body" style={{ color: isUser ? '#ffffff' : 'inherit', fontSize: '14px', lineHeight: '1.6' }}>
                    {msg.text}
                  </Text>

                  {/* Error Box */}
                  {msg.error && (
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      <HStack gap={1.5} align="start">
                        <span style={{ fontSize: '15px', marginTop: '1px' }}>🛡️</span>
                        <VStack gap={0.5}>
                          <Text weight="bold" style={{ color: '#ef4444', fontSize: '12px' }}>
                            Pre-Flight Cost Gate Protection Active
                          </Text>
                          <Text style={{ color: '#dc2626', fontSize: '12px', lineHeight: '1.5' }}>
                            {msg.error}
                          </Text>
                        </VStack>
                      </HStack>
                    </div>
                  )}

                  {/* Dedicated Single-Employee Spotlight Card (e.g. Magnus Davis) */}
                  {singleEmployee && (
                    <div
                      style={{
                        backgroundColor: 'var(--color-surface-subtle, #f8fafc)',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-border-subtle, #e2e8f0)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      {(() => {
                        const row = msg.data!.rows[0] as Record<string, any>;
                        const name = String(row.full_name || 'Employee');
                        const code = String(row.employee_code || '');
                        const dept = String(row.department || '-');
                        const level = String(row.level || '-');
                        const country = String(row.country || 'US');
                        const flag = COUNTRY_FLAGS[country] || '🌐';
                        const usdSalary = Number(row.base_salary_usd || row.base_salary || 0);
                        const localSalary = Number(row.local_base_salary || row.base_salary_usd || 0);
                        const localCurr = String(row.local_currency || 'USD');

                        return (
                          <VStack gap={3}>
                            <HStack justify="between" align="start">
                              <HStack gap={3} align="center">
                                <Avatar name={name} size="md" />
                                <VStack gap={0.5}>
                                  <Text weight="bold" type="body" style={{ fontSize: '16px' }}>
                                    {name}
                                  </Text>
                                  <HStack gap={1.5} align="center">
                                    <span>{flag}</span>
                                    <Text type="supporting" color="secondary">
                                      {dept} • Level {level}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                              {code && <Badge variant="blue" label={code} />}
                            </HStack>

                            <div
                              style={{
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--color-surface-default, #ffffff)',
                                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <VStack gap={0}>
                                <Text type="supporting" color="secondary">
                                  Normalized Base Salary (USD)
                                </Text>
                                <Text
                                  weight="bold"
                                  hasTabularNumbers
                                  style={{ fontSize: '22px', color: '#15803d' }}
                                >
                                  {formatUsd(usdSalary)}
                                </Text>
                              </VStack>

                              {localCurr !== 'USD' && (
                                <VStack gap={0} align="end">
                                  <Text type="supporting" color="secondary">
                                    Local Compensation
                                  </Text>
                                  <Text weight="bold" hasTabularNumbers style={{ fontSize: '15px' }}>
                                    {localSalary.toLocaleString()} {localCurr}
                                  </Text>
                                </VStack>
                              )}
                            </div>
                          </VStack>
                        );
                      })()}
                    </div>
                  )}

                  {/* Multi-Row Results Table */}
                  {!singleEmployee &&
                    msg.data?.columns &&
                    msg.data.columns.length > 0 &&
                    msg.data.rows &&
                    msg.data.rows.length > 0 && (
                      <div
                        style={{
                          overflowX: 'auto',
                          maxHeight: '380px',
                          backgroundColor: 'var(--color-surface-default, #fff)',
                          borderRadius: '10px',
                          border: '1px solid var(--color-border-subtle, #e2e8f0)',
                        }}
                      >
                        <Table<Record<string, unknown>>
                          data={msg.data.rows}
                          columns={msg.data.columns.map((col) => ({
                            key: col,
                            header: col.replace(/_/g, ' ').toUpperCase(),
                            renderCell: (row) => {
                              const val = row[col];
                              if (typeof val === 'number') {
                                const colLower = col.toLowerCase();
                                const isCurrency =
                                  colLower.includes('salary') ||
                                  colLower.includes('payroll') ||
                                  colLower.includes('bonus') ||
                                  colLower.includes('spend');
                                return (
                                  <Text hasTabularNumbers style={{ fontSize: '13px' }}>
                                    {isCurrency ? formatUsd(val) : val.toLocaleString()}
                                  </Text>
                                );
                              }
                              return <Text style={{ fontSize: '13px' }}>{String(val ?? '-')}</Text>;
                            },
                          }))}
                          density="compact"
                          dividers="grid"
                        />
                      </div>
                    )}

                  {/* AST SQL Audit Collapsible */}
                  {msg.data?.generatedSql && (
                    <VStack gap={1.5}>
                      <button
                        onClick={() => toggleSql(msg.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-secondary, #64748b)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 0',
                          fontWeight: 500,
                          flexWrap: 'wrap',
                        }}
                      >
                        {expandedSql[msg.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{expandedSql[msg.id] ? 'Hide AST SQL Query' : 'Audit Generated SQL'}</span>
                        <span style={{ color: '#15803d', fontWeight: 600 }}>({msg.data.executionTimeMs}ms)</span>
                        {msg.data.cached && (
                          <span style={{
                            background: '#f3e8ff',
                            color: '#7e22ce',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginLeft: '4px',
                          }}>
                            ⚡ Cached LRU
                          </span>
                        )}
                        {msg.data.planCost !== undefined && (
                          <span style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            marginLeft: '4px',
                          }}>
                            🛡️ Plan Cost: {Number(msg.data.planCost).toFixed(1)} / 5,000 budget
                          </span>
                        )}
                      </button>

                      {expandedSql[msg.id] && (
                        <div
                          style={{
                            backgroundColor: 'var(--color-surface-subtle, #f8fafc)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border-subtle, #e2e8f0)',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            overflowX: 'auto',
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginBottom: '8px',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #e2e8f0',
                            fontSize: '11px',
                            color: '#64748b',
                            flexWrap: 'wrap',
                          }}>
                            <span><strong>Engine:</strong> PostgreSQL 16 (Read-Only)</span>
                            <span><strong>Planner Cost:</strong> {msg.data.planCost !== undefined ? Number(msg.data.planCost).toFixed(1) : 'Safe'} (&lt;5,000 budget)</span>
                            <span><strong>Cache Status:</strong> {msg.data.cached ? 'HIT (In-Memory LRU)' : 'MISS (Executed & Cached)'}</span>
                          </div>
                          <code style={{ color: '#0f172a' }}>{msg.data.generatedSql}</code>
                        </div>
                      )}
                    </VStack>
                  )}
                </VStack>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-surface-default, #ffffff)',
              border: '1px solid var(--color-border-subtle, #e2e8f0)',
              width: 'fit-content',
            }}
          >
            <Sparkles size={16} className="animate-spin text-emerald-600" />
            <Text type="body" color="secondary" style={{ fontSize: '13px' }}>
              Groq Cloud LPU inference running 3-layer AST query engine...
            </Text>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface-default, #ffffff)',
          border: '1px solid var(--color-border-subtle, #e2e8f0)',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}
      >
        <HStack gap={2} align="center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                e.preventDefault();
                handleSend(inputValue);
              }
            }}
            placeholder="Ask any compensation question (e.g. Compare median pay for L4 in DE vs US)..."
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--color-border-subtle, #e2e8f0)',
              backgroundColor: 'var(--color-surface-subtle, #f8fafc)',
              color: 'inherit',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <Button
            variant="primary"
            size="md"
            label={isLoading ? 'Running...' : 'Ask Copilot'}
            isDisabled={isLoading || !inputValue.trim()}
            clickAction={() => handleSend(inputValue)}
          />
        </HStack>
      </div>
    </div>
  );
}
