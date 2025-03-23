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
| --source   | -s    | Source directory | `doc/rules` |
| --services |       | Output services (comma-separated) | `cursor` |
| --exclude  | -x    | Files to exclude (comma-separated) | `README.md` |

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
```

## How It Works

This tool processes Markdown files in the `doc/rules` directory (or the specified source directory) and generates rule files for AI agents. The generated files are saved in the directories of the specified services.

- For Cursor: `./.cursor/rules` with `.mdc` extension
- For Cline: `./.cline/rules` with `.md` extension

If multiple services are specified, files will be generated in each service's directory with the appropriate file extension for that service.

## Adding Custom Services

To add a new service, create a new service class in the `src/services` directory and register it with the `ServiceManager`.
