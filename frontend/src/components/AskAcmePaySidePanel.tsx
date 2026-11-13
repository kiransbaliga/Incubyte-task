'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Table } from '@astryxdesign/core/Table';
import {
  ChatComposer,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from '@astryxdesign/core/Chat';
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
  User,
  CheckCircle2,
  DollarSign,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface AskAcmePaySidePanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  data?: AIQueryResponse;
  error?: string;
}

const PROMPT_CHIPS = [
  'Magnus Davis salary',
  'Top 5 earners in Engineering',
  'Compare L4 pay DE vs US',
  'Average salary by department',
];

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸',
  DE: '🇩🇪',
  GB: '🇬🇧',
  IN: '🇮🇳',
  SG: '🇸🇬',
  JP: '🇯🇵',
};

export function AskAcmePaySidePanel({
  isCollapsed = false,
  onToggleCollapse,
}: AskAcmePaySidePanelProps) {
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: 'assistant',
          text: 'I was unable to answer this question.',
          error: err.message || 'An error occurred while verifying AST SQL safety guardrails.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        style={{
          width: '50px',
          height: '100%',
          borderRadius: '12px',
          backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.05))',
          border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.1))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          cursor: 'pointer',
          padding: '16px 0',
        }}
        title="Expand ACME Pay AI Copilot"
      >
        <Sparkles size={20} className="text-blue-500" />
        <span
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '1px',
            color: 'var(--color-text-secondary, #64748b)',
          }}
        >
          AI COPILOT (DOCK)
        </span>
      </div>
    );
  }

  return (
    <Card padding={3} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <VStack gap={3} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Panel Header */}
        <div
          style={{
            paddingBottom: '12px',
            borderBottom: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
          }}
        >
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-surface-sunken, rgba(59, 130, 246, 0.1))',
                }}
              >
                <Sparkles size={16} className="text-blue-500" />
              </div>
              <VStack gap={0}>
                <HStack gap={1} align="center">
                  <Text weight="bold" type="body">
                    ACME Pay Copilot
                  </Text>
                  <Badge variant="blue" label="Groq OSS-120b" />
                </HStack>
                <HStack gap={1} align="center">
                  <ShieldCheck size={12} className="text-emerald-500" />
                  <Text type="supporting" color="secondary" style={{ fontSize: '11px' }}>
                    Safe AST Read-Only SQL Engine
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <HStack gap={1} align="center">
              <Button
                variant="ghost"
                size="sm"
                label="Clear"
                clickAction={handleClearHistory}
              />
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="sm"
                  label="Collapse"
                  clickAction={onToggleCollapse}
                />
              )}
            </HStack>
          </HStack>
        </div>

        {/* Suggested Quick Question Chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              disabled={isLoading}
              onClick={() => handleSend(chip)}
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.1))',
                backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.03))',
                color: 'inherit',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              ⚡ {chip}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div
          style={{
            flex: '1 1 0%',
            overflowY: 'auto',
            paddingRight: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
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
                <div style={{ marginBottom: '4px' }}>
                  <Text type="supporting" color="secondary" style={{ fontSize: '11px' }}>
                    {isUser ? 'You' : 'ACME Copilot'}
                  </Text>
                </div>

                {/* Bubble Container */}
                <div
                  style={{
                    maxWidth: '100%',
                    width: isUser ? 'auto' : '100%',
                    padding: isUser ? '8px 14px' : '12px',
                    borderRadius: '12px',
                    backgroundColor: isUser
                      ? 'var(--color-primary-main, #3b82f6)'
                      : 'var(--color-surface-sunken, rgba(0,0,0,0.04))',
                    color: isUser ? '#ffffff' : 'inherit',
                    border: isUser
                      ? 'none'
                      : '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
                  }}
                >
                  <VStack gap={2}>
                    {/* Natural language summary */}
                    <Text type="body" style={{ color: isUser ? '#ffffff' : 'inherit' }}>
                      {msg.text}
                    </Text>

                    {/* Error Box */}
                    {msg.error && (
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                        }}
                      >
                        <Text style={{ color: '#ef4444', fontSize: '12px' }}>{msg.error}</Text>
                      </div>
                    )}

                    {/* Dedicated Single Employee Spotlight Card */}
                    {singleEmployee && (
                      <div
                        style={{
                          backgroundColor: 'var(--color-surface-default, #ffffff)',
                          padding: '12px',
                          borderRadius: '10px',
                          border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.12))',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
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
                            <VStack gap={2}>
                              <HStack justify="between" align="start">
                                <HStack gap={2} align="center">
                                  <Avatar name={name} size="md" />
                                  <VStack gap={0}>
                                    <Text weight="bold" type="body">
                                      {name}
                                    </Text>
                                    <HStack gap={1} align="center">
                                      <span style={{ fontSize: '12px' }}>{flag}</span>
                                      <Text type="supporting" color="secondary">
                                        {dept} • {level}
                                      </Text>
                                    </HStack>
                                  </VStack>
                                </HStack>
                                {code && <Badge variant="blue" label={code} />}
                              </HStack>

                              <div
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.04))',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <VStack gap={0}>
                                  <Text type="supporting" color="secondary">
                                    Base Salary (USD)
                                  </Text>
                                  <Text
                                    weight="bold"
                                    hasTabularNumbers
                                    style={{ fontSize: '18px', color: '#16a34a' }}
                                  >
                                    {formatUsd(usdSalary)}
                                  </Text>
                                </VStack>

                                {localCurr !== 'USD' && (
                                  <VStack gap={0} align="end">
                                    <Text type="supporting" color="secondary">
                                      Local Currency
                                    </Text>
                                    <Text weight="semibold" hasTabularNumbers style={{ fontSize: '13px' }}>
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
                            maxHeight: '260px',
                            backgroundColor: 'var(--color-surface-default, #fff)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
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
                                    <Text hasTabularNumbers style={{ fontSize: '12px' }}>
                                      {isCurrency ? formatUsd(val) : val.toLocaleString()}
                                    </Text>
                                  );
                                }
                                return <Text style={{ fontSize: '12px' }}>{String(val ?? '-')}</Text>;
                              },
                            }))}
                            density="compact"
                            dividers="grid"
                          />
                        </div>
                      )}

                    {/* SQL AST Audit Collapsible */}
                    {msg.data?.generatedSql && (
                      <VStack gap={1}>
                        <button
                          onClick={() => toggleSql(msg.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-secondary, #64748b)',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 0',
                          }}
                        >
                          {expandedSql[msg.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <span>{expandedSql[msg.id] ? 'Hide AST SQL Query' : 'Audit Generated SQL'}</span>
                          <span style={{ color: '#10b981' }}>({msg.data.executionTimeMs}ms)</span>
                        </button>

                        {expandedSql[msg.id] && (
                          <div
                            style={{
                              backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.06))',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              overflowX: 'auto',
                            }}
                          >
                            <code>{msg.data.generatedSql}</code>
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
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-surface-sunken, rgba(0,0,0,0.04))',
                width: 'fit-content',
              }}
            >
              <Sparkles size={14} className="animate-spin text-blue-500" />
              <Text type="supporting" color="secondary">
                Running 3-layer AST query engine...
              </Text>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            paddingTop: '10px',
            borderTop: '1px solid var(--color-border-subtle, rgba(0,0,0,0.08))',
          }}
        >
          <HStack gap={1.5} align="center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  e.preventDefault();
                  handleSend(inputValue);
                }
              }}
              placeholder="Ask anything (e.g. Magnus Davis salary)..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-border-subtle, #cbd5e1)',
                backgroundColor: 'var(--color-surface-default, #fff)',
                color: 'inherit',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <Button
              variant="primary"
              size="sm"
              label={isLoading ? '...' : 'Send'}
              isDisabled={isLoading || !inputValue.trim()}
              clickAction={() => handleSend(inputValue)}
            />
          </HStack>
        </div>
      </VStack>
    </Card>
  );
}
