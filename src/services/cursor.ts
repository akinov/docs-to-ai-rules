import path from 'path';
import { BaseService } from './base';

export class CursorService extends BaseService {
  constructor(targetExtension: string = 'mdc') {
    super(
      'cursor',
      path.join(process.cwd(), '.cursor', 'rules'),
      targetExtension
    );
  }
} 
