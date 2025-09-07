import { PipelineContext } from './dag-orchestrator';

/** Minimal Agent interface returning partial context mutations */
export interface Agent {
  name: string;
  run: (ctx: PipelineContext) => Promise<Partial<PipelineContext>>;
}

/** Execute sub‑agents concurrently and merge their deltas */
export class ParallelAgent implements Agent {
  name: string;
  private subAgents: Agent[];
  constructor(opts: { name: string; subAgents: Agent[] }) {
    this.name = opts.name;
    this.subAgents = opts.subAgents;
  }
  async run(ctx: PipelineContext): Promise<Partial<PipelineContext>> {
    const results = await Promise.allSettled(this.subAgents.map(a => a.run(ctx)));
    const merged: Partial<PipelineContext> = {};
    const errors: string[] = [...ctx.errors];
    results.forEach((res, idx) => {
      const a = this.subAgents[idx];
      if (res.status === 'fulfilled') {
        Object.assign(merged, res.value);
      } else {
        errors.push(`${a.name} failed: ${res.reason?.message || res.reason}`);
      }
    });
    if (errors.length !== ctx.errors.length) merged.errors = errors; // only set if new errors
    return merged;
  }
}

/** Utility to build a simple inline agent */
export function makeAgent(name: string, fn: (ctx: PipelineContext) => Promise<Partial<PipelineContext>>): Agent {
  return { name, run: fn };
}
