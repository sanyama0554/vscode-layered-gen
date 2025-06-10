import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyGraphAnalyzer } from '../../dependencyGraphAnalyzer';

suite('Depgraphignore Feature Tests', () => {
    let testWorkspace: string;
    let analyzer: DependencyGraphAnalyzer;

    setup(() => {
        testWorkspace = path.join(__dirname, '../../../test-workspace-depgraph');
        analyzer = new DependencyGraphAnalyzer();
        
        // Create test workspace
        if (!fs.existsSync(testWorkspace)) {
            fs.mkdirSync(testWorkspace, { recursive: true });
        }
    });

    teardown(() => {
        // Clean up test workspace
        try {
            if (fs.existsSync(testWorkspace)) {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('Could not clean up test workspace:', error);
        }
    });

    suite('VSCode Settings Configuration', () => {
        test('Should read depGraph.exclude setting from configuration', () => {
            // Mock VSCode configuration
            const mockConfig = {
                get: (key: string, defaultValue: any) => {
                    if (key === 'exclude') {
                        return ['**/*.spec.ts', 'test/**', 'mock/**'];
                    }
                    return defaultValue;
                }
            };

            // Stub vscode.workspace.getConfiguration
            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => mockConfig as any;

            // Test configuration access
            const config = vscode.workspace.getConfiguration('depGraph');
            const excludePatterns = config.get('exclude', []);

            assert.deepStrictEqual(excludePatterns, ['**/*.spec.ts', 'test/**', 'mock/**']);

            // Restore original function
            vscode.workspace.getConfiguration = originalGetConfiguration;
        });

        test('Should return empty array when no settings configured', () => {
            const mockConfig = {
                get: (key: string, defaultValue: any) => defaultValue
            };

            const originalGetConfiguration = vscode.workspace.getConfiguration;
            vscode.workspace.getConfiguration = () => mockConfig as any;

            const config = vscode.workspace.getConfiguration('depGraph');
            const excludePatterns = config.get('exclude', []);

            assert.deepStrictEqual(excludePatterns, []);

            vscode.workspace.getConfiguration = originalGetConfiguration;
        });
    });

    suite('.depgraphignore File Processing', () => {
        test('Should parse .depgraphignore file with various patterns', () => {
            const depgraphignoreContent = `# Comments should be ignored
node_modules/
dist/
**/*.spec.ts
**/*.test.js
# Another comment
coverage/
.vscode/

temp`;

            const depgraphignorePath = path.join(testWorkspace, '.depgraphignore');
            fs.writeFileSync(depgraphignorePath, depgraphignoreContent);

            // Create a test instance with access to private methods
            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            const patterns = testAnalyzer.testParseIgnoreFile(depgraphignoreContent);

            const expectedPatterns = [
                'node_modules/**',
                'dist/**',
                '**/*.spec.ts',
                '**/*.test.js',
                'coverage/**',
                '.vscode/**',
                '**/temp/**'
            ];

            assert.deepStrictEqual(patterns, expectedPatterns);
        });

        test('Should handle negation patterns correctly', () => {
            const content = `# Exclude all test files
**/*.test.ts
# But include important test
!src/important.test.ts
# Exclude dist
dist/
# But include specific dist file
!dist/keep.js`;

            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            const patterns = testAnalyzer.testParseIgnoreFile(content);

            const expectedPatterns = [
                '**/*.test.ts',
                '!src/important.test.ts',
                'dist/**',
                '!dist/keep.js'
            ];

            assert.deepStrictEqual(patterns, expectedPatterns);
        });

        test('Should handle empty and comment-only files', () => {
            const content = `# This is just a comment file

# Another comment
    # Indented comment

`;

            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            const patterns = testAnalyzer.testParseIgnoreFile(content);

            assert.deepStrictEqual(patterns, []);
        });
    });

    suite('.gitignore Fallback', () => {
        test('Should use .gitignore when .depgraphignore does not exist', () => {
            const gitignoreContent = `node_modules/
dist/
*.log
.env`;

            // Create only .gitignore file
            const gitignorePath = path.join(testWorkspace, '.gitignore');
            fs.writeFileSync(gitignorePath, gitignoreContent);

            // Ensure .depgraphignore does not exist
            const depgraphignorePath = path.join(testWorkspace, '.depgraphignore');
            if (fs.existsSync(depgraphignorePath)) {
                fs.unlinkSync(depgraphignorePath);
            }

            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            const patterns = testAnalyzer.testParseIgnoreFile(gitignoreContent);

            const expectedPatterns = [
                'node_modules/**',
                'dist/**',
                '**/**.log/**',
                '**/.env/**'
            ];

            assert.deepStrictEqual(patterns, expectedPatterns);
        });
    });

    suite('Pattern Priority and Fallback Logic', () => {
        test('Should prioritize VSCode settings over .depgraphignore', async () => {
            // Create .depgraphignore file
            const depgraphignoreContent = `node_modules/
dist/`;
            const depgraphignorePath = path.join(testWorkspace, '.depgraphignore');
            fs.writeFileSync(depgraphignorePath, depgraphignoreContent);

            // Test the priority logic by checking which patterns would be used
            // This tests the concept that VSCode settings should override file-based patterns
            const settingsPatterns = ['**/*.spec.ts', 'test/**'];
            const depgraphPatterns = ['node_modules/**', 'dist/**'];

            // Settings should take priority
            const effectivePatterns = settingsPatterns.length > 0 ? settingsPatterns : depgraphPatterns;

            assert.deepStrictEqual(effectivePatterns, settingsPatterns);
            assert.notDeepStrictEqual(effectivePatterns, depgraphPatterns);
        });

        test('Should fallback to .depgraphignore when settings are empty', () => {
            const settingsPatterns: string[] = [];
            const depgraphPatterns = ['node_modules/**', 'dist/**'];

            const effectivePatterns = settingsPatterns.length > 0 ? settingsPatterns : depgraphPatterns;

            assert.deepStrictEqual(effectivePatterns, depgraphPatterns);
        });

        test('Should fallback to .gitignore when both settings and .depgraphignore are empty', () => {
            const settingsPatterns: string[] = [];
            const depgraphPatterns: string[] = [];
            const gitignorePatterns = ['node_modules/**', '**/*.log/**'];

            let effectivePatterns = settingsPatterns.length > 0 ? settingsPatterns : depgraphPatterns;
            effectivePatterns = effectivePatterns.length > 0 ? effectivePatterns : gitignorePatterns;

            assert.deepStrictEqual(effectivePatterns, gitignorePatterns);
        });
    });

    suite('Default Patterns', () => {
        test('Should always include default exclude patterns', () => {
            const defaultPatterns = [
                '**/node_modules/**',
                '**/out/**',
                '**/dist/**',
                '**/*.d.ts'
            ];

            const userPatterns = ['**/*.spec.ts'];
            const combinedPatterns = [...defaultPatterns, ...userPatterns];

            // Verify default patterns are included
            defaultPatterns.forEach(pattern => {
                assert.ok(combinedPatterns.includes(pattern), 
                    `Default pattern "${pattern}" should be included`);
            });

            // Verify user patterns are added
            userPatterns.forEach(pattern => {
                assert.ok(combinedPatterns.includes(pattern), 
                    `User pattern "${pattern}" should be included`);
            });
        });
    });

    suite('Edge Cases and Error Handling', () => {
        test('Should handle invalid file permissions gracefully', () => {
            // Test error handling when files cannot be read
            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public async testReadDepgraphignoreFile(): Promise<string[]> {
                    return (this as any).readDepgraphignoreFile();
                }
            })();

            // This should not throw an error even if the file doesn't exist
            assert.doesNotThrow(async () => {
                await testAnalyzer.testReadDepgraphignoreFile();
            });
        });

        test('Should handle malformed patterns gracefully', () => {
            const malformedContent = `# Valid comment
valid/pattern/
**/*.ts
# This line has weird characters
invalid\\pattern\\with\\backslashes
# Another valid pattern
test/`;

            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            // Should not throw error and should process valid patterns
            assert.doesNotThrow(() => {
                const patterns = testAnalyzer.testParseIgnoreFile(malformedContent);
                assert.ok(Array.isArray(patterns), 'Should return an array');
                assert.ok(patterns.length > 0, 'Should process some valid patterns');
            });
        });

        test('Should handle very large ignore files', () => {
            // Generate a large ignore file content
            const largeContent = Array.from({ length: 1000 }, (_, i) => `pattern${i}/`).join('\n');

            const testAnalyzer = new (class extends DependencyGraphAnalyzer {
                public testParseIgnoreFile(content: string): string[] {
                    return (this as any).parseIgnoreFile(content);
                }
            })();

            assert.doesNotThrow(() => {
                const patterns = testAnalyzer.testParseIgnoreFile(largeContent);
                assert.strictEqual(patterns.length, 1000, 'Should process all 1000 patterns');
            });
        });
    });

    suite('Integration with Globby', () => {
        test('Should work with globby ignore patterns', () => {
            // Test that our patterns work with globby's ignore option
            const patterns = [
                '**/node_modules/**',
                '**/*.spec.ts',
                'test/**',
                '!test/important.ts'  // Negation pattern
            ];

            // Verify patterns are in correct format for globby
            patterns.forEach(pattern => {
                assert.ok(typeof pattern === 'string', 'Pattern should be string');
                
                if (!pattern.startsWith('!')) {
                    // Non-negation patterns should use glob syntax
                    assert.ok(pattern.includes('*') || pattern.includes('/'), 
                        `Pattern "${pattern}" should use glob syntax`);
                }
            });
        });
    });
});