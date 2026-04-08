import { ChatPanel } from '@/components/chat/chat-panel';

export default function Home() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-1/3 border-r border-border flex flex-col">
        <ChatPanel />
      </aside>
      <main className="w-2/3 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Research Lab</h1>
        </div>
        <div className="flex-1 p-4 text-muted-foreground">
          Artifact viewer will go here
        </div>
      </main>
    </div>
  );
}
