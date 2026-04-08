'use client';
import { isToolUIPart } from 'ai';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: string;
  parts: any[];
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
        </ol>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    // Numbered list item: "1. text" or "12. text"
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const content = renderInline(numberedMatch[2]);
      listItems.push(<li key={i} className="text-sm">{content}</li>);
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
      </p>
    );
  });

  flushList();
  return nodes;
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return part;
      })}
    </>
  );
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
              className={`max-w-[85%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-card-foreground border-l-2 border-primary/30'
              }`}
            >
              {message.parts.map((part, i) => {
                if (part.type === 'text') {
                  if (message.role === 'assistant') {
                    return (
                      <div key={i} className="space-y-0.5 whitespace-pre-wrap">
                        {renderMarkdown(part.text)}
                      </div>
                    );
                  }
                  return <p key={i} className="whitespace-pre-wrap text-sm">{part.text}</p>;
                }
                if (isToolUIPart(part)) {
                  const toolName = part.type.startsWith('tool-') ? part.type.slice(5) : part.type;
                  const inProgress = part.state !== 'output-available';
                  return (
                    <div key={i} className={`flex items-center gap-1.5 text-xs mt-1.5 ${inProgress ? 'text-primary/70' : 'text-muted-foreground'}`}>
                      {inProgress && (
                        <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary/50 border-t-primary animate-spin shrink-0" />
                      )}
                      <span className="italic">
                        {inProgress ? `Using ${toolName}…` : `Used ${toolName}`}
                      </span>
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
