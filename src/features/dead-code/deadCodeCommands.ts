import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DeadCodeAnalyzer } from './deadCodeAnalyzer';
import { DeadCodeTreeProvider, DeadCodeTreeItem } from './deadCodeTreeProvider';

export class DeadCodeCommands {
    private analyzer: DeadCodeAnalyzer;
    private treeProvider: DeadCodeTreeProvider;

    constructor(
        private context: vscode.ExtensionContext,
        private workspaceRoot: string
    ) {
        this.analyzer = new DeadCodeAnalyzer(workspaceRoot);
        this.treeProvider = new DeadCodeTreeProvider(workspaceRoot);
    }

    register(): void {
        // Register tree view
        const treeView = vscode.window.createTreeView('deadCodeExplorer', {
            treeDataProvider: this.treeProvider,
            showCollapseAll: true
        });
        this.context.subscriptions.push(treeView);

        // Register commands
        this.context.subscriptions.push(
            vscode.commands.registerCommand('vscode-layered-gen.analyzeDeadCode', () => 
                this.analyzeDeadCode()
            ),
            vscode.commands.registerCommand('vscode-layered-gen.moveToTrash', (item: DeadCodeTreeItem) => 
                this.moveToTrash(item)
            ),
            vscode.commands.registerCommand('vscode-layered-gen.addTodoComment', (item: DeadCodeTreeItem) => 
                this.addTodoComment(item)
            ),
            vscode.commands.registerCommand('vscode-layered-gen.deadCodeCli', () => 
                this.runCliAnalysis()
            )
        );

        // Load last report on activation
        this.loadLastReport();
    }

    private async analyzeDeadCode(): Promise<void> {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing dead code...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Starting analysis...' });
                
                progress.report({ increment: 25, message: 'Analyzing unused exports...' });
                const report = await this.analyzer.analyze();
                
                progress.report({ increment: 75, message: 'Processing results...' });
                this.treeProvider.refresh(report);
                
                progress.report({ increment: 100, message: 'Complete!' });
                
                vscode.window.showInformationMessage(
                    `Dead code analysis complete: ${report.items.length} items found`
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(
                `Dead code analysis failed: ${(error as Error).message}`
            );
        }
    }

    private async moveToTrash(item: DeadCodeTreeItem): Promise<void> {
        if (!item.deadCodeItem) {
            return;
        }

        const deadCodeItem = item.deadCodeItem;
        const sourcePath = path.join(this.workspaceRoot, deadCodeItem.filePath);
        const trashDir = path.join(this.workspaceRoot, 'trash');
        const relativePath = path.relative(this.workspaceRoot, sourcePath);
        const targetPath = path.join(trashDir, relativePath);

        try {
            // Create trash directory structure
            await fs.mkdir(path.dirname(targetPath), { recursive: true });

            // Move file using git mv if in git repo
            const terminal = vscode.window.createTerminal('Move to Trash');
            terminal.sendText(`git mv "${sourcePath}" "${targetPath}" || mv "${sourcePath}" "${targetPath}"`);
            terminal.show();

            vscode.window.showInformationMessage(
                `Moved ${path.basename(sourcePath)} to trash folder`
            );

            // Refresh analysis after moving file
            setTimeout(() => this.analyzeDeadCode(), 2000);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to move file to trash: ${(error as Error).message}`
            );
        }
    }

    private async addTodoComment(item: DeadCodeTreeItem): Promise<void> {
        if (!item.deadCodeItem) {
            return;
        }

        const deadCodeItem = item.deadCodeItem;
        const filePath = path.join(this.workspaceRoot, deadCodeItem.filePath);

        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document);

            const line = deadCodeItem.line ? deadCodeItem.line - 1 : 0;
            const position = new vscode.Position(line, 0);

            await editor.edit(editBuilder => {
                const todoComment = '// TODO: review dead code - ' + deadCodeItem.description + '\n';
                editBuilder.insert(position, todoComment);
            });

            vscode.window.showInformationMessage(
                `Added TODO comment to ${path.basename(filePath)}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to add TODO comment: ${(error as Error).message}`
            );
        }
    }

    private async runCliAnalysis(): Promise<void> {
        const terminal = vscode.window.createTerminal('Dead Code Analysis');
        terminal.sendText('npx project-ext deadcode --output-format table');
        terminal.show();
    }

    private async loadLastReport(): Promise<void> {
        const report = await this.analyzer.getLastReport();
        if (report) {
            this.treeProvider.refresh(report);
        }
    }
}