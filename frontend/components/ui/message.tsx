"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, User, Bot, AlertCircle, Info } from 'lucide-react';
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system' | 'error';
  content: string;
}

interface MessageProps {
  m: ChatMessage;
}

export function Message({ m }: MessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = m.role === 'user';
  const isError = m.role === 'error';
  const isSystem = m.role === 'system';
  const isAgent = m.role === 'agent';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
          <Info className="h-3 w-3" />
          {m.content}
        </Badge>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center my-4">
        <Card className="border-destructive/50 bg-destructive/5 p-4 max-w-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{m.content}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex gap-4 p-6 hover:bg-white/5 transition-all duration-300 group",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0 transition-transform hover:scale-105 shadow-lg">
        <AvatarFallback className={cn(
          "text-sm font-medium transition-all duration-300",
          isUser 
            ? "bg-gradient-to-br from-blue-500 to-cyan-500 text-white border border-blue-400/30" 
            : "bg-gradient-to-br from-purple-500 to-violet-500 text-white border border-purple-400/30"
        )}>
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn(
        "flex-1 min-w-0",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start"
      )}>
        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-6 py-4 max-w-[85%] relative group/message backdrop-blur-sm",
          isUser
            ? "bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white border border-blue-400/30 ml-12 shadow-lg"
            : "bg-white/5 border border-white/10 text-slate-100 mr-12 shadow-lg hover:bg-white/10 transition-all duration-300"
        )}>
          {m.content ? (
            isUser ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap break-words text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <MarkdownRenderer 
                content={m.content} 
                isUser={isUser}
                className="text-foreground"
              />
            )
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
              </div>
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>

        {/* Message Actions */}
        {m.content && !isUser && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
              {copied && <span className="ml-1 text-xs">Copied!</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <ThumbsDown className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


