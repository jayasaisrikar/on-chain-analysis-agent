"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, className, isUser = false }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCodeCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom code block component
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              return (
                <div className="relative group">
                  <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
                    <span className="text-sm text-gray-300 font-mono">
                      {match[1]}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCodeCopy(codeString)}
                    >
                      {copiedCode === codeString ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="!mt-0 !rounded-t-none"
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            return (
              <code
                className={cn(
                  "px-1.5 py-0.5 rounded text-sm font-mono",
                  isUser 
                    ? "bg-white/20 text-primary-foreground" 
                    : "bg-muted text-foreground"
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          
          // Custom blockquote component
          blockquote({ children, ...props }) {
            return (
              <blockquote 
                className="border-l-4 border-violet-500 pl-4 py-2 bg-violet-50 dark:bg-violet-950/30 rounded-r-lg my-4"
                {...props}
              >
                {children}
              </blockquote>
            );
          },
          
          // Custom table components
          table({ children, ...props }) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse border border-border rounded-lg overflow-hidden" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          
          thead({ children, ...props }) {
            return (
              <thead className="bg-muted" {...props}>
                {children}
              </thead>
            );
          },
          
          th({ children, ...props }) {
            return (
              <th className="border border-border px-4 py-2 text-left font-semibold" {...props}>
                {children}
              </th>
            );
          },
          
          td({ children, ...props }) {
            return (
              <td className="border border-border px-4 py-2" {...props}>
                {children}
              </td>
            );
          },
          
          // Custom link component
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                className={cn(
                  "font-medium underline underline-offset-4 transition-colors",
                  isUser 
                    ? "text-primary-foreground hover:text-primary-foreground/80" 
                    : "text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
                )}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          
          // Custom heading components with crypto font
          h1({ children, ...props }) {
            return (
              <h1 className="text-2xl font-bold mb-4 text-foreground" {...props}>
                {children}
              </h1>
            );
          },
          
          h2({ children, ...props }) {
            return (
              <h2 className="text-xl font-semibold mb-3 text-foreground" {...props}>
                {children}
              </h2>
            );
          },
          
          h3({ children, ...props }) {
            return (
              <h3 className="text-lg font-medium mb-2 text-foreground" {...props}>
                {children}
              </h3>
            );
          },
          
          // Custom list components
          ul({ children, ...props }) {
            return (
              <ul className="list-disc pl-6 space-y-2 my-4" {...props}>
                {children}
              </ul>
            );
          },
          
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal pl-6 space-y-2 my-4" {...props}>
                {children}
              </ol>
            );
          },
          
          li({ children, ...props }) {
            return (
              <li className="leading-relaxed" {...props}>
                {children}
              </li>
            );
          },
          
          // Custom paragraph component
          p({ children, ...props }) {
            return (
              <p className="leading-relaxed mb-4 last:mb-0" {...props}>
                {children}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}