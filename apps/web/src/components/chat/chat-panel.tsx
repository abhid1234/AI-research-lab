'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';

export function ChatPanel() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Chat</h2>
        <p className="text-xs text-muted-foreground">Ask about your paper collection</p>
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={(text) => sendMessage({ text })} disabled={isLoading} />
    </div>
  );
}
