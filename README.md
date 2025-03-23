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
| --target   | -t    | Target directory | `./.cursor/rules` |
| --ext      | -e    | Extension of generated files | `mdc` |
| --exclude  | -x    | Files to exclude (comma-separated) | `README.md` |

### Examples

```bash
# Run with default settings
docs-to-ai-rules

# Specify custom source and target directories
docs-to-ai-rules --source my-docs/rules --target output/rules

# Change the extension
docs-to-ai-rules --ext txt

# Exclude multiple files
docs-to-ai-rules --exclude "README.md,CHANGELOG.md"
```

## How it works

The tool processes Markdown files in the `docs/rules` directory (or the specified source directory) and generates rule files for AI agents. The generated files are saved in the `./.cursor/rules` directory (or the specified target directory). 
