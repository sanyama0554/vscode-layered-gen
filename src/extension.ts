import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('Layered Architecture Generator is now active!');

    let disposable = vscode.commands.registerCommand('layered-gen.generateFiles', async (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage('Please right-click on a folder in the explorer');
            return;
        }

        const entityName = await vscode.window.showInputBox({
            prompt: 'Enter entity name (e.g., user, product)',
            placeHolder: 'entity name'
        });

        if (!entityName) {
            return;
        }

        vscode.window.showInformationMessage(`Generating files for entity: ${entityName} in ${uri.fsPath}`);
        
        // TODO: Implement file generation logic
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}