# Architecture Overview

This tool is designed as a file synchronization utility rather than a content transformation tool. It monitors Markdown files in a source directory and copies them to target directories defined by different "services" (like Cursor or Cline) based on file modification times.

The main components are:

*   **Command Line Interface (`src/cli.ts`):** Uses `commander` to parse command-line arguments (source directory, target services, exclude patterns, flags like `--dry-run` and `--sync`). It initializes the `ServiceManager` and calls the core `convertDocs` function.
*   **Library Entrypoint (`src/index.ts`):** Exports the `convertDocs` function. This function handles initial setup, such as checking the source directory, creating target directories if needed, and clearing target directories in `--sync` mode before invoking the processor.
*   **Processor (`src/processor.ts`):** Contains the `processDirectory` function, which implements the core synchronization logic. It iterates through source Markdown files, compares their modification times (`mtimeMs`) with corresponding target files, and copies the source file if it's newer or if the target doesn't exist. In `--sync` mode, it also deletes target files that no longer have a corresponding source file.
*   **Services (`src/services/`):**
    *   `ServiceManager` (`src/services/index.ts`): Manages available output services.
    *   `OutputService` (defined in `src/services/base.ts`): An interface defining properties for each service, primarily its name, target directory path, and target file extension.
    *   Concrete Services (e.g., `src/services/cursor.ts`, `src/services/cline.ts`): Implement the `OutputService` interface, specifying the unique output location and extension for each supported AI agent or tool.
