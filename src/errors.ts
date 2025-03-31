// Base error class for the application
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Ensure stack trace is captured (important for V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Configuration related errors
export class ConfigurationError extends AppError {
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends ConfigurationError {
    constructor(message: string) {
        super(message);
    }
}

// File system related errors
export class FileSystemError extends AppError {
  public path?: string; // Optional path associated with the error
  constructor(message: string, path?: string) {
    super(path ? `${message}: ${path}` : message);
    this.path = path;
  }
}

export class DirectoryNotFoundError extends FileSystemError {
    constructor(path: string) {
        super('Directory not found', path);
    }
}

export class FileAccessError extends FileSystemError {
    constructor(path: string, operation: string = 'access') {
        super(`Permission denied to ${operation} file/directory`, path);
    }
}

// Service related errors
export class ServiceError extends AppError {
  public serviceName?: string;
  constructor(message: string, serviceName?: string) {
    super(serviceName ? `[${serviceName}] ${message}` : message);
    this.serviceName = serviceName;
  }
}

export class ServiceInitializationError extends ServiceError {
    constructor(serviceName: string, reason: string) {
        super(`Failed to initialize service: ${reason}`, serviceName);
    }
} 
