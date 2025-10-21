import ChatInterface from '../../components/ui/chat-interface';
import { Toaster } from '../../components/ui/toaster';

export default function ChatPage() {
  return (
    <main className="w-full h-screen">
      <ChatInterface />
      <Toaster />
    </main>
  );
}