import * as vscode from 'vscode';
import { DependencyGraphAnalyzer, DependencyNode, DependencyGraph } from './dependencyGraphAnalyzer';
import * as path from 'path';

export class DependencyItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly filePath?: string,
        public readonly hasCycle?: boolean
    ) {
        super(label, collapsibleState);

        if (filePath) {
            this.tooltip = filePath;
            this.description = path.basename(filePath);
            this.resourceUri = vscode.Uri.file(filePath);
            
            if (hasCycle) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
                this.tooltip += ' (循環依存あり)';
            } else {
                this.iconPath = vscode.ThemeIcon.File;
            }

            this.command = {
                command: 'layered-gen.openFile',
                title: 'ファイルを開く',
                arguments: [filePath]
            };
        }
    }
}

export class DependencyTreeProvider implements vscode.TreeDataProvider<DependencyItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DependencyItem | undefined | null | void> = new vscode.EventEmitter<DependencyItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DependencyItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private analyzer: DependencyGraphAnalyzer;
    private graph: DependencyGraph | null = null;

    constructor() {
        this.analyzer = new DependencyGraphAnalyzer();
        this.refresh();
    }

    refresh(): void {
        this.analyzer.analyzeWorkspace().then(graph => {
            this.graph = graph;
            this._onDidChangeTreeData.fire();
        }).catch(error => {
            console.error('Failed to analyze workspace:', error);
            vscode.window.showErrorMessage(`依存グラフの解析に失敗しました: ${error.message}`);
        });
    }

    getTreeItem(element: DependencyItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DependencyItem): Thenable<DependencyItem[]> {
        if (!this.graph) {
            return Promise.resolve([]);
        }

        if (!element) {
            return Promise.resolve(this.getRootNodes());
        }

        return Promise.resolve(this.getDependencies(element));
    }

    private getRootNodes(): DependencyItem[] {
        if (!this.graph) {
            return [];
        }

        const rootNodes = this.graph.nodes.filter(node => {
            return !this.graph!.edges.some(edge => edge.to === node.id);
        });

        if (rootNodes.length === 0) {
            return this.graph.nodes.map(node => this.createTreeItem(node));
        }

        return rootNodes.map(node => this.createTreeItem(node));
    }

    private getDependencies(element: DependencyItem): DependencyItem[] {
        if (!this.graph || !element.filePath) {
            return [];
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const relativePath = path.relative(workspaceRoot, element.filePath);
        const node = this.graph.nodes.find(n => n.id === relativePath);

        if (!node) {
            return [];
        }

        const dependencyNodes = node.dependencies
            .map(depId => this.graph!.nodes.find(n => n.id === depId))
            .filter(n => n !== undefined) as DependencyNode[];

        return dependencyNodes.map(depNode => this.createTreeItem(depNode));
    }

    private createTreeItem(node: DependencyNode): DependencyItem {
        const hasChildren = node.dependencies.length > 0;
        const collapsibleState = hasChildren 
            ? vscode.TreeItemCollapsibleState.Collapsed 
            : vscode.TreeItemCollapsibleState.None;

        const label = path.basename(node.filePath);
        return new DependencyItem(label, collapsibleState, node.filePath, node.hasCycle);
    }

    getParent(element: DependencyItem): vscode.ProviderResult<DependencyItem> {
        return null;
    }
}