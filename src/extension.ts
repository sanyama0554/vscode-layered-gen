import * as vscode from 'vscode';
import { TemplateManager } from './templateManager';
import { TemplateEditorProvider } from './templateEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('Layered Architecture Generator is now active!');

    const templateManager = new TemplateManager();
    const templateEditorProvider = new TemplateEditorProvider(context, templateManager);

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
        templateEditorProvider.showTemplateConfiguration();
    });
    context.subscriptions.push(configureTemplatesCommand);

    // Register template registration command
    let registerTemplatesCommand = vscode.commands.registerCommand('layered-gen.registerTemplates', () => {
        templateEditorProvider.showTemplateRegistration();
    });
    context.subscriptions.push(registerTemplatesCommand);
}

export function deactivate() {}