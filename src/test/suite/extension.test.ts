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
});