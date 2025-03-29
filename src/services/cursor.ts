import path from 'path';
import { BaseService, expandTilde } from './base';

export class CursorService extends BaseService {
  constructor(targetExtension: string = 'mdc') {
    super(
      'cursor',
      path.join(process.cwd(), expandTilde('.cursor/rules')),
      targetExtension
    );
  }
} 
