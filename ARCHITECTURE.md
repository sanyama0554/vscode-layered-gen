# Project Architecture

## Overview
This VSCode extension provides comprehensive tooling for layered architecture development, including code generation, dependency analysis, API testing, and documentation generation.

## Directory Structure

```
src/
├── extension.ts                    # Main extension entry point
├── features/                       # Feature-based organization
│   ├── templates/                  # Template system for code generation
│   │   ├── index.ts               # Feature exports
│   │   ├── templateManager.ts     # Manages templates and code generation
│   │   └── templateEditorProvider.ts # Template configuration UI
│   ├── dependency-graph/           # File dependency analysis
│   │   ├── index.ts               # Feature exports
│   │   ├── dependencyGraphAnalyzer.ts # Core dependency analysis logic
│   │   ├── dependencyGraphWebview.ts  # Web-based graph visualization
│   │   └── dependencyTreeProvider.ts  # VSCode tree view provider
│   ├── api-analysis/               # REST/GraphQL API analysis
│   │   ├── index.ts               # Feature exports
│   │   ├── apiTestSkeletonGenerator.ts # Generates test skeletons
│   │   └── restApiAnalyzer.ts     # Analyzes REST endpoints
│   ├── graphql/                    # GraphQL-specific functionality
│   │   ├── index.ts               # Feature exports
│   │   ├── graphqlAnalyzer.ts     # Analyzes GraphQL operations
│   │   └── graphqlDocsGenerator.ts # Generates GraphQL documentation
│   └── protobuf/                   # Protocol Buffer utilities
│       ├── index.ts               # Feature exports
│       └── protobufFieldNumberer.ts # Auto-numbers protobuf fields
├── utils/                          # Shared utilities
│   ├── index.ts                   # Utility exports
│   └── ignorePatternUtils.ts      # File pattern matching utilities
├── templates/                      # EJS templates for test generation
│   ├── jest-graphql.ejs          # Jest tests for GraphQL
│   ├── jest-rest.ejs             # Jest tests for REST APIs
│   ├── k6-graphql.ejs            # K6 load tests for GraphQL
│   └── k6-rest.ejs               # K6 load tests for REST APIs
└── test/                          # Test files
    ├── runTest.ts                 # Test runner
    └── suite/                     # Test suites organized by feature
        ├── features/
        │   ├── templates/         # Template feature tests
        │   ├── dependency-graph/  # Dependency analysis tests
        │   ├── api-analysis/      # API analysis tests
        │   ├── graphql/           # GraphQL feature tests
        │   └── protobuf/          # Protobuf feature tests
        ├── utils/                 # Utility tests
        ├── extension.test.ts      # Main extension tests
        └── index.ts               # Test suite index
```

## Feature Modules

### Templates (`src/features/templates/`)
Manages layered architecture code generation from configurable templates.
- **TemplateManager**: Core template loading and file generation logic
- **TemplateEditorProvider**: WebView-based template configuration interface

### Dependency Graph (`src/features/dependency-graph/`)
Analyzes and visualizes file dependencies in TypeScript/JavaScript projects.
- **DependencyGraphAnalyzer**: Core dependency analysis using ts-morph
- **DependencyGraphWebview**: Interactive web-based graph visualization
- **DependencyTreeProvider**: VSCode sidebar tree view for dependencies

### API Analysis (`src/features/api-analysis/`)
Analyzes REST APIs and generates test skeletons.
- **ApiTestSkeletonGenerator**: Generates Jest and K6 test files
- **RestApiAnalyzer**: Extracts REST endpoints from TypeScript code

### GraphQL (`src/features/graphql/`)
GraphQL schema analysis and documentation generation.
- **GraphQLAnalyzer**: Analyzes GraphQL operations in TypeScript files
- **GraphQLDocsGenerator**: Generates Markdown documentation from GraphQL schemas

### Protobuf (`src/features/protobuf/`)
Protocol Buffer field management utilities.
- **ProtobufFieldNumberer**: Automatically assigns field numbers in .proto files

### Utilities (`src/utils/`)
Shared functionality used across features.
- **IgnorePatternUtils**: Handles .gitignore and .depgraphignore pattern matching

## Design Principles

1. **Feature-based Organization**: Related functionality is grouped together
2. **Clear Separation of Concerns**: Each module has a single, well-defined responsibility
3. **Consistent Exports**: Each feature directory exports its public API through index.ts
4. **Modular Testing**: Test files mirror the source structure for easy navigation
5. **Import Path Clarity**: Imports clearly indicate which feature they're using

## Benefits of This Structure

- **Easier Maintenance**: Related code is co-located, making changes more straightforward
- **Better Scalability**: New features can be added without cluttering the root directory
- **Improved Developer Experience**: Clear boundaries between different functional areas
- **Simplified Testing**: Test organization matches source organization
- **Reduced Cognitive Load**: Developers can focus on specific feature areas