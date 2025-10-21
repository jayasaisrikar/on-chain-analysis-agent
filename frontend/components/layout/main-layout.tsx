"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Menu, MessageSquare, Clock, Settings, HelpCircle, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
  currentChat?: string;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  sessionId?: string; // Add session ID prop
  onNewChat?: () => void; // Add new chat callback
}

export function MainLayout({ 
  children, 
  currentChat = "New Chat",
  sidebarOpen = false,
  onSidebarToggle,
  sessionId,
  onNewChat
}: MainLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-semibold">
              U
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Anonymous User
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Free Plan
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            Pro
          </Badge>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button 
          className="w-full justify-start gap-3 h-11 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium"
          onClick={() => {
            setIsMobileSidebarOpen(false);
            onNewChat?.();
          }}
        >
          <MessageSquare className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-auto px-2">
        <div className="space-y-1">
          {/* Recent Chats */}
          <div className="px-3 py-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Today
            </h3>
            <div className="space-y-1">
              {["Bitcoin Analysis Request", "Ethereum Market Research", "DeFi Protocol Investigation"].map((chat, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-9 px-3 text-left font-normal hover:bg-accent/50 transition-colors",
                    index === 0 && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{chat}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="px-3 py-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Previous 7 Days
            </h3>
            <div className="space-y-1">
              {["NFT Market Analysis", "Layer 2 Scaling Solutions"].map((chat, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start h-9 px-3 text-left font-normal hover:bg-accent/50 transition-colors"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{chat}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Bottom Navigation */}
      <div className="p-2 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground">
          <Clock className="h-4 w-4" />
          History
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
          Help & Support
        </Button>
        <a href="/" className="block">
          <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-muted-foreground hover:text-foreground hover:bg-violet-500/10 hover:text-violet-400 transition-colors">
            <Sparkles className="h-4 w-4" />
            Back to Landing
          </Button>
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={cn(
        "flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-white/10 transition-all duration-300 ease-in-out backdrop-blur-xl",
        sidebarOpen ? "hidden md:flex w-64" : "hidden"
      )}>
        {sidebarContent}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl shadow-lg">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-3">
              {/* Mobile Menu */}
              <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>
                  {sidebarContent}
                </SheetContent>
              </Sheet>

              {/* Desktop Sidebar Toggle */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="hidden md:flex"
                onClick={onSidebarToggle}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Current Chat Title */}
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-violet-400" />
                <h1 className="text-lg font-semibold text-white truncate max-w-[200px] sm:max-w-[400px]">
                  {currentChat}
                </h1>
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="hidden sm:flex text-xs bg-purple-500/10 border-purple-500/30 text-purple-300">
                On-Chain Analysis
              </Badge>
              {sessionId && (
                <Badge variant="secondary" className="hidden lg:flex font-mono text-xs bg-violet-500/10 text-violet-300 border-violet-500/30" title={`Session: ${sessionId}`}>
                  Context: {sessionId.slice(-8)}
                </Badge>
              )}
            </div>
          </div>
        </header>

        {/* Chat Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}