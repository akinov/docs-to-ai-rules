# Refactoring Plan for docs-to-ai-rules

This document outlines the plan for refactoring the `docs-to-ai-rules` project to improve maintainability, readability, and potentially performance.

## Goals

*   Improve separation of concerns within the codebase.
*   Enhance error handling mechanisms.
*   Centralize configuration management.
*   Introduce structured logging.
*   (Optional) Improve performance by using asynchronous file operations.
*   Ensure comprehensive test coverage for all changes.

## Current Architecture Overview

The project follows the architecture described in `core.mdc`:
*   **Core Modules:** `src/index.ts`, `src/cli.ts`, `src/processor.ts`
*   **Service Modules:** `src/services/` (including `base.ts`, `index.ts`, `cursor.ts`, `cline.ts`)
*   **Tests:** `tests/unit/`, `tests/int/`

## Proposed Refactoring Strategy

### 1. Improve Separation of Concerns

*   **Isolate File System Operations:** Create a dedicated module (e.g., `src/utils/fileSystemManager.ts`) responsible for all direct file system interactions currently present in `src/index.ts` (directory creation, cleanup) and `src/processor.ts` (checking existence, stats, copying, deleting).
    *   `index.ts`: `convertDocs` will delegate directory preparation to `FileSystemManager`.
    *   `processor.ts`: `processDirectory` will use `FileSystemManager` for file operations.
*   **Refactor `processor.ts`:** Break down the `processDirectory` function into smaller, more focused functions or potentially classes with single responsibilities:
    *   `FileUpdateChecker`: Handles `needsUpdate` logic.
    *   `FileConverter` (or similar): Handles the core logic of copying/transforming a single file for a given service.
    *   `DirectorySynchronizer`: Handles the logic for deleting stale files in `sync` mode.
    *   `processDirectory` will orchestrate these components.

### 2. Enhance Error Handling

*   **Define Custom Error Classes:** Create specific error classes (e.g., `DirectoryNotFoundError`, `FileAccessError`, `ConfigurationError`) in `src/errors.ts`.
*   **Replace `process.exit(1)`:** Remove direct process exits from lower-level modules (`processor.ts`, `services`). Instead, throw the custom errors.
*   **Centralize Error Reporting:** Catch errors in the top-level execution context (`src/cli.ts` or `src/index.ts`) and provide user-friendly error messages and appropriate exit codes.
*   **Error Categories:** Group errors by domain (file system, configuration, services) for better organization and handling.

### 3. Centralize Configuration Management

*   **Create `ConfigManager`:** Implement a module (e.g., `src/configManager.ts`) to handle loading, validating, and providing access to the `Config` object.
*   **Refactor Usage:** Update `cli.ts`, `index.ts`, and `processor.ts` to retrieve configuration via the `ConfigManager`.
*   **Validation Rules:** Define clear validation rules for all configuration parameters.

### 4. Introduce Structured Logging

*   **Integrate a Logging Library:** Add a library like `winston` or `pino`.
*   **Define Log Levels:** Utilize standard log levels with clear usage guidelines:
    * `debug`: Development-only detailed information for troubleshooting
    * `info`: Normal operational information about program flow
    * `warn`: Potentially problematic situations that don't interrupt processing
    * `error`: Error conditions that interrupt operations
*   **Replace `console.*`:** Replace all `console.log` and `console.error` calls with the logger instance. Configure appropriate output formats (e.g., JSON for production, simple text for development).

### 5. (Optional) Use Asynchronous Operations

*   **Refactor File I/O:** Convert synchronous `fs` calls (`fs.readFileSync`, `fs.writeFileSync`, `fs.statSync`, etc.) to their asynchronous counterparts using `fs.promises` and `async/await`.
*   **Update Function Signatures:** Modify functions involved in I/O to be `async` and return `Promise`s. This will propagate up the call stack.
*   **Performance Measurement:** Define specific metrics and methods to objectively assess the performance benefits:
    * Execution time with large document sets (50+ documents)
    * Memory usage profiles (peak and average)
    * Throughput (files processed per second)
    * Create benchmarking scripts to compare performance before and after changes

## Preliminary Tasks

- [x] **Task 0-1: Measure Current Test Coverage**
    * Generate coverage report using Vitest
    * Document current coverage metrics
    * Establish baseline for comparison after refactoring

