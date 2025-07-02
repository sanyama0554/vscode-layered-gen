# Layered Architecture Generator

VSCode extension for generating layered architecture files for Next.js and NestJS applications.

## Features

- Generate Controller, Service, Repository, and DTO files from context menu
- Customizable templates
- Support for NestJS and Next.js patterns
- Dead code detection and analysis
- File dependency graph visualization
- GraphQL schema documentation generation
- API test skeleton generation
- Protobuf field numbering

## Usage

### Template Generation
1. Right-click on a folder in the Explorer
2. Select "Generate Layered Architecture Files"
3. Enter the entity name
4. Files will be generated based on your configuration

### Dead Code Detection

The extension provides comprehensive dead code detection that combines static and dynamic analysis:

#### Features
- **Unused Files**: Detects files that are not imported anywhere
- **Unused Exports**: Finds exported functions, classes, and variables that are never imported
- **Unreachable Code**: Identifies code blocks that can never be executed
- **Zero Coverage**: Highlights code with 0% test coverage
- **Orphan Modules**: Finds NestJS modules not connected to the dependency graph

#### Usage

1. **VSCode Command**: Run "Analyze Dead Code" from the command palette
2. **CLI**: Run `npx project-ext deadcode` in your terminal
3. **Tree View**: View results in the "Dead Code" panel in the Explorer sidebar

#### Configuration

Add to your `.vscode/settings.json`:

```json
{
  "vscode-layered-gen.deadcode.ignoreGlobs": [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  "vscode-layered-gen.deadcode.maxAllowed": 100,
  "vscode-layered-gen.deadcode.autoAnalyzeOnSave": false
}
```

#### CI Integration

Add to your CI workflow:

```yaml
- name: Check for dead code
  run: npx project-ext deadcode --max-allowed 0
```

#### Right-Click Actions
- **Move to Trash**: Safely moves dead code to a `trash/` directory using `git mv`
- **Add TODO Comment**: Inserts a TODO comment for manual review

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Run tests
npm test
```

## TODO

See GitHub Issues for planned features and improvements.