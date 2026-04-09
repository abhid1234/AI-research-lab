'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart } from 'ai';

// ── Inline markdown renderer (mirrors message-list.tsx) ──────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      nodes.push(
        <ol key={`list-${listKey++}`} className="list-decimal list-inside space-y-0.5 my-1">
          {listItems}
        </ol>,
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      listItems.push(
        <li key={i} className="text-sm">
          {renderInline(numberedMatch[2])}
        </li>,
      );
      return;
    }
    flushList();
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-1" />);
      return;
    }
    nodes.push(
      <p key={i} className="text-sm leading-relaxed">
        {renderInline(line)}
      </p>,
    );
  });

  flushList();
  return nodes;
}

// ── Chat Modal ───────────────────────────────────────────────────────────────
export function ChatModal() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to latest message
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open]);

  function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ask the collection"
        className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-[oklch(0.45_0.19_260)] text-white shadow-lg hover:bg-[oklch(0.38_0.19_260)] transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.19_260)] focus:ring-offset-2"
        style={{ width: 52, height: 52 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-1.5rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl flex flex-col border border-[oklch(0.9_0_0)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[oklch(0.92_0_0)] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[oklch(0.145_0_0)]">Ask the Collection</h3>
                <p className="text-[10px] text-[oklch(0.5_0_0)] mt-0.5">
                  Semantic search + AI reasoning over your papers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="p-1.5 rounded-md text-[oklch(0.5_0_0)] hover:text-[oklch(0.145_0_0)] hover:bg-[oklch(0.95_0_0)] transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-4">
                  <span className="text-3xl select-none" aria-hidden="true">✦</span>
                  <p className="text-sm font-medium text-[oklch(0.25_0_0)]">
                    Ask anything about your papers
                  </p>
                  <p className="text-xs text-[oklch(0.55_0_0)] max-w-[280px]">
                    Try: "What are the main trends in RL?" or "Which papers discuss emergent behaviour?"
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-[oklch(0.45_0.19_260)] text-white'
                        : 'bg-[oklch(0.97_0_0)] text-[oklch(0.145_0_0)] border border-[oklch(0.92_0_0)] border-l-2 border-l-[oklch(0.55_0.19_260)]'
                    }`}
                  >
                    {Array.isArray(message.parts) ? (
                      message.parts.map((part: any, i: number) => {
                        if (part?.type === 'text') {
                          const textContent = typeof part.text === 'string' ? part.text : '';
                          if (message.role === 'assistant') {
                            return (
                              <div key={i} className="space-y-0.5">
                                {renderMarkdown(textContent)}
                              </div>
                            );
                          }
                          return (
                            <p key={i} className="text-sm whitespace-pre-wrap">
                              {textContent}
                            </p>
                          );
                        }
                        if (isToolUIPart(part)) {
                          const toolName =
                            typeof part.type === 'string' && part.type.startsWith('tool-')
                              ? part.type.slice(5)
                              : typeof part.type === 'string'
                                ? part.type
                                : 'tool';
                          const inProgress = part.state !== 'output-available';
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-1.5 text-xs mt-1.5 ${inProgress ? 'text-[oklch(0.45_0.19_260)]/80' : 'text-[oklch(0.55_0_0)]'}`}
                            >
                              {inProgress && (
                                <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-[oklch(0.55_0.19_260)]/50 border-t-[oklch(0.55_0.19_260)] animate-spin shrink-0" />
                              )}
                              <span className="italic">
                                {inProgress ? `Searching papers…` : `Searched papers`}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })
                    ) : null}
                  </div>
                </div>
              ))}

              {/* Loading indicator when submitted but no messages yet streaming */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-[oklch(0.97_0_0)] border border-[oklch(0.92_0_0)] rounded-xl px-3.5 py-2.5">
                    <div className="flex gap-1 items-center h-4">
                      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.19_260)] animate-bounce [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.19_260)] animate-bounce [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.55_0.19_260)] animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[oklch(0.92_0_0)] px-4 py-3">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your papers..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 resize-none rounded-lg border border-[oklch(0.88_0_0)] px-3 py-2 text-sm text-[oklch(0.145_0_0)] placeholder:text-[oklch(0.6_0_0)] bg-[oklch(0.98_0_0)] focus:outline-none focus:ring-1 focus:ring-[oklch(0.55_0.19_260)] focus:border-[oklch(0.55_0.19_260)] disabled:opacity-50 max-h-24 overflow-y-auto"
                  style={{ minHeight: 36 }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  aria-label="Send message"
                  className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-[oklch(0.45_0.19_260)] text-white hover:bg-[oklch(0.38_0.19_260)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-[oklch(0.6_0_0)] mt-1.5">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
