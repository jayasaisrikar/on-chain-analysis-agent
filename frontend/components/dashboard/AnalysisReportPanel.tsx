"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel, GlassButton } from '../glass/GlassComponents';
import { FileText, Sparkles, Copy, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface AnalysisReportPanelProps {
  report: string;
  loading: boolean;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export function AnalysisReportPanel({ report, loading, copied, onCopy, onDownload }: AnalysisReportPanelProps) {
  return (
    <GlassPanel
      variant="premium"
      className="min-h-[500px] overflow-hidden"
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-purple-500/20">
              <FileText className="h-5 w-5 text-accent-purple-400" />
            </div>
            <div>
              <h3 className="text-display-lg text-base-100">Analysis Report</h3>
              <p className="text-body-sm text-base-300">Comprehensive crypto insights</p>
            </div>
          </div>
          <AnimatePresence>
            {report && (
              <motion.div className="flex gap-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <GlassButton variant={copied ? 'success' : 'default'} size="sm" onClick={onCopy} className="!p-3">
                  <Copy className="h-4 w-4" />
                </GlassButton>
                <GlassButton variant="default" size="sm" onClick={onDownload} className="!p-3">
                  <Download className="h-4 w-4" />
                </GlassButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      }
    >
      <div className="h-full overflow-y-auto pr-2 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="wait">
          {!report && !loading && (
            <motion.div key="empty" className="flex flex-col items-center justify-center h-full text-center space-y-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.5 }}>
              <div className="relative">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-purple-500/20 to-accent-primary-500/20 flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <FileText className="h-12 w-12 text-accent-purple-400" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-accent-purple-400 to-accent-primary-400 rounded-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-display-lg text-base-100">No report generated</p>
                <p className="text-body text-base-400 max-w-md mx-auto">Start an analysis to generate comprehensive crypto insights and market intelligence</p>
              </div>
            </motion.div>
          )}
          {loading && !report && (
            <motion.div key="loading" className="flex flex-col items-center justify-center h-full space-y-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-accent-purple-400/20 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-accent-purple-400 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-display-lg text-base-100">Generating analysis...</p>
                <p className="text-body text-base-400">AI agents are processing your request</p>
              </div>
            </motion.div>
          )}
          {report && (
            <motion.div key="report" className="prose prose-invert prose-slate max-w-none prose-lg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code: (props: any) => {
                    const { inline, className, children, ...rest } = props;
                    if (!inline) {
                      return (
                        <div className="glass-dark rounded-xl p-4 my-4 font-mono text-sm overflow-auto border border-white/10">
                          <code className={className} {...rest}>{String(children).replace(/\n$/, '')}</code>
                        </div>
                      );
                    }
                    return (
                      <code className="glass px-2 py-1 rounded text-sm font-mono text-accent-primary-300" {...rest}>{children}</code>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 className="text-gradient-premium text-display-xl mb-6 pb-4 border-b border-white/20">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-display-lg text-accent-primary-200 mb-4 mt-8">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-body-lg font-semibold text-accent-cyan-200 mb-3 mt-6">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-body text-base-200 leading-relaxed mb-4">{children}</p>
                  ),
                  li: ({ children }) => (
                    <li className="text-body text-base-200 leading-relaxed">{children}</li>
                  )
                }}
              >
                {report}
              </ReactMarkdown>
              {loading && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-6 bg-accent-primary-400 animate-pulse rounded" />
                  <span className="text-body-sm text-base-400">Generating...</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassPanel>
  );
}
