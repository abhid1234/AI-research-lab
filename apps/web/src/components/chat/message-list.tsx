'use client';
import { isToolUIPart } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: string;
  parts: any[];
}

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-card-foreground'
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  return <p key={i} className="whitespace-pre-wrap text-sm">{part.text}</p>;
                }
                if (isToolUIPart(part)) {
                  const toolName = part.type.startsWith('tool-') ? part.type.slice(5) : part.type;
                  return (
                    <div key={i} className="text-xs text-muted-foreground mt-1 italic">
                      {part.state === 'output-available'
                        ? `Used ${toolName}`
                        : `Using ${toolName}...`}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
