import * as vscode from 'vscode';
import { TemplateManager, TemplateEditorProvider } from './features/templates';
import { ProtobufFieldNumberer } from './features/protobuf';
import { DependencyTreeProvider, DependencyGraphWebview } from './features/dependency-graph';
import { GraphQLDocsGenerator } from './features/graphql';
import { ApiTestSkeletonGenerator } from './features/api-analysis';

export function activate(context: vscode.ExtensionContext) {
    try {
        console.log('Layered Architecture Generator is now active!');

        const templateManager = new TemplateManager();
        const templateEditorProvider = new TemplateEditorProvider(context, templateManager);
        const protobufFieldNumberer = new ProtobufFieldNumberer();
        const dependencyTreeProvider = new DependencyTreeProvider();
        const dependencyGraphWebview = new DependencyGraphWebview(context);
        const graphqlDocsGenerator = new GraphQLDocsGenerator();
        const apiTestSkeletonGenerator = new ApiTestSkeletonGenerator();

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
            // 進捗表示とキャンセル対応
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating dependency graph...',
                cancellable: true
            }, async (progress, token) => {
                progress.report({ increment: 0, message: 'Analyzing workspace...' });
                
                // まず依存グラフを生成
                await dependencyTreeProvider.refresh(token);
                
                progress.report({ increment: 50, message: 'Creating visualization...' });
                
                // その後Webviewを表示
                await dependencyGraphWebview.show();
                
                progress.report({ increment: 100, message: 'Complete' });
            });
        } catch (error: any) {
            if (error.message !== 'Analysis cancelled') {
                vscode.window.showErrorMessage(`依存グラフ表示エラー: ${error}`);
            }
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
    let refreshDependencyGraphCommand = vscode.commands.registerCommand('layered-gen.refreshDependencyGraph', async () => {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Refreshing dependency graph...',
                cancellable: true
            }, async (progress, token) => {
                await dependencyTreeProvider.refresh(token);
            });
        } catch (error: any) {
            if (error.message !== 'Analysis cancelled') {
                vscode.window.showErrorMessage(`依存グラフ更新エラー: ${error}`);
            }
        }
    });
    context.subscriptions.push(refreshDependencyGraphCommand);

    // File watcher for auto-refresh
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,tsx,js,jsx}');
    fileWatcher.onDidChange(() => {
        const config = vscode.workspace.getConfiguration('layered-gen');
        if (config.get('enableAutoGraphGeneration', false)) {
            setTimeout(() => dependencyTreeProvider.refresh(), 1000);
        }
    });
    fileWatcher.onDidCreate(() => {
        const config = vscode.workspace.getConfiguration('layered-gen');
        if (config.get('enableAutoGraphGeneration', false)) {
            setTimeout(() => dependencyTreeProvider.refresh(), 1000);
        }
    });
    fileWatcher.onDidDelete(() => {
        const config = vscode.workspace.getConfiguration('layered-gen');
        if (config.get('enableAutoGraphGeneration', false)) {
            setTimeout(() => dependencyTreeProvider.refresh(), 1000);
        }
    });
    context.subscriptions.push(fileWatcher);

    // GraphQL docs generation command
    let generateGraphQLDocsCommand = vscode.commands.registerCommand('layered-gen.generateGraphQLDocs', async () => {
        try {
            const files = await vscode.workspace.findFiles('**/*.graphql', '**/node_modules/**');
            
            if (files.length === 0) {
                vscode.window.showWarningMessage('GraphQLスキーマファイル(.graphql)が見つかりませんでした');
                return;
            }
            
            if (files.length === 1) {
                await graphqlDocsGenerator.generateDocs(files[0].fsPath);
            } else {
                // 複数ファイルある場合は選択
                const items = files.map(file => ({
                    label: vscode.workspace.asRelativePath(file),
                    detail: file.fsPath,
                    file: file
                }));
                
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'ドキュメント生成するGraphQLスキーマファイルを選択してください'
                });
                
                if (selected) {
                    await graphqlDocsGenerator.generateDocs(selected.file.fsPath);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`GraphQLドキュメント生成エラー: ${error}`);
        }
    });
    context.subscriptions.push(generateGraphQLDocsCommand);

    // GraphQL file watcher for auto-generation
    const graphqlFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.graphql');
    
    graphqlFileWatcher.onDidChange(async (uri: vscode.Uri) => {
        try {
            console.log(`GraphQL file changed: ${uri.fsPath}`);
            // 非同期でドキュメント生成（2秒後に実行）
            setTimeout(async () => {
                try {
                    await graphqlDocsGenerator.generateDocs(uri.fsPath);
                } catch (error) {
                    console.error('Auto GraphQL docs generation failed:', error);
                }
            }, 2000);
        } catch (error) {
            console.error('GraphQL file change handler error:', error);
        }
    });
    
    context.subscriptions.push(graphqlFileWatcher);

    // Alternative: Use workspace.onDidSaveTextDocument for .graphql files
    const saveDocumentWatcher = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        if (document.fileName.endsWith('.graphql')) {
            try {
                console.log(`GraphQL file saved: ${document.fileName}`);
                // 非同期でドキュメント生成（2秒後に実行）
                setTimeout(async () => {
                    try {
                        await graphqlDocsGenerator.generateDocs(document.fileName);
                    } catch (error) {
                        console.error('Auto GraphQL docs generation failed:', error);
                    }
                }, 2000);
            } catch (error) {
                console.error('GraphQL save document handler error:', error);
            }
        }
    });
    
    context.subscriptions.push(saveDocumentWatcher);

    // Register API test skeleton generation command
    let generateApiTestSkeletonsCommand = vscode.commands.registerCommand('layered-gen.generateApiTestSkeletons', async () => {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('ワークスペースフォルダが開かれていません');
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;
            
            // Ask if user wants to generate k6 tests
            const generateK6 = await vscode.window.showQuickPick(['Jest tests only', 'Jest tests + k6 load tests'], {
                placeHolder: 'テストの種類を選択してください'
            });

            const options: any = {
                e2e: generateK6 === 'Jest tests + k6 load tests'
            };

            // If k6 tests are requested, get configuration
            if (options.e2e) {
                const config = vscode.workspace.getConfiguration('layered-gen.k6');
                options.k6Config = {
                    vus: config.get('vus', 10),
                    duration: config.get('duration', '30s')
                };
            }

            await apiTestSkeletonGenerator.generateTestSkeletons(rootPath, options);
        } catch (error) {
            vscode.window.showErrorMessage(`APIテストスケルトン生成エラー: ${error}`);
        }
    });
    context.subscriptions.push(generateApiTestSkeletonsCommand);
    } catch (error) {
        console.error('Failed to activate extension:', error);
        vscode.window.showErrorMessage(`拡張機能のアクティベーションに失敗しました: ${error}`);
    }
}

export function deactivate() {
    // Clean up resources if needed
}