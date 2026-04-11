import { createAgentUIStreamResponse } from 'ai';
import type { UIMessage } from 'ai';
import { chatAgent } from '@/lib/chat-agent';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  return createAgentUIStreamResponse({
    agent: chatAgent,
    uiMessages: messages,
  });
}
