import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('undefined_publisher.vscode-layered-gen'));
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
});