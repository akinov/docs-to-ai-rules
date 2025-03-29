// Import each service
import { CursorService } from './cursor';
import { ClineService } from './cline';
import { BaseService } from './base';
import type { OutputService } from './base';
import { expandTilde } from './base';

// Class to manage all services
export class ServiceManager {
  private services: Map<string, OutputService> = new Map();

  constructor() {
    // Register services available by default
    this.registerDefaultServices();
  }

  private registerDefaultServices(): void {
    // Register each service
    this.registerService(new CursorService());
    this.registerService(new ClineService());
  }

  registerService(service: OutputService): void {
    this.services.set(service.name.toLowerCase(), service);
  }

  getService(name: string): OutputService | undefined {
    return this.services.get(name.toLowerCase());
  }

  getServices(names: string[]): OutputService[] {
    return names
      .map(name => this.getService(name))
      .filter((service): service is OutputService => service !== undefined);
  }

  getAllServiceNames(): string[] {
    return Array.from(this.services.keys());
  }
}

export { BaseService, OutputService, expandTilde } from './base';
export { CursorService } from './cursor';
export { ClineService } from './cline'; 
