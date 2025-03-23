# docs-to-ai-rules

A tool for generating rule files for AI agents from Markdown documents.

## Installation

```bash
npm install docs-to-ai-rules
```

Or

```bash
npm install -g docs-to-ai-rules
```

## Usage

### Command Line

```bash
docs-to-ai-rules [options]
```

### Options

| Option     | Short | Description | Default |
|------------|-------|-------------|---------|
| --source   | -s    | Source directory | `docs/rules` |
| --services |       | Output services (comma-separated) | `cursor` |
| --exclude  | -x    | Files to exclude (comma-separated) | `README.md` |
| --dry-run  | -d    | Check for updates without modifying files | `false` |
| --sync     |       | Format output directories and sync files completely | `false` |

### Supported Services

- `cursor` - Rule files for [Cursor](https://cursor.sh/) (output to `.cursor/rules` with `.mdc` extension)
- `cline` - Rule files for [Cline](https://github.com/cline/cline) (output to `.cline/rules` with `.md` extension)

### Examples

```bash
# Run with default settings (output to Cursor only)
docs-to-ai-rules

# Specify a custom source directory
docs-to-ai-rules --source my-docs/rules

# Output to multiple services
docs-to-ai-rules --services cursor,cline

# Exclude multiple files
docs-to-ai-rules --exclude "README.md,CHANGELOG.md"

# Check which files need updates without modifying them
docs-to-ai-rules --dry-run

# Format and completely sync source with target directories
docs-to-ai-rules --sync
```

## How It Works

This tool processes Markdown files in the `doc/rules` directory (or the specified source directory) and generates rule files for AI agents. The generated files are saved in the directories of the specified services.

- For Cursor: `./.cursor/rules` with `.mdc` extension
- For Cline: `./.cline/rules` with `.md` extension

If multiple services are specified, files will be generated in each service's directory with the appropriate file extension for that service.

### Dry Run Mode

When the `--dry-run` option is used, the tool will check for files that need updates but won't make any changes. This is useful to see which files would be updated before actually modifying them.

In dry run mode:
- No directories will be created
- No files will be copied or modified
- The tool will display which files need updates

### Sync Mode

When the `--sync` option is used, the tool will:

1. Clear the output directories (format) before copying files
2. Delete files in the output directories that don't exist in the source directory
3. Ensure complete synchronization between source and destination

This is useful when you want to make sure your output directories exactly match the source directory, without any stale or outdated files.

In sync mode:
- Output directories are formatted (all contents removed)
- Files are copied from source to destination
- Files in the destination that don't exist in the source are deleted
- The tool will display a summary of added, updated, and deleted files

Sync mode can be combined with dry run mode to see what changes would be made without actually performing them:

```bash
docs-to-ai-rules --sync --dry-run
```

## Adding Custom Services

To add a new service, create a new service class in the `src/services` directory and register it with the `ServiceManager`.

## Development

### Testing

The project includes unit and integration tests. To run them:

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:int

# Run tests in watch mode
npm run test:watch
```

### CI/CD

This project uses GitHub Actions for continuous integration. The workflow automatically runs tests on push to the main branch and on pull requests.

You can see the current CI status in the GitHub repository.
