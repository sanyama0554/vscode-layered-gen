import * as vscode from 'vscode';
import globby from 'globby';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import { IgnorePatternUtils } from './ignorePatternUtils';

export interface DependencyNode {
    id: string;
    filePath: string;
    dependencies: string[];
    hasCycle: boolean;
}

export interface DependencyGraph {
    nodes: DependencyNode[];
    edges: Array<{ from: string; to: string }>;
}

export class DependencyGraphAnalyzer {
    private project: Project;
    private workspaceRoot: string;

    constructor() {
        this.project = new Project();
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        console.log('DependencyGraphAnalyzer initialized with workspaceRoot:', this.workspaceRoot);
    }

    async analyzeWorkspace(filterPattern?: string): Promise<DependencyGraph> {
        console.log('Starting workspace analysis with filter:', filterPattern);
        const files = await this.collectFiles(filterPattern);
        console.log(`Found ${files.length} files to analyze`);
        
        const nodes = await this.analyzeFiles(files);
        console.log(`Generated ${nodes.length} nodes`);
        
        const edges = this.generateEdges(nodes);
        console.log(`Generated ${edges.length} edges`);
        
        this.detectCycles(nodes);
        const cycleCount = nodes.filter(n => n.hasCycle).length;
        console.log(`Detected ${cycleCount} nodes with cycles`);

        return {
            nodes,
            edges
        };
    }

    private async collectFiles(filterPattern?: string): Promise<string[]> {
        let patterns = [
            '**/*.ts',
            '**/*.tsx',
            '**/*.js',
            '**/*.jsx'
        ];

        // Apply filter pattern if provided
        if (filterPattern && filterPattern.trim()) {
            const filters = filterPattern.split(',').map(f => f.trim()).filter(f => f);
            patterns = filters.flatMap(filter => {
                // Ensure filter ends with file extensions if it doesn't already
                if (!filter.includes('*.')) {
                    // Add all supported extensions to the filter
                    return [
                        `${filter}/**/*.ts`,
                        `${filter}/**/*.tsx`,
                        `${filter}/**/*.js`,
                        `${filter}/**/*.jsx`
                    ];
                }
                return [filter];
            });
        }

        const excludePatterns = await IgnorePatternUtils.getExcludePatterns(this.workspaceRoot);

        console.log('Collecting files with patterns:', patterns);
        console.log('Workspace root:', this.workspaceRoot);
        console.log('Exclude patterns:', excludePatterns);

        const files = await globby(patterns, {
            cwd: this.workspaceRoot,
            ignore: excludePatterns,
            gitignore: false, // We handle gitignore ourselves through IgnorePatternUtils
            absolute: true
        });

        console.log('Collected files:', files);
        return files;
    }

    private async analyzeFiles(filePaths: string[]): Promise<DependencyNode[]> {
        const nodes: DependencyNode[] = [];

        for (const filePath of filePaths) {
            try {
                const sourceFile = this.project.addSourceFileAtPath(filePath);
                const dependencies = this.extractDependencies(sourceFile, filePath);
                
                nodes.push({
                    id: this.getRelativePath(filePath),
                    filePath,
                    dependencies: dependencies.map(dep => this.getRelativePath(dep)),
                    hasCycle: false
                });
            } catch (error) {
                console.warn(`Failed to analyze file ${filePath}:`, error);
            }
        }

        return nodes;
    }

    private extractDependencies(sourceFile: SourceFile, currentFilePath: string): string[] {
        const dependencies: string[] = [];

        sourceFile.getImportDeclarations().forEach(importDecl => {
            const moduleSpecifier = importDecl.getModuleSpecifierValue();
            const resolvedPath = this.resolveImportPath(moduleSpecifier, currentFilePath);
            if (resolvedPath) {
                dependencies.push(resolvedPath);
            }
        });

        sourceFile.getExportDeclarations().forEach(exportDecl => {
            const moduleSpecifier = exportDecl.getModuleSpecifierValue();
            if (moduleSpecifier) {
                const resolvedPath = this.resolveImportPath(moduleSpecifier, currentFilePath);
                if (resolvedPath) {
                    dependencies.push(resolvedPath);
                }
            }
        });

        const requireCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
            .filter(call => call.getExpression().getText() === 'require');
        
        requireCalls.forEach(call => {
            const args = call.getArguments();
            if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
                const moduleSpecifier = args[0].getText().slice(1, -1);
                const resolvedPath = this.resolveImportPath(moduleSpecifier, currentFilePath);
                if (resolvedPath) {
                    dependencies.push(resolvedPath);
                }
            }
        });

        return dependencies;
    }

    private resolveImportPath(importPath: string, currentFilePath: string): string | null {
        if (importPath.startsWith('.')) {
            const resolvedPath = path.resolve(path.dirname(currentFilePath), importPath);
            return this.findActualFile(resolvedPath);
        }

        if (importPath.startsWith('@/')) {
            const srcPath = path.join(this.workspaceRoot, 'src', importPath.slice(2));
            return this.findActualFile(srcPath);
        }

        if (!importPath.includes('/') || importPath.startsWith('@')) {
            return null;
        }

        const absolutePath = path.join(this.workspaceRoot, importPath);
        return this.findActualFile(absolutePath);
    }

    private findActualFile(basePath: string): string | null {
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        
        for (const ext of extensions) {
            const filePath = basePath + ext;
            if (require('fs').existsSync(filePath)) {
                return filePath;
            }
        }

        for (const ext of extensions) {
            const indexPath = path.join(basePath, 'index' + ext);
            if (require('fs').existsSync(indexPath)) {
                return indexPath;
            }
        }

        return null;
    }

    private generateEdges(nodes: DependencyNode[]): Array<{ from: string; to: string }> {
        const edges: Array<{ from: string; to: string }> = [];

        nodes.forEach(node => {
            node.dependencies.forEach(dep => {
                if (nodes.some(n => n.id === dep)) {
                    edges.push({ from: node.id, to: dep });
                }
            });
        });

        return edges;
    }

    private detectCycles(nodes: DependencyNode[]): void {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycleNodes = new Set<string>();

        const dfs = (nodeId: string): boolean => {
            if (recursionStack.has(nodeId)) {
                cycleNodes.add(nodeId);
                return true;
            }

            if (visited.has(nodeId)) {
                return false;
            }

            visited.add(nodeId);
            recursionStack.add(nodeId);

            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                for (const dep of node.dependencies) {
                    if (dfs(dep)) {
                        cycleNodes.add(nodeId);
                    }
                }
            }

            recursionStack.delete(nodeId);
            return false;
        };

        nodes.forEach(node => {
            if (!visited.has(node.id)) {
                dfs(node.id);
            }
        });

        nodes.forEach(node => {
            if (cycleNodes.has(node.id)) {
                node.hasCycle = true;
            }
        });
    }

    private getRelativePath(absolutePath: string): string {
        return path.relative(this.workspaceRoot, absolutePath);
    }
}