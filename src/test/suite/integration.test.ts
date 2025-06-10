import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';

suite('Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('File Generation Integration Tests', () => {
        test('Should generate files via command with user input', async () => {
            // Mock user input
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');

            showInputBoxStub.resolves('TestEntity');
            showQuickPickStub.resolves({ label: 'Default' });
            showInformationMessageStub.resolves();

            // Create a temporary test workspace
            const testWorkspace = path.join(__dirname, '../../../test-workspace');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const testUri = vscode.Uri.file(testWorkspace);

            // Execute the command
            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Verify user input was requested
            assert.ok(showInputBoxStub.calledOnce, 'showInputBox should be called once');
            assert.ok(showQuickPickStub.calledOnce, 'showQuickPick should be called once');

            // Verify expected files were created
            const expectedFiles = [
                path.join(testWorkspace, 'domain/TestEntity.ts'),
                path.join(testWorkspace, 'application/TestEntityService.ts'),
                path.join(testWorkspace, 'infrastructure/TestEntityRepository.ts'),
                path.join(testWorkspace, 'presentation/TestEntityController.ts')
            ];

            for (const filePath of expectedFiles) {
                assert.ok(fs.existsSync(filePath), `File should exist: ${filePath}`);
            }

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });

        test('Should handle cancelled user input gracefully', async () => {
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

            showInputBoxStub.resolves(undefined); // User cancelled

            const testUri = vscode.Uri.file('/tmp/test');

            // Execute the command
            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Should not show error for cancelled input
            assert.ok(!showErrorMessageStub.called, 'Should not show error for cancelled input');
        });
    });

    suite('WebView Integration Tests', () => {
        test('Should open dependency graph webview', async () => {
            // Execute the command
            await vscode.commands.executeCommand('layered-gen.showDependencyGraph');

            // Wait a bit for the webview to be created
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify webview was created by checking active tab
            const tabs = vscode.window.tabGroups.all.flatMap(tg => tg.tabs);
            const dependencyTab = tabs.find(tab => 
                tab.label === 'ファイル依存グラフ' && 
                tab.input instanceof vscode.TabInputWebview
            );

            assert.ok(dependencyTab, 'Dependency graph webview should be opened');
        });

        test('Should open template configuration webview', async () => {
            // Execute the command
            await vscode.commands.executeCommand('layered-gen.configureTemplates');

            // Wait a bit for the webview to be created
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify webview was created
            const tabs = vscode.window.tabGroups.all.flatMap(tg => tg.tabs);
            const configTab = tabs.find(tab => 
                tab.label === 'テンプレート設定' && 
                tab.input instanceof vscode.TabInputWebview
            );

            assert.ok(configTab, 'Template configuration webview should be opened');
        });
    });

    suite('Command Registration Tests', () => {
        test('Should register all expected commands', async () => {
            const commands = await vscode.commands.getCommands();
            const expectedCommands = [
                'layered-gen.generateFiles',
                'layered-gen.configureTemplates',
                'layered-gen.registerTemplates',
                'layered-gen.numberProtobufFields',
                'layered-gen.showDependencyGraph',
                'layered-gen.generateGraphQLDocs'
            ];

            for (const command of expectedCommands) {
                assert.ok(commands.includes(command), `Command should be registered: ${command}`);
            }
        });

        test('Should execute commands without throwing errors', async () => {
            const commands = [
                'layered-gen.showDependencyGraph',
                'layered-gen.configureTemplates'
            ];

            for (const command of commands) {
                try {
                    await vscode.commands.executeCommand(command);
                } catch (error) {
                    assert.fail(`Command ${command} should not throw error: ${error}`);
                }
            }
        });
    });

    suite('Protobuf Field Numbering Integration Tests', () => {
        test('Should number protobuf fields in a .proto file', async () => {
            // Create a test .proto file
            const testProtoContent = `syntax = "proto3";

package test;

message TestMessage {
    string name;
    int32 age;
    bool active;
}`;

            const testWorkspace = path.join(__dirname, '../../../test-workspace');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const protoFilePath = path.join(testWorkspace, 'test.proto');
            fs.writeFileSync(protoFilePath, testProtoContent);

            // Open the file in the editor
            const document = await vscode.workspace.openTextDocument(protoFilePath);
            const editor = await vscode.window.showTextDocument(document);

            // Execute the command
            await vscode.commands.executeCommand('layered-gen.numberProtobufFields');

            // Verify the content was modified
            const modifiedContent = editor.document.getText();
            assert.ok(modifiedContent.includes('string name = 1;'), 'First field should be numbered 1');
            assert.ok(modifiedContent.includes('int32 age = 2;'), 'Second field should be numbered 2');
            assert.ok(modifiedContent.includes('bool active = 3;'), 'Third field should be numbered 3');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });
    });

    suite('GraphQL Documentation Integration Tests', () => {
        test('Should generate GraphQL documentation', async () => {
            // Create a test GraphQL schema file
            const testSchemaContent = `type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  user(id: ID!): User
  users: [User!]!
}`;

            const testWorkspace = path.join(__dirname, '../../../test-workspace');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const schemaFilePath = path.join(testWorkspace, 'schema.graphql');
            fs.writeFileSync(schemaFilePath, testSchemaContent);

            // Mock workspace folder
            const workspaceFolderStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
                uri: vscode.Uri.file(testWorkspace),
                name: 'test-workspace',
                index: 0
            }]);

            // Execute the command
            await vscode.commands.executeCommand('layered-gen.generateGraphQLDocs');

            // Wait a bit for file generation
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify documentation was generated
            const docsPath = path.join(testWorkspace, 'docs');
            assert.ok(fs.existsSync(docsPath), 'Docs directory should be created');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });
    });

    suite('Error Handling Tests', () => {
        test('Should handle invalid workspace gracefully', async () => {
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // Try to generate files in a non-existent location
            const invalidUri = vscode.Uri.file('/invalid/path/that/does/not/exist');

            try {
                await vscode.commands.executeCommand('layered-gen.generateFiles', invalidUri);
            } catch (error) {
                // Command should handle errors gracefully
            }

            // Should not crash the extension
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('layered-gen.generateFiles'), 'Extension should still be functional');
        });
    });
});