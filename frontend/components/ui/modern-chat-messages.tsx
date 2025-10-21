"use client";

import React, { useRef, useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Message, ChatMessage } from "@/components/ui/message";
import { ArrowDown, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ModernChatMessagesProps {
  messages: ChatMessage[];
  loading?: boolean;
  className?: string;
}

export function ModernChatMessages({ 
  messages, 
  loading = false, 
  className 
}: ModernChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isAutoScrolling) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Handle scroll detection
  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    setIsAutoScrolling(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => setIsAutoScrolling(false), 1000);
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", className)}>
        <div className="text-center space-y-8 max-w-2xl mx-auto p-8">
          {/* Hero Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-3xl blur-2xl scale-110" />
              <div className="relative bg-gradient-to-r from-purple-500 to-violet-500 p-6 rounded-3xl border border-purple-400/30">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          
          {/* Welcome Message */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent">
              Welcome to On-Chain Analysis
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed">
              Ask me anything about cryptocurrencies, DeFi protocols, or blockchain analysis.
              I'll help you understand the on-chain data and market trends with real-time insights.
            </p>
          </div>

          {/* Example Prompts */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-violet-300 mb-4">Try asking about:</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Analyze Bitcoin's recent price movements",
                "What are the top DeFi protocols by TVL?", 
                "Explain how Ethereum staking works",
                "Research the latest crypto trends"
              ].map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-4 text-left text-sm bg-white/5 border-white/10 text-slate-300 hover:bg-purple-500/10 hover:border-purple-500/30 hover:text-purple-300 transition-all duration-300 backdrop-blur-sm"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 relative overflow-hidden", className)}>
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="space-y-1 pb-4 px-2">
          {messages.map((message) => (
            <Message key={message.id} m={message} />
          ))}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <Button
          onClick={scrollToBottom}
          size="icon"
          className="absolute bottom-4 right-4 rounded-full shadow-lg z-10 h-10 w-10"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}