import * as React from "react";
import { cn } from "../../lib/utils";

export function PageHeader({ title, subtitle, className }: { title: string; subtitle?: string; className?: string }) {
  return (
    <header className={cn("mb-4 flex flex-col gap-1", className)}>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent animate-fade-in">
        {title}
      </h1>
      {subtitle && <p className="text-xs md:text-sm text-slate-400 max-w-2xl animate-fade-in delay-100">{subtitle}</p>}
    </header>
  );
}
