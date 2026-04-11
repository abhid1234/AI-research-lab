'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ChatPanel() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const dayName = DAYS[new Date().getDay()];

  return (
    <div className="flex flex-col h-full border-t-2 border-primary">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Research Assistant</h2>
        <p className="text-xs text-muted-foreground">{dayName}</p>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={(text) => sendMessage({ text })} disabled={isLoading} />
    </div>
  );
}
