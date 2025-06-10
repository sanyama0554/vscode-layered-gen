import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyGraphAnalyzer } from '../../dependencyGraphAnalyzer';

suite('DependencyGraphAnalyzer Test Suite', () => {
    let testWorkspaceDir: string;
    let analyzer: DependencyGraphAnalyzer;

    suiteSetup(async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        testWorkspaceDir = workspaceFolder.uri.fsPath;
        analyzer = new DependencyGraphAnalyzer();
    });

    suiteTeardown(() => {
        // Clean up test files if needed
    });

    test('Should analyze simple dependency', async () => {
        // Create test files for simple dependency analysis
        const testFiles = [
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'file1.ts'),
                content: `
import { Component } from './file2';

export class File1 {
    private component: Component;
}
`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'file2.ts'),
                content: `
export class Component {
    name: string = 'test';
}
`
            }
        ];

        // Ensure test directory exists
        const testDir = path.dirname(testFiles[0].path);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Write test files
        testFiles.forEach(file => {
            fs.writeFileSync(file.path, file.content);
        });

        try {
            const graph = await analyzer.analyzeWorkspace();
            
            // Find our test files in the graph
            const file1Node = graph.nodes.find(node => 
                node.filePath.includes('file1.ts')
            );
            const file2Node = graph.nodes.find(node => 
                node.filePath.includes('file2.ts')
            );

            assert.ok(file1Node, 'file1.ts should be in the dependency graph');
            assert.ok(file2Node, 'file2.ts should be in the dependency graph');

            // Check that file1 depends on file2
            const file2RelativePath = file2Node?.id;
            assert.ok(
                file1Node?.dependencies.some(dep => dep === file2RelativePath),
                'file1.ts should depend on file2.ts'
            );

            // Check edge exists
            const edge = graph.edges.find(e => 
                e.from === file1Node?.id && e.to === file2Node?.id
            );
            assert.ok(edge, 'Edge should exist from file1 to file2');

        } finally {
            // Clean up test files
            testFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
    });

    test('Should detect circular dependencies', async () => {
        // Create test files with circular dependency
        const testFiles = [
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'circular1.ts'),
                content: `
import { ClassB } from './circular2';

export class ClassA {
    private b: ClassB;
}
`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'circular2.ts'),
                content: `
import { ClassA } from './circular1';

export class ClassB {
    private a: ClassA;
}
`
            }
        ];

        // Ensure test directory exists
        const testDir = path.dirname(testFiles[0].path);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Write test files
        testFiles.forEach(file => {
            fs.writeFileSync(file.path, file.content);
        });

        try {
            const graph = await analyzer.analyzeWorkspace();
            
            // Find our test files in the graph
            const circular1Node = graph.nodes.find(node => 
                node.filePath.includes('circular1.ts')
            );
            const circular2Node = graph.nodes.find(node => 
                node.filePath.includes('circular2.ts')
            );

            assert.ok(circular1Node, 'circular1.ts should be in the dependency graph');
            assert.ok(circular2Node, 'circular2.ts should be in the dependency graph');

            // Both files should be marked as having cycles
            assert.strictEqual(
                circular1Node?.hasCycle, 
                true, 
                'circular1.ts should be marked as having a cycle'
            );
            assert.strictEqual(
                circular2Node?.hasCycle, 
                true, 
                'circular2.ts should be marked as having a cycle'
            );

        } finally {
            // Clean up test files
            testFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }
    });

    test('Should handle relative imports correctly', async () => {
        // Create test files with various import patterns
        const testFiles = [
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'components', 'Button.tsx'),
                content: `
import React from 'react';
import { utils } from '../utils/helpers';

export const Button = () => {
    return <button>{utils.getText()}</button>;
};
`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'utils', 'helpers.ts'),
                content: `
export const utils = {
    getText: () => 'Click me'
};
`
            }
        ];

        // Ensure test directories exist
        testFiles.forEach(file => {
            const dir = path.dirname(file.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Write test files
        testFiles.forEach(file => {
            fs.writeFileSync(file.path, file.content);
        });

        try {
            const graph = await analyzer.analyzeWorkspace();
            
            // Find our test files in the graph
            const buttonNode = graph.nodes.find(node => 
                node.filePath.includes('Button.tsx')
            );
            const helpersNode = graph.nodes.find(node => 
                node.filePath.includes('helpers.ts')
            );

            assert.ok(buttonNode, 'Button.tsx should be in the dependency graph');
            assert.ok(helpersNode, 'helpers.ts should be in the dependency graph');

            // Check that Button depends on helpers
            const helpersRelativePath = helpersNode?.id;
            assert.ok(
                buttonNode?.dependencies.some(dep => dep === helpersRelativePath),
                'Button.tsx should depend on helpers.ts'
            );

        } finally {
            // Clean up test files
            testFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            
            // Clean up directories
            const dirs = [
                path.join(testWorkspaceDir, 'test-samples', 'components'),
                path.join(testWorkspaceDir, 'test-samples', 'utils'),
                path.join(testWorkspaceDir, 'test-samples')
            ];
            dirs.forEach(dir => {
                if (fs.existsSync(dir)) {
                    try {
                        fs.rmdirSync(dir);
                    } catch (e) {
                        // Directory not empty or other error, ignore
                    }
                }
            });
        }
    });

    test('Should exclude files based on .depgraphignore patterns', async () => {
        // Create .depgraphignore file
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        const ignoreContent = `
# Exclude test files
*.spec.ts
*.test.ts
test/**
`;
        fs.writeFileSync(depgraphIgnorePath, ignoreContent);

        // Create test files
        const testFiles = [
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'app.ts'),
                content: `export class App {}`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'app.spec.ts'),
                content: `import { App } from './app';`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'test', 'util.test.ts'),
                content: `export const testUtil = {};`
            }
        ];

        // Ensure test directories exist
        testFiles.forEach(file => {
            const dir = path.dirname(file.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Write test files
        testFiles.forEach(file => {
            fs.writeFileSync(file.path, file.content);
        });

        try {
            const graph = await analyzer.analyzeWorkspace();
            
            // app.ts should be included
            const appNode = graph.nodes.find(node => 
                node.filePath.includes('app.ts') && !node.filePath.includes('.spec')
            );
            assert.ok(appNode, 'app.ts should be in the dependency graph');

            // app.spec.ts should be excluded
            const specNode = graph.nodes.find(node => 
                node.filePath.includes('app.spec.ts')
            );
            assert.ok(!specNode, 'app.spec.ts should be excluded from the dependency graph');

            // test/util.test.ts should be excluded
            const testNode = graph.nodes.find(node => 
                node.filePath.includes('util.test.ts')
            );
            assert.ok(!testNode, 'util.test.ts should be excluded from the dependency graph');

        } finally {
            // Clean up
            testFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            
            if (fs.existsSync(depgraphIgnorePath)) {
                fs.unlinkSync(depgraphIgnorePath);
            }

            // Clean up directories
            const testDir = path.join(testWorkspaceDir, 'test-samples', 'test');
            if (fs.existsSync(testDir)) {
                try {
                    fs.rmdirSync(testDir);
                } catch (e) {
                    // Ignore errors
                }
            }
        }
    });

    test('Should exclude files based on VSCode settings', async () => {
        // Set VSCode exclude patterns
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', ['**/mock/**', '**/*.mock.ts'], vscode.ConfigurationTarget.Workspace);

        // Create test files
        const testFiles = [
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'service.ts'),
                content: `export class Service {}`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'service.mock.ts'),
                content: `export class MockService {}`
            },
            {
                path: path.join(testWorkspaceDir, 'test-samples', 'mock', 'data.ts'),
                content: `export const mockData = {};`
            }
        ];

        // Ensure test directories exist
        testFiles.forEach(file => {
            const dir = path.dirname(file.path);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });

        // Write test files
        testFiles.forEach(file => {
            fs.writeFileSync(file.path, file.content);
        });

        try {
            const graph = await analyzer.analyzeWorkspace();
            
            // service.ts should be included
            const serviceNode = graph.nodes.find(node => 
                node.filePath.includes('service.ts') && !node.filePath.includes('.mock')
            );
            assert.ok(serviceNode, 'service.ts should be in the dependency graph');

            // service.mock.ts should be excluded
            const mockNode = graph.nodes.find(node => 
                node.filePath.includes('service.mock.ts')
            );
            assert.ok(!mockNode, 'service.mock.ts should be excluded from the dependency graph');

            // mock/data.ts should be excluded
            const mockDataNode = graph.nodes.find(node => 
                node.filePath.includes('mock') && node.filePath.includes('data.ts')
            );
            assert.ok(!mockDataNode, 'mock/data.ts should be excluded from the dependency graph');

        } finally {
            // Clean up
            testFiles.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });

            // Clean up directories
            const mockDir = path.join(testWorkspaceDir, 'test-samples', 'mock');
            if (fs.existsSync(mockDir)) {
                try {
                    fs.rmdirSync(mockDir);
                } catch (e) {
                    // Ignore errors
                }
            }

            // Reset VSCode settings
            await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);
        }
    });
});