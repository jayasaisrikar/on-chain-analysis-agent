"use client";

import React from 'react';
import { ChevronDown, Zap, Brain } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIProvider } from '@/types/api-config';

interface ModelSelectorProps {
  selectedModel: AIProvider;
  onModelChange: (model: AIProvider) => void;
  disabled?: boolean;
  className?: string;
}

const modelConfig = {
  openai: {
    name: 'GPT-4',
    icon: Zap,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    hoverColor: 'hover:bg-emerald-500/20'
  },
  gemini: {
    name: 'Gemini Pro',
    icon: Brain,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    hoverColor: 'hover:bg-blue-500/20'
  }
};

export function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  disabled = false,
  className
}: ModelSelectorProps) {
  const currentModel = modelConfig[selectedModel];
  const CurrentIcon = currentModel.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={disabled}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-all duration-200",
            "text-slate-400 hover:text-slate-300 hover:bg-white/5",
            "focus:outline-none focus:ring-1 focus:ring-purple-500/20",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
        >
          <CurrentIcon className={cn("h-3 w-3", currentModel.color)} />
          <span className="text-slate-400">{currentModel.name}</span>
          <ChevronDown className="h-2.5 w-2.5 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-48 bg-slate-800/95 border-white/10 backdrop-blur-xl"
      >
        {Object.entries(modelConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => onModelChange(key as AIProvider)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 cursor-pointer",
                "text-slate-300 hover:text-white",
                "focus:bg-white/10",
                key === selectedModel && "bg-purple-500/20 text-purple-200"
              )}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
              <div className="flex flex-col">
                <span className="font-medium">{config.name}</span>
                <span className="text-xs text-slate-400">
                  {key === 'openai' ? 'OpenAI' : 'Google AI'}
                </span>
              </div>
              {key === selectedModel && (
                <div className="ml-auto w-2 h-2 rounded-full bg-purple-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}