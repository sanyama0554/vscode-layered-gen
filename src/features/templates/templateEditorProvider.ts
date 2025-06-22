import * as vscode from 'vscode';
import { Template, TemplateManager } from './templateManager';

export class TemplateEditorProvider {
    private _panel: vscode.WebviewPanel | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly templateManager: TemplateManager
    ) {}

    public showTemplateConfiguration() {
        if (this._panel) {
            this._panel.reveal();
        } else {
            this._panel = vscode.window.createWebviewPanel(
                'templateConfiguration',
                'テンプレート設定',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this._panel.webview.html = this.getTemplateConfigurationHtml();
            this._panel.webview.onDidReceiveMessage(
                message => this.handleMessage(message, 'configuration'),
                undefined,
                this.context.subscriptions
            );

            this._panel.onDidDispose(() => {
                this._panel = undefined;
            });
        }
    }

    public showTemplateRegistration() {
        if (this._panel) {
            this._panel.reveal();
        } else {
            this._panel = vscode.window.createWebviewPanel(
                'templateRegistration',
                'テンプレート登録',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            this._panel.webview.html = this.getTemplateRegistrationHtml();
            this._panel.webview.onDidReceiveMessage(
                message => this.handleMessage(message, 'registration'),
                undefined,
                this.context.subscriptions
            );

            this._panel.onDidDispose(() => {
                this._panel = undefined;
            });
        }
    }

    private async handleMessage(message: any, type: 'configuration' | 'registration') {
        const config = vscode.workspace.getConfiguration('layered-gen');
        
        switch (message.command) {
            case 'saveTemplates':
                await config.update('templates', message.templates, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('テンプレート構成を保存しました');
                break;
            
            case 'saveFileTemplates':
                await config.update('fileTemplates', message.fileTemplates, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage('ファイルテンプレートを保存しました');
                break;
            
            case 'getTemplates':
                const templates = config.get<Template[]>('templates') || [];
                this._panel?.webview.postMessage({ command: 'loadTemplates', templates });
                break;
            
            case 'getFileTemplates':
                const fileTemplates = config.get<{ [key: string]: string }>('fileTemplates') || {};
                this._panel?.webview.postMessage({ command: 'loadFileTemplates', fileTemplates });
                break;
        }
    }

    private getTemplateConfigurationHtml(): string {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>テンプレート設定</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .template-item {
            border: 1px solid var(--vscode-panel-border);
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
        }
        .structure-item {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        input, select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 5px;
            border-radius: 3px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 15px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .remove-btn {
            background-color: var(--vscode-inputValidation-errorBackground);
        }
        h2 {
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <h1>テンプレート設定</h1>
    <p>ファイル生成時のディレクトリ構造とファイル名のパターンを設定します。</p>
    
    <div id="templates"></div>
    
    <button onclick="addTemplate()">新しいテンプレートを追加</button>
    <button onclick="saveTemplates()">保存</button>

    <script>
        const vscode = acquireVsCodeApi();
        let templates = [];

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'loadTemplates') {
                templates = message.templates;
                renderTemplates();
            }
        });

        function renderTemplates() {
            const container = document.getElementById('templates');
            container.innerHTML = templates.map((template, index) => \`
                <div class="template-item">
                    <h3>テンプレート名: <input type="text" value="\${template.name}" onchange="updateTemplateName(\${index}, this.value)" /></h3>
                    <div id="structure-\${index}">
                        \${template.structure.map((item, itemIndex) => \`
                            <div class="structure-item">
                                <input type="text" placeholder="パス (例: domain/{name}.ts)" value="\${item.path}" onchange="updateStructurePath(\${index}, \${itemIndex}, this.value)" style="flex: 2" />
                                <input type="text" placeholder="テンプレートID" value="\${item.template}" onchange="updateStructureTemplate(\${index}, \${itemIndex}, this.value)" style="flex: 1" />
                                <button class="remove-btn" onclick="removeStructureItem(\${index}, \${itemIndex})">削除</button>
                            </div>
                        \`).join('')}
                    </div>
                    <button onclick="addStructureItem(\${index})">構造を追加</button>
                    <button class="remove-btn" onclick="removeTemplate(\${index})">テンプレートを削除</button>
                </div>
            \`).join('');
        }

        function updateTemplateName(index, value) {
            templates[index].name = value;
        }

        function updateStructurePath(templateIndex, itemIndex, value) {
            templates[templateIndex].structure[itemIndex].path = value;
        }

        function updateStructureTemplate(templateIndex, itemIndex, value) {
            templates[templateIndex].structure[itemIndex].template = value;
        }

        function addStructureItem(templateIndex) {
            templates[templateIndex].structure.push({ path: '', template: '' });
            renderTemplates();
        }

        function removeStructureItem(templateIndex, itemIndex) {
            templates[templateIndex].structure.splice(itemIndex, 1);
            renderTemplates();
        }

        function addTemplate() {
            templates.push({
                name: '新しいテンプレート',
                structure: [{ path: '', template: '' }]
            });
            renderTemplates();
        }

        function removeTemplate(index) {
            templates.splice(index, 1);
            renderTemplates();
        }

        function saveTemplates() {
            vscode.postMessage({ command: 'saveTemplates', templates });
        }

        // Load initial data
        vscode.postMessage({ command: 'getTemplates' });
    </script>
</body>
</html>
        `;
    }

    private getTemplateRegistrationHtml(): string {
        return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>テンプレート登録</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .template-item {
            margin-bottom: 30px;
        }
        textarea {
            width: 100%;
            min-height: 200px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 15px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 10px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .placeholder-info {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 10px;
            border-radius: 3px;
            margin-bottom: 20px;
        }
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <h1>テンプレート登録</h1>
    
    <div class="placeholder-info">
        <h3>利用可能なプレースホルダー:</h3>
        <ul>
            <li><code>{Name}</code> - PascalCase形式の名前 (例: UserProfile)</li>
            <li><code>{name}</code> - camelCase形式の名前 (例: userProfile)</li>
        </ul>
    </div>

    <div id="fileTemplates"></div>
    
    <button onclick="addFileTemplate()">新しいファイルテンプレートを追加</button>
    <button onclick="saveFileTemplates()">保存</button>

    <script>
        const vscode = acquireVsCodeApi();
        let fileTemplates = {};

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'loadFileTemplates') {
                fileTemplates = message.fileTemplates;
                renderFileTemplates();
            }
        });

        function renderFileTemplates() {
            const container = document.getElementById('fileTemplates');
            container.innerHTML = Object.entries(fileTemplates).map(([key, value]) => \`
                <div class="template-item">
                    <h3>テンプレートID: <input type="text" value="\${key}" onchange="updateTemplateKey('\${key}', this.value)" /></h3>
                    <textarea onchange="updateTemplateContent('\${key}', this.value)">\${value}</textarea>
                    <button onclick="removeFileTemplate('\${key}')">削除</button>
                </div>
            \`).join('');
        }

        function updateTemplateKey(oldKey, newKey) {
            if (oldKey !== newKey) {
                fileTemplates[newKey] = fileTemplates[oldKey];
                delete fileTemplates[oldKey];
                renderFileTemplates();
            }
        }

        function updateTemplateContent(key, value) {
            fileTemplates[key] = value;
        }

        function addFileTemplate() {
            const newKey = 'newTemplate' + Object.keys(fileTemplates).length;
            fileTemplates[newKey] = '// 新しいテンプレート\\nexport class {Name} {\\n  // TODO: Implement\\n}\\n';
            renderFileTemplates();
        }

        function removeFileTemplate(key) {
            delete fileTemplates[key];
            renderFileTemplates();
        }

        function saveFileTemplates() {
            vscode.postMessage({ command: 'saveFileTemplates', fileTemplates });
        }

        // Load initial data
        vscode.postMessage({ command: 'getFileTemplates' });
    </script>
</body>
</html>
        `;
    }
}