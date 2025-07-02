import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

export interface DeadCodeItem {
    type: 'unused-file' | 'unused-export' | 'unreachable' | 'zero-coverage' | 'orphan-module';
    filePath: string;
    line?: number;
    column?: number;
    name?: string;
    description: string;
}

export interface DeadCodeReport {
    timestamp: Date;
    items: DeadCodeItem[];
}

export class DeadCodeAnalyzer {
    private workspaceRoot: string;
    private cacheDir: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.cacheDir = path.join(workspaceRoot, '.cache', 'deadcode');
    }

    async analyze(): Promise<DeadCodeReport> {
        await this.ensureCacheDir();

        const [
            unusedExports,
            unreachableCode,
            orphanModules,
            zeroCoverage
        ] = await Promise.all([
            this.analyzeUnusedExports(),
            this.analyzeUnreachableCode(),
            this.analyzeOrphanModules(),
            this.analyzeZeroCoverage()
        ]);

        const items = [
            ...unusedExports,
            ...unreachableCode,
            ...orphanModules,
            ...zeroCoverage
        ];

        const report: DeadCodeReport = {
            timestamp: new Date(),
            items: this.deduplicateItems(items)
        };

        await this.saveReport(report);
        return report;
    }

    private async ensureCacheDir(): Promise<void> {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create cache directory:', error);
        }
    }

    private async analyzeUnusedExports(): Promise<DeadCodeItem[]> {
        try {
            const knipConfigPath = path.join(this.workspaceRoot, 'knip.json');
            const hasKnipConfig = await this.fileExists(knipConfigPath);
            
            if (!hasKnipConfig) {
                await this.createDefaultKnipConfig();
            }

            // Knip may exit with code 1 when it finds issues, so we need to handle both stdout and stderr
            const result = await execAsync('npx knip --reporter json', {
                cwd: this.workspaceRoot
            }).catch(error => {
                // If knip exits with error code but has stdout, use the stdout
                if (error.stdout) {
                    return { stdout: error.stdout, stderr: error.stderr };
                }
                throw error;
            });

            const results = JSON.parse(result.stdout);
            const items: DeadCodeItem[] = [];

            if (results.files) {
                for (const file of results.files) {
                    items.push({
                        type: 'unused-file',
                        filePath: file,
                        description: 'Unused file'
                    });
                }
            }

            if (results.issues) {
                for (const issue of results.issues) {
                    if (issue.exports) {
                        for (const exportItem of issue.exports) {
                            items.push({
                                type: 'unused-export',
                                filePath: issue.file,
                                name: exportItem.name,
                                line: exportItem.line,
                                column: exportItem.col,
                                description: `Unused export: ${exportItem.name}`
                            });
                        }
                    }
                }
            }

            return items;
        } catch (error) {
            console.error('Knip analysis failed:', error);
            return [];
        }
    }

    private async analyzeUnreachableCode(): Promise<DeadCodeItem[]> {
        try {
            // ESLint may exit with code 1 when it finds issues, so we need to handle both stdout and stderr
            const result = await execAsync(
                'npx eslint . --format json --rule "no-unreachable:error"',
                { cwd: this.workspaceRoot }
            ).catch(error => {
                // If ESLint exits with error code but has stdout, use the stdout
                if (error.stdout) {
                    return { stdout: error.stdout, stderr: error.stderr };
                }
                throw error;
            });

            const results = JSON.parse(result.stdout);
            const items: DeadCodeItem[] = [];

            for (const file of results) {
                for (const message of file.messages) {
                    if (message.ruleId === 'no-unreachable') {
                        items.push({
                            type: 'unreachable',
                            filePath: file.filePath,
                            line: message.line,
                            column: message.column,
                            description: 'Unreachable code'
                        });
                    }
                }
            }

            return items;
        } catch (error) {
            console.error('ESLint analysis failed:', error);
            return [];
        }
    }

    private async analyzeOrphanModules(): Promise<DeadCodeItem[]> {
        try {
            const items: DeadCodeItem[] = [];
            
            // For NestJS projects, analyze module dependencies
            const isNestProject = await this.fileExists(
                path.join(this.workspaceRoot, 'nest-cli.json')
            );

            if (isNestProject) {
                // Simple DFS implementation to find orphan modules
                const moduleFiles = await this.findNestModules();
                const moduleGraph = await this.buildModuleGraph(moduleFiles);
                const orphans = this.findOrphanModules(moduleGraph);

                for (const orphan of orphans) {
                    items.push({
                        type: 'orphan-module',
                        filePath: orphan.filePath,
                        name: orphan.name,
                        description: `Orphan module: ${orphan.name}`
                    });
                }
            }

            return items;
        } catch (error) {
            console.error('Module analysis failed:', error);
            return [];
        }
    }

    private async analyzeZeroCoverage(): Promise<DeadCodeItem[]> {
        try {
            const coveragePath = path.join(
                this.workspaceRoot,
                'coverage',
                'coverage-final.json'
            );

            if (!await this.fileExists(coveragePath)) {
                // Try to generate coverage if not exists
                await execAsync('npm test -- --coverage --coverageReporters=json', {
                    cwd: this.workspaceRoot
                });
            }

            const coverageData = JSON.parse(
                await fs.readFile(coveragePath, 'utf-8')
            );

            const items: DeadCodeItem[] = [];

            for (const [filePath, fileCoverage] of Object.entries(coverageData)) {
                const coverage = fileCoverage as any;
                const statements = coverage.statementMap;
                const statementCoverage = coverage.s;

                for (const [stmtId, statement] of Object.entries(statements)) {
                    const stmt = statement as any;
                    if (statementCoverage[stmtId] === 0) {
                        items.push({
                            type: 'zero-coverage',
                            filePath,
                            line: stmt.start.line,
                            column: stmt.start.column,
                            description: 'Code with 0% coverage'
                        });
                    }
                }
            }

            return items;
        } catch (error) {
            console.error('Coverage analysis failed:', error);
            return [];
        }
    }

    private async createDefaultKnipConfig(): Promise<void> {
        const config = {
            entry: ['src/index.ts', 'src/extension.ts'],
            project: ['src/**/*.ts'],
            ignore: ['**/*.test.ts', '**/*.spec.ts']
        };

        await fs.writeFile(
            path.join(this.workspaceRoot, 'knip.json'),
            JSON.stringify(config, null, 2)
        );
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async findNestModules(): Promise<string[]> {
        const { stdout } = await execAsync(
            'find . -name "*.module.ts" -type f | grep -v node_modules',
            { cwd: this.workspaceRoot }
        );
        return stdout.trim().split('\n').filter(Boolean);
    }

    private async buildModuleGraph(moduleFiles: string[]): Promise<Map<string, Set<string>>> {
        // Simplified implementation - in real scenario, use ts-morph for proper AST analysis
        const graph = new Map<string, Set<string>>();
        
        for (const file of moduleFiles) {
            const content = await fs.readFile(
                path.join(this.workspaceRoot, file),
                'utf-8'
            );
            
            const imports = new Set<string>();
            const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(content)) !== null) {
                if (match[1].endsWith('.module')) {
                    imports.add(match[1]);
                }
            }
            
            graph.set(file, imports);
        }
        
        return graph;
    }

    private findOrphanModules(graph: Map<string, Set<string>>): Array<{filePath: string; name: string}> {
        const orphans: Array<{filePath: string; name: string}> = [];
        const visited = new Set<string>();
        
        // Start DFS from app.module.ts
        const appModule = Array.from(graph.keys()).find(f => f.includes('app.module.ts'));
        if (appModule) {
            this.dfs(appModule, graph, visited);
        }
        
        // Any unvisited modules are orphans
        for (const module of graph.keys()) {
            if (!visited.has(module)) {
                const name = path.basename(module, '.module.ts');
                orphans.push({ filePath: module, name });
            }
        }
        
        return orphans;
    }

    private dfs(node: string, graph: Map<string, Set<string>>, visited: Set<string>): void {
        visited.add(node);
        const neighbors = graph.get(node) || new Set();
        
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.dfs(neighbor, graph, visited);
            }
        }
    }

    private deduplicateItems(items: DeadCodeItem[]): DeadCodeItem[] {
        const seen = new Set<string>();
        return items.filter(item => {
            const key = `${item.type}:${item.filePath}:${item.line || 0}:${item.name || ''}`;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    private async saveReport(report: DeadCodeReport): Promise<void> {
        const reportPath = path.join(this.cacheDir, 'deadcode-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    }

    async getLastReport(): Promise<DeadCodeReport | null> {
        try {
            const reportPath = path.join(this.cacheDir, 'deadcode-report.json');
            const content = await fs.readFile(reportPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }
}