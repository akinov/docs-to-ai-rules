import path from 'path';
import { BaseService } from './index';

export class ClineService extends BaseService {
  constructor(targetExtension: string = 'mdc') {
    super(
      'cline',
      path.join(process.cwd(), '.cline', 'rules'),
      targetExtension
    );
  }
} 
