import path from 'path';
import { BaseService } from './base';

export class ClineService extends BaseService {
  constructor(targetExtension: string = 'md') {
    super(
      'cline',
      path.join(process.cwd(), '.clinerules'),
      targetExtension
    );
  }
}
