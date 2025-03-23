import { describe, test, expect, beforeEach } from 'vitest';
import { BaseService, ServiceManager } from '../../src/services';
import { CursorService } from '../../src/services/cursor';
import { ClineService } from '../../src/services/cline';

class TestService extends BaseService {
  constructor() {
    super('test', '/tmp/test', 'test');
  }
}

describe('BaseService', () => {
  test('basic methods work correctly', () => {
    const service = new TestService();
    
    expect(service.name).toBe('test');
    expect(service.getTargetDirectory()).toBe('/tmp/test');
    expect(service.getTargetExtension()).toBe('test');
    
    service.setTargetExtension('new');
    expect(service.getTargetExtension()).toBe('new');
  });
});

describe('ServiceManager', () => {
  let manager: ServiceManager;
  
  beforeEach(() => {
    manager = new ServiceManager();
  });
  
  test('default services are registered', () => {
    const services = manager.getAllServiceNames();
    expect(services).toContain('cursor');
    expect(services).toContain('cline');
  });
  
  test('can get a service', () => {
    const cursorService = manager.getService('cursor');
    expect(cursorService).toBeInstanceOf(CursorService);
    
    const clineService = manager.getService('cline');
    expect(clineService).toBeInstanceOf(ClineService);
  });
  
  test('can register a service', () => {
    const testService = new TestService();
    manager.registerService(testService);
    
    expect(manager.getService('test')).toBe(testService);
    expect(manager.getAllServiceNames()).toContain('test');
  });
  
  test('can get multiple services', () => {
    const services = manager.getServices(['cursor', 'cline', 'nonexistent']);
    
    expect(services.length).toBe(2);
    expect(services[0]).toBeInstanceOf(CursorService);
    expect(services[1]).toBeInstanceOf(ClineService);
  });
}); 
