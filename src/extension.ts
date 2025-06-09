import * as vscode from 'vscode';
import { TemplateManager } from './templateManager';
import { TemplateEditorProvider } from './templateEditorProvider';
import { ProtobufFieldNumberer } from './protobufFieldNumberer';
import { DependencyTreeProvider } from './dependencyTreeProvider';
import { DependencyGraphWebview } from './dependencyGraphWebview';

export function activate(context: vscode.ExtensionContext) {
    console.log('Layered Architecture Generator is now active!');

    const templateManager = new TemplateManager();
    const templateEditorProvider = new TemplateEditorProvider(context, templateManager);
    const protobufFieldNumberer = new ProtobufFieldNumberer();
    const dependencyTreeProvider = new DependencyTreeProvider();
    const dependencyGraphWebview = new DependencyGraphWebview(context);

    let disposable = vscode.commands.registerCommand('layered-gen.generateFiles', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('フォルダを右クリックしてください');
            return;
        }

        const entityName = await vscode.window.showInputBox({
            prompt: '生成するファイル名を入力してください (例: User)',
            placeHolder: 'ファイル名'
        });

        if (!entityName) {
            return;
        }

        try {
            const templates = templateManager.getTemplates();
            let selectedTemplate: string | undefined;

            if (templates.length > 1) {
                const templateNames = templates.map(t => t.name);
                selectedTemplate = await vscode.window.showQuickPick(templateNames, {
                    placeHolder: 'テンプレートを選択してください'
                });

                if (!selectedTemplate) {
                    return;
                }
            }

            const generatedFiles = await templateManager.generateFiles(
                uri.fsPath,
                entityName,
                selectedTemplate
            );

            vscode.window.showInformationMessage(
                `${generatedFiles.length}個のファイルを生成しました: ${entityName}`
            );

            // Open the first generated file
            if (generatedFiles.length > 0) {
                const doc = await vscode.workspace.openTextDocument(generatedFiles[0]);
                await vscode.window.showTextDocument(doc);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`ファイル生成エラー: ${error}`);
        }
    });

    context.subscriptions.push(disposable);

    // Register template configuration command
    let configureTemplatesCommand = vscode.commands.registerCommand('layered-gen.configureTemplates', () => {
        try {
            templateEditorProvider.showTemplateConfiguration();
        } catch (error) {
            vscode.window.showErrorMessage(`テンプレート設定エラー: ${error}`);
        }
    });
    context.subscriptions.push(configureTemplatesCommand);

    // Register template registration command
    let registerTemplatesCommand = vscode.commands.registerCommand('layered-gen.registerTemplates', () => {
        try {
            templateEditorProvider.showTemplateRegistration();
        } catch (error) {
            vscode.window.showErrorMessage(`テンプレート登録エラー: ${error}`);
        }
    });
    context.subscriptions.push(registerTemplatesCommand);

    // Register protobuf field numbering command
    let numberProtobufFieldsCommand = vscode.commands.registerCommand('layered-gen.numberProtobufFields', async () => {
        try {
            await protobufFieldNumberer.numberFields();
        } catch (error) {
            vscode.window.showErrorMessage(`Protobufフィールド番号付けエラー: ${error}`);
        }
    });
    context.subscriptions.push(numberProtobufFieldsCommand);

    // Register dependency graph tree view
    vscode.window.createTreeView('dependencyGraph', {
        treeDataProvider: dependencyTreeProvider,
        showCollapseAll: true
    });

    // Register dependency graph webview command
    let showDependencyGraphCommand = vscode.commands.registerCommand('layered-gen.showDependencyGraph', async () => {
        try {
            await dependencyGraphWebview.show();
        } catch (error) {
            vscode.window.showErrorMessage(`依存グラフ表示エラー: ${error}`);
        }
    });
    context.subscriptions.push(showDependencyGraphCommand);

    // Register file open command
    let openFileCommand = vscode.commands.registerCommand('layered-gen.openFile', async (filePath: string) => {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`ファイルを開けませんでした: ${error}`);
        }
    });
    context.subscriptions.push(openFileCommand);

    // Register refresh command
    let refreshDependencyGraphCommand = vscode.commands.registerCommand('layered-gen.refreshDependencyGraph', () => {
        dependencyTreeProvider.refresh();
    });
    context.subscriptions.push(refreshDependencyGraphCommand);

    // File watcher for auto-refresh
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');
    fileWatcher.onDidChange(() => {
        setTimeout(() => dependencyTreeProvider.refresh(), 1000);
    });
    fileWatcher.onDidCreate(() => {
        setTimeout(() => dependencyTreeProvider.refresh(), 1000);
    });
    fileWatcher.onDidDelete(() => {
        setTimeout(() => dependencyTreeProvider.refresh(), 1000);
    });
    context.subscriptions.push(fileWatcher);
}

export function deactivate() {}