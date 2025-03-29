import path from 'path';
import { BaseService, expandTilde } from './base';

export class ClineService extends BaseService {
  constructor(targetExtension: string = 'md') {
    super(
      'cline',
      path.join(process.cwd(), expandTilde('.cline/rules')),
      targetExtension
    );
  }
} 
