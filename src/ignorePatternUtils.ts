import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class IgnorePatternUtils {
    private static readonly defaultPatterns = [
        '**/node_modules/**',
        '**/out/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/coverage/**',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.spec.js',
        '**/*.spec.jsx',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.test.js',
        '**/*.test.jsx',
        '**/tests/**',
        '**/test/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        '**/.git/**',
        '**/.vscode/**',
        '**/.idea/**',
        '**/build/**',
        '**/temp/**',
        '**/tmp/**',
        '**/*.log',
        '**/.DS_Store'
    ];

    static async getExcludePatterns(workspaceRoot: string): Promise<string[]> {
        // Priority 1: VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        const settingsPatterns = config.get<string[]>('exclude');
        if (settingsPatterns && settingsPatterns.length > 0) {
            return this.processPatterns(settingsPatterns);
        }

        // Priority 2: .depgraphignore file
        const depgraphIgnorePath = path.join(workspaceRoot, '.depgraphignore');
        if (fs.existsSync(depgraphIgnorePath)) {
            try {
                const patterns = await this.parseIgnoreFile(depgraphIgnorePath);
                if (patterns.length > 0) {
                    return patterns;
                }
            } catch (error) {
                console.warn('Failed to parse .depgraphignore:', error);
            }
        }

        // Priority 3: .gitignore file
        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
            try {
                const patterns = await this.parseIgnoreFile(gitignorePath);
                if (patterns.length > 0) {
                    return patterns;
                }
            } catch (error) {
                console.warn('Failed to parse .gitignore:', error);
            }
        }

        // Priority 4: Default patterns
        return this.defaultPatterns;
    }

    private static async parseIgnoreFile(filePath: string): Promise<string[]> {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const lines = content.split('\n');
        const patterns: string[] = [];
        const negatedPatterns: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            
            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Handle negation patterns
            if (trimmed.startsWith('!')) {
                negatedPatterns.push(trimmed.substring(1));
                continue;
            }

            // Convert directory patterns to glob patterns
            let pattern = trimmed;
            if (pattern.endsWith('/')) {
                pattern = pattern + '**';
            }

            // Ensure patterns are properly formatted for globby
            if (!pattern.startsWith('**/') && !pattern.startsWith('/')) {
                pattern = '**/' + pattern;
            }

            patterns.push(pattern);
        }

        // Apply negated patterns
        const finalPatterns = patterns.filter(pattern => {
            for (const negated of negatedPatterns) {
                if (pattern === negated || pattern === '**/' + negated) {
                    return false;
                }
            }
            return true;
        });

        return finalPatterns;
    }

    private static processPatterns(patterns: string[]): string[] {
        return patterns.map(pattern => {
            let processed = pattern.trim();
            
            // Convert directory patterns to glob patterns
            if (processed.endsWith('/')) {
                processed = processed + '**';
            }

            // Ensure patterns are properly formatted for globby
            if (!processed.startsWith('**/') && !processed.startsWith('/') && !processed.includes('*')) {
                processed = '**/' + processed;
            }

            return processed;
        });
    }
}