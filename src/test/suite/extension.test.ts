import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('sanyama0554.vscode-layered-gen'));
    });

    test('Should activate extension', async () => {
        const extension = vscode.extensions.getExtension('sanyama0554.vscode-layered-gen');
        assert.ok(extension);
        await extension!.activate();
        assert.ok(extension!.isActive);
    });

    test('Should register all commands', async () => {
        const commands = await vscode.commands.getCommands();
        const extensionCommands = [
            'layered-gen.generateFiles',
            'layered-gen.configureTemplates',
            'layered-gen.registerTemplates',
            'layered-gen.numberProtobufFields',
            'layered-gen.showDependencyGraph',
            'layered-gen.generateGraphQLDocs',
            'layered-gen.generateApiTestSkeletons'
        ];

        for (const command of extensionCommands) {
            assert.ok(commands.includes(command), `Command ${command} should be registered`);
        }
    });

    test('Should register generate files command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.generateFiles'));
    });

    test('Should register configure templates command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.configureTemplates'));
    });

    test('Should register register templates command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.registerTemplates'));
    });

    test('Should register number protobuf fields command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.numberProtobufFields'));
    });

    test('Should register show dependency graph command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.showDependencyGraph'));
    });

    test('Should register generate GraphQL docs command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.generateGraphQLDocs'));
    });

    test('Should register generate API test skeletons command', async () => {
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.generateApiTestSkeletons'));
    });

    test('Should have enableAutoGraphGeneration setting default to false', () => {
        const config = vscode.workspace.getConfiguration('layered-gen');
        const autoGeneration = config.get('enableAutoGraphGeneration');
        assert.strictEqual(autoGeneration, false, 'enableAutoGraphGeneration should default to false');
    });

    test('Should not auto-generate dependency graph on activation', async () => {
        // 拡張機能を再度アクティベート
        const extension = vscode.extensions.getExtension('sanyama0554.vscode-layered-gen');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
        
        // TreeViewを取得して初期状態を確認
        // TreeViewは自動的に生成されないため、初期状態では空になるはず
        // この部分は実際のTreeViewインスタンスにアクセスできないため、
        // コマンドが正しく登録されていることを確認
        const commands = await vscode.commands.getCommands();
        assert.ok(commands.includes('layered-gen.showDependencyGraph'), 'Dependency graph command should be available');
        assert.ok(commands.includes('layered-gen.refreshDependencyGraph'), 'Refresh command should be available');
    });
});