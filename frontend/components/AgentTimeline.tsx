import React, { Fragment, useState } from 'react';
import { clsx } from 'clsx';
import { Activity, Brain, Globe2, Radar, Search, Network, Bot, Clock, CheckCircle2, Zap, Copy, ChevronDown, ChevronRight } from 'lucide-react';

export interface StepEvent {
  id: string;
  agent: string;
  // include debug/tool_error/root_error types emitted by the API route
  type: 'start' | 'finish' | 'log' | 'analysis' | 'debug' | 'tool_error' | 'root_error';
  message: string;
  ts: number;
}

const iconMap: Record<string, React.ReactNode> = {
  token_detection_agent: <Radar className="h-5 w-5" />,
  market_data_agent: <Activity className="h-5 w-5" />,
  synonym_generator_agent: <Search className="h-5 w-5" />,
  web_search_agent: <Globe2 className="h-5 w-5" />,
  analysis_agent: <Brain className="h-5 w-5" />,
  root_agent: <Network className="h-5 w-5" />
};

const agentColors: Record<string, string> = {
  token_detection_agent: 'from-accent-cyan/20 to-blue-500/20 border-accent-cyan/30',
  market_data_agent: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  synonym_generator_agent: 'from-purple-500/20 to-accent-indigo/20 border-purple-500/30',
  web_search_agent: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
  analysis_agent: 'from-accent-pink/20 to-purple-500/20 border-accent-pink/30',
  root_agent: 'from-accent-indigo/20 to-accent-cyan/20 border-accent-indigo/30'
};

const statusConfig = {
  start: { 
    color: 'bg-accent-cyan text-base', 
    ring: 'ring-accent-cyan/20', 
    icon: <Zap className="h-3 w-3" />,
    label: 'Starting'
  },
  finish: { 
    color: 'bg-green-500 text-white', 
    ring: 'ring-green-500/20', 
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Completed'
  },
  log: { 
    color: 'bg-slate-600 text-slate-200', 
    ring: 'ring-slate-600/20', 
    icon: <Clock className="h-3 w-3" />,
    label: 'Processing'
  },
  analysis: { 
    color: 'bg-accent-pink text-base', 
    ring: 'ring-accent-pink/20', 
    icon: <Brain className="h-3 w-3" />,
    label: 'Analyzing'
  }
  ,
  debug: {
    color: 'bg-slate-700 text-slate-100',
    ring: 'ring-slate-700/20',
    icon: <Copy className="h-3 w-3" />,
    label: 'Debug'
  },
  tool_error: {
    color: 'bg-yellow-600 text-white',
    ring: 'ring-yellow-500/20',
    icon: <Zap className="h-3 w-3" />,
    label: 'Tool Error'
  },
  root_error: {
    color: 'bg-red-600 text-white',
    ring: 'ring-red-500/20',
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: 'Error'
  }
};

export function AgentTimeline({ events }: { events: StepEvent[] }) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      const newCopied = new Set(copiedItems);
      newCopied.add(id);
      setCopiedItems(newCopied);
      setTimeout(() => {
        setCopiedItems(prev => {
          const updated = new Set(prev);
          updated.delete(id);
          return updated;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatAgentName = (agent: string) => {
    return agent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isLongMessage = (message: string) => message.length > 150;

  return (
    <div className="relative">
      {/* Animated background line */}
      <div className="absolute left-6 top-4 bottom-0 w-px bg-gradient-to-b from-accent-cyan/40 via-accent-indigo/30 to-accent-pink/40" />
      
      <ol className="relative space-y-6">
        {events.map((event, index) => {
          const isExpanded = expandedItems.has(event.id);
          const isCopied = copiedItems.has(event.id);
          const isLong = isLongMessage(event.message);
          const shouldTruncate = isLong && !isExpanded;
          const status = statusConfig[event.type] || statusConfig.log;
          const agentColor = agentColors[event.agent] || 'from-slate-600/20 to-slate-500/20 border-slate-500/30';
          
          return (
            <li 
              key={event.id} 
              className="fade-in group relative"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Timeline node */}
              <div className="absolute left-6 -translate-x-1/2 z-10">
                <div className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-all duration-300',
                  'ring-4 ring-base backdrop-blur-sm border',
                  status.color,
                  status.ring,
                  'group-hover:scale-110 group-hover:shadow-xl'
                )}>
                  <div className="relative">
                    {iconMap[event.agent] || <Bot className="h-5 w-5" />}
                    <div className={clsx(
                      'absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                      status.color,
                      'ring-2 ring-base'
                    )}>
                      {status.icon}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content card */}
              <div className="ml-20 group">
                <div className={clsx(
                  'relative rounded-xl border backdrop-blur-sm transition-all duration-300',
                  'bg-gradient-to-br p-6 shadow-lg',
                  agentColor,
                  'hover:shadow-xl hover:scale-[1.02] cursor-pointer'
                )}
                onClick={() => isLong && toggleExpanded(event.id)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-100 text-lg">
                        {formatAgentName(event.agent)}
                      </h3>
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        'ring-1 ring-inset transition-colors',
                        status.color,
                        status.ring
                      )}>
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <time className="text-xs text-slate-400 font-mono">
                        {new Date(event.ts).toLocaleTimeString()}
                      </time>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(event.message, event.id);
                        }}
                        className={clsx(
                          'p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100',
                          'hover:bg-slate-700/50 text-slate-400 hover:text-slate-200',
                          isCopied && 'text-green-400'
                        )}
                        title={isCopied ? 'Copied!' : 'Copy message'}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {isLong && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(event.id);
                          }}
                          className="p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
                        >
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message content */}
                  <div className="relative">
                    <p className={clsx(
                      'text-slate-300 leading-relaxed whitespace-pre-wrap transition-all duration-300',
                      shouldTruncate && 'line-clamp-3'
                    )}>
                      {shouldTruncate ? event.message.slice(0, 150) + '...' : event.message}
                    </p>
                    
                    {isLong && shouldTruncate && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
                    )}
                  </div>

                  {/* Expand indicator for long messages */}
                  {isLong && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpanded(event.id);
                        }}
                        className="text-xs text-accent-cyan hover:text-accent-cyan/80 transition-colors flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show less
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3 w-3" />
                            Show more
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Subtle glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-cyan/5 via-transparent to-accent-pink/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