- [x] **Task 0-2: Define Core Interfaces First**
    * Define `FileSystemManager` interface
    * Define `ConfigManager` interface
    * Define `Logger` interface
    * Define other core component interfaces
    * This will guide implementation and clarify dependencies

## Refactoring Tasks

- [ ] **Task 1: Create `FileSystemManager`**
    *   Define the interface for file system operations (including methods for directory setup, existence checks, stats, copying, deletion, and potentially `needsUpdate`).
    *   Implement the module using `fs` (initially synchronous, potentially async later).
    *   Refactor `src/index.ts` (`convertDocs`) to use `FileSystemManager` for directory setup.
    *   Update related tests.

- [ ] **Task 2: Refactor `processor.ts` - Part 1 (File System)**
    *   Refactor `processDirectory` to use `FileSystemManager` for file existence checks, stats, copying, and deletion.
    *   Update related tests.
    *   Verify behavior is unchanged.

- [ ] **Task 3: Implement `ConfigManager`**
    *   Define the interface for `ConfigManager`, specifying how configuration is accessed.
    *   Create the `ConfigManager` module with validation capabilities.
    *   Refactor `cli.ts` to use `ConfigManager` for parsing/loading config.
    *   Update `index.ts` and `processor.ts` to get config from `ConfigManager`.
    *   Update tests.

- [ ] **Task 4: Implement Custom Errors**
    *   Define custom error classes in `src/errors.ts`, categorized by domain:
        * File system errors (`DirectoryNotFoundError`, `FileAccessError`, etc.)
        * Configuration errors (`ConfigurationError`, `ValidationError`, etc.)
        * Service errors (`ServiceInitializationError`, etc.)
    *   Replace `console.error` and `process.exit(1)` in `index.ts`, `processor.ts`, `services` with throwing custom errors.
    *   Implement centralized error handling and reporting in `cli.ts`.
    *   Update tests to check for specific errors.

- [ ] **Task 5: Refactor `processor.ts` - Part 2 (Decomposition)**
    *   Clearly define interfaces for the new components before implementation:
        * `FileUpdateChecker`
        * `FileConverter`
        * `DirectorySynchronizer`
    *   Break down the main loop into smaller functions/components.
    *   Refactor sync mode deletion logic.
    *   Update related tests.
    *   Note: This task depends on Tasks 1, 2, and 4.

- [ ] **Task 6: Integrate Logging Library**
    *   Add a logging library dependency (evaluate winston vs pino).
    *   Configure the logger instance with appropriate levels.
    *   Define logging usage guidelines for each level.
    *   Replace all `console.log`/`console.error` calls throughout the codebase.
    *   Configure environment-specific logging outputs.
    *   Update tests with logger mocks.

- [ ] **Task 7: (Optional) Implement Asynchronous I/O**
    *   Set up performance measurement metrics and benchmarking tools.
    *   Convert `FileSystemManager` methods to use `fs.promises`.
    *   Update calling functions (`index.ts`, `processor.ts`) to use `async/await`.
    *   Run benchmarks to measure performance improvements.
    *   Update tests to handle async behavior.

- [ ] **Task 8: Documentation Update**
    *   Update `README.md` with new features and changed behaviors.
    *   Generate API documentation.
    *   Update `core.mdc` architecture document.
    *   Update CLI options and configuration parameters documentation.
    *   Add service extension documentation.

- [ ] **Task 9: Version Management and Compatibility**
    *   Verify backward compatibility.
    *   Create semantic versioning update plan.
    *   Create or update CHANGELOG.md.

## Testing Strategy

*   Maintain and enhance existing unit and integration tests (`vitest`).
*   Ensure each refactoring step includes corresponding test updates or additions.
*   Verify test coverage remains high or increases.
*   Create specific test cases for:
    * Edge cases in file operations
    * Configuration validation
    * Error handling scenarios
    * Performance benchmarks

## Rollout Plan and Milestones

### Milestone 1: Basic Refactoring
*   Tasks 0-1, 0-2, 1, 2
*   Verification and review

### Milestone 2: Error Handling and Configuration
*   Tasks 3, 4
*   Verification and review

### Milestone 3: Advanced Refactoring
*   Tasks 5, 6
*   Verification and review

### Milestone 4: Optimization and Documentation
*   Tasks 7, 8, 9
*   Final verification and review

All changes will be rolled out incrementally, with thorough testing and reviews at each milestone to ensure quality and stability.
