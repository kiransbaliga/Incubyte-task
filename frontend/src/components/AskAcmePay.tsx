'use client';

import React, { useState } from 'react';
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { Button } from '@astryxdesign/core/Button';
import { Badge } from '@astryxdesign/core/Badge';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import {
  ChatComposer,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
} from '@astryxdesign/core/Chat';
import { askAcmePay } from '../lib/api';
import { formatUsd } from '../lib/formatters';
import type { AIQueryResponse } from '../lib/types';

interface AskAcmePayProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  data?: AIQueryResponse;
  error?: string;
}

const PROMPT_CHIPS = [
  'Compare median pay for L4 in DE vs US',
  'Top 10 highest paid in Engineering',
  'Average salary by department',
  'Total payroll and headcount',
  'Pairwise salary disparity (exceeds budget)',
];

export function AskAcmePay({ isOpen, onOpenChange }: AskAcmePayProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am ACME Pay AI. Ask me any question about global compensation, headcount, payroll spend, or benchmarks across countries and departments.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSql, setExpandedSql] = useState<Record<string, boolean>>({});

  const toggleSql = (msgId: string) => {
    setExpandedSql((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
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
          error: err.message || 'An error occurred while running the query guardrail.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Ask ACME Pay AI Assistant"
      width={560}
    >
      <Layout
        header={
          <DrawerHeader
            title="Ask ACME Pay"
            subtitle="Text-to-SQL Compensation Intelligence with Safe Read-Only Guardrails"
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={4}>
            <VStack gap={3}>
              {/* Suggested prompt chips */}
              <Card variant="muted" padding={2}>
                <VStack gap={1.5}>
                  <Text type="supporting" color="secondary" weight="semibold">
                    Suggested Questions
                  </Text>
                  <HStack gap={1.5} wrap="wrap">
                    {PROMPT_CHIPS.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="secondary"
                        size="sm"
                        label={prompt}
                        isDisabled={isLoading}
                        clickAction={() => handleSend(prompt)}
                      />
                    ))}
                  </HStack>
                </VStack>
              </Card>

              {/* Chat history */}
              <ChatMessageList align="top" isStreaming={isLoading}>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    sender={msg.sender}
                    name={msg.sender === 'user' ? 'You' : 'ACME Pay Assistant'}
                  >
                    <ChatMessageBubble>
                      <VStack gap={2}>
                        <Text type="body">{msg.text}</Text>

                        {/* Error state */}
                        {msg.error && (
                          <Card variant="red" padding={2}>
                            <HStack gap={1} align="center">
                              <Badge variant="error" label="Query Error" />
                              <Text>{msg.error}</Text>
                            </HStack>
                          </Card>
                        )}

                        {/* Single Metric Badge Visualization */}
                        {msg.data?.visualizationType === 'metric' && (
                          <HStack gap={2} align="center">
                            <Badge variant="blue" label="Verified Metric" />
                            <Text type="supporting" color="secondary">
                              Generated from real-time database aggregate
                            </Text>
                          </HStack>
                        )}

                        {/* Dynamic Table Visualization */}
                        {msg.data?.columns && msg.data.columns.length > 0 && msg.data.rows && msg.data.rows.length > 0 && (
                          <Card padding={0}>
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
                                      <Text hasTabularNumbers>
                                        {isCurrency ? formatUsd(val) : val.toLocaleString()}
                                      </Text>
                                    );
                                  }
                                  return <Text>{String(val ?? '-')}</Text>;
                                },
                              }))}
                              density="compact"
                              dividers="grid"
                            />
                          </Card>
                        )}

                        {/* Expandable "View Generated SQL" audit toggle */}
                        {msg.data?.generatedSql && (
                          <VStack gap={1}>
                            <HStack justify="start">
                              <Button
                                variant="ghost"
                                size="sm"
                                label={
                                  expandedSql[msg.id]
                                    ? 'Hide Generated SQL'
                                    : 'View Generated SQL (Audit)'
                                }
                                clickAction={() => toggleSql(msg.id)}
                              />
                            </HStack>

                            {expandedSql[msg.id] && (
                              <Card variant="muted" padding={2}>
                                <VStack gap={1}>
                                  <Text type="code">{msg.data.generatedSql}</Text>
                                  <HStack justify="between" align="center">
                                    <Text type="supporting" color="secondary">
                                      Execution Time: {msg.data.executionTimeMs}ms
                                    </Text>
                                    <Badge variant="success" label="Read-Only SQL Verified" />
                                  </HStack>
                                </VStack>
                              </Card>
                            )}
                          </VStack>
                        )}
                      </VStack>
                    </ChatMessageBubble>
                  </ChatMessage>
                ))}
              </ChatMessageList>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={2}>
            <ChatComposer
              value={inputValue}
              onChange={(val) => setInputValue(val)}
              onSubmit={(val) => handleSend(val)}
              placeholder="Ask about payroll, salaries, benchmarks, headcount..."
              isDisabled={isLoading}
            />
          </LayoutFooter>
        }
      />
    </Drawer>
  );
}
