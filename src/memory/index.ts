import * as fs from "fs/promises";
import * as path from "path";
import { MemoryData } from "../types/index.js";

export class PersistenceMemory {
  private filePath: string;
  private data: MemoryData = {};

  constructor(filePath: string) {
    this.filePath = filePath;
    this.ensureDirectoryExists();
    this.loadFromDisk();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {}
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      this.data = JSON.parse(content);
    } catch (error) {
      this.data = {};
    }
  }

  private async saveToDisk(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {}
  }

  set(key: string, value: any): void {
    this.data[key] = value;
    this.saveToDisk();
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.data[key] ?? defaultValue;
  }

  has(key: string): boolean {
    return key in this.data;
  }

  remove(key: string): boolean {
    if (key in this.data) {
      delete this.data[key];
      this.saveToDisk();
      return true;
    }
    return false;
  }

  clear(): void {
    this.data = {};
    this.saveToDisk();
  }

  getAllKeys(): string[] {
    return Object.keys(this.data);
  }

  getAllData(): MemoryData {
    return { ...this.data };
  }
}

export class PromptMemory {
  private prompts: Map<string, string> = new Map();

  addPrompt(query: string, prompt: string): void {
    this.prompts.set(query, prompt);
  }

  getPrompt(query: string): string | undefined {
    return this.prompts.get(query);
  }

  getAllPrompts(): Map<string, string> {
    return new Map(this.prompts);
  }

  clear(): void {
    this.prompts.clear();
  }
}
