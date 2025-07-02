import * as vscode from 'vscode';
import * as path from 'path';
import { DeadCodeItem, DeadCodeReport } from './deadCodeAnalyzer';

export class DeadCodeTreeProvider implements vscode.TreeDataProvider<DeadCodeTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DeadCodeTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<DeadCodeTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DeadCodeTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private report: DeadCodeReport | null = null;

    constructor(private workspaceRoot: string) {}

    refresh(report: DeadCodeReport): void {
        this.report = report;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DeadCodeTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DeadCodeTreeItem): Thenable<DeadCodeTreeItem[]> {
        if (!this.workspaceRoot || !this.report) {
            return Promise.resolve([]);
        }

        if (element) {
            // Return items for specific category
            const items = this.report.items.filter(item => item.type === element.category);
            return Promise.resolve(
                items.map(item => new DeadCodeTreeItem(
                    this.getItemLabel(item),
                    vscode.TreeItemCollapsibleState.None,
                    item,
                    this.workspaceRoot
                ))
            );
        } else {
            // Return top-level categories
            const categories = this.getCategories();
            return Promise.resolve(categories);
        }
    }

    private getCategories(): DeadCodeTreeItem[] {
        if (!this.report) {
            return [];
        }

        const categories: Array<{
            type: DeadCodeItem['type'];
            label: string;
            icon: string;
        }> = [
            { type: 'unused-file', label: '未使用ファイル', icon: 'file' },
            { type: 'unused-export', label: '未使用エクスポート', icon: 'symbol-interface' },
            { type: 'unreachable', label: '到達不能コード', icon: 'warning' },
            { type: 'zero-coverage', label: 'カバレッジ 0%', icon: 'beaker' },
            { type: 'orphan-module', label: '孤立モジュール', icon: 'extensions' }
        ];

        return categories
            .filter(cat => this.report!.items.some(item => item.type === cat.type))
            .map(cat => {
                const count = this.report!.items.filter(item => item.type === cat.type).length;
                return new DeadCodeTreeItem(
                    `${cat.label} (${count})`,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    this.workspaceRoot,
                    cat.type,
                    cat.icon
                );
            });
    }

    private getItemLabel(item: DeadCodeItem): string {
        const fileName = path.basename(item.filePath);
        
        if (item.name) {
            return `${fileName} → ${item.name}`;
        }
        
        if (item.line) {
            return `${fileName}:${item.line}`;
        }
        
        return fileName;
    }
}

export class DeadCodeTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly deadCodeItem?: DeadCodeItem,
        private readonly workspaceRoot?: string,
        public readonly category?: DeadCodeItem['type'],
        iconName?: string
    ) {
        super(label, collapsibleState);

        this.tooltip = this.deadCodeItem?.description || this.label;

        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        } else if (this.deadCodeItem) {
            this.iconPath = this.getIconForType(this.deadCodeItem.type);
        }

        if (this.deadCodeItem && this.workspaceRoot) {
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [
                    vscode.Uri.file(path.join(this.workspaceRoot, this.deadCodeItem.filePath)),
                    {
                        selection: this.deadCodeItem.line ? new vscode.Range(
                            this.deadCodeItem.line - 1,
                            this.deadCodeItem.column || 0,
                            this.deadCodeItem.line - 1,
                            this.deadCodeItem.column || 0
                        ) : undefined
                    }
                ]
            };
        }

        this.contextValue = this.deadCodeItem ? 'deadCodeItem' : 'deadCodeCategory';
    }

    private getIconForType(type: DeadCodeItem['type']): vscode.ThemeIcon {
        switch (type) {
            case 'unused-file':
                return new vscode.ThemeIcon('file');
            case 'unused-export':
                return new vscode.ThemeIcon('symbol-interface');
            case 'unreachable':
                return new vscode.ThemeIcon('warning');
            case 'zero-coverage':
                return new vscode.ThemeIcon('beaker');
            case 'orphan-module':
                return new vscode.ThemeIcon('extensions');
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}