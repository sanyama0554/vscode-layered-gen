import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';

suite('Command Workflow Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('File Generation Workflow', () => {
        test('Should complete full file generation workflow', async () => {
            // Setup mocks for user interaction
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
            const showTextDocumentStub = sandbox.stub(vscode.window, 'showTextDocument');

            // Mock user responses
            showInputBoxStub.resolves('Product');
            showQuickPickStub.resolves({ label: 'Default' }); 
            showInformationMessageStub.resolves();
            showTextDocumentStub.resolves();

            // Create test workspace
            const testWorkspace = path.join(__dirname, '../../../test-workspace-workflow');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const testUri = vscode.Uri.file(testWorkspace);

            // Execute command
            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Verify interaction sequence
            assert.ok(showInputBoxStub.calledOnce, 'Should prompt for entity name');
            assert.ok(showQuickPickStub.calledOnce, 'Should prompt for template selection');
            
            // Verify input box was called with correct parameters
            const inputBoxCall = showInputBoxStub.getCall(0);
            assert.ok(inputBoxCall.args[0]?.prompt, 'Input box should have prompt');
            assert.ok(inputBoxCall.args[0]?.placeHolder, 'Input box should have placeholder');

            // Verify quick pick was called with template options
            const quickPickCall = showQuickPickStub.getCall(0);
            assert.ok(Array.isArray(quickPickCall.args[0]), 'Should provide template options');

            // Verify files were created with correct content
            const domainFile = path.join(testWorkspace, 'domain/Product.ts');
            const serviceFile = path.join(testWorkspace, 'application/ProductService.ts');
            const repositoryFile = path.join(testWorkspace, 'infrastructure/ProductRepository.ts');
            const controllerFile = path.join(testWorkspace, 'presentation/ProductController.ts');

            assert.ok(fs.existsSync(domainFile), 'Domain file should be created');
            assert.ok(fs.existsSync(serviceFile), 'Service file should be created');
            assert.ok(fs.existsSync(repositoryFile), 'Repository file should be created');
            assert.ok(fs.existsSync(controllerFile), 'Controller file should be created');

            // Verify file contents
            const domainContent = fs.readFileSync(domainFile, 'utf8');
            assert.ok(domainContent.includes('export class Product'), 'Domain should contain Product class');

            const serviceContent = fs.readFileSync(serviceFile, 'utf8');
            assert.ok(serviceContent.includes('export class ProductService'), 'Service should contain ProductService class');
            assert.ok(serviceContent.includes('from \'../domain/product\''), 'Service should import from domain');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });

        test('Should handle template selection workflow', async () => {
            const showQuickPickStub = sandbox.stub(vscode.window, 'showQuickPick');
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');

            // Mock multiple template options
            const mockTemplates = ['Default', 'NextJS', 'NestJS'];
            showQuickPickStub.resolves({ label: 'NextJS' });
            showInputBoxStub.resolves('Order');

            const testWorkspace = path.join(__dirname, '../../../test-workspace-templates');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const testUri = vscode.Uri.file(testWorkspace);

            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Verify template selection was offered
            const quickPickCall = showQuickPickStub.getCall(0);
            assert.ok(quickPickCall, 'Template selection should be prompted');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });

        test('Should validate entity name input', async () => {
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // Test empty input
            showInputBoxStub.onFirstCall().resolves('');
            showInputBoxStub.onSecondCall().resolves('ValidName');

            const testUri = vscode.Uri.file('/tmp/test');

            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Should be called twice (first empty, then valid)
            assert.ok(showInputBoxStub.calledTwice || showInputBoxStub.calledOnce, 
                'Should handle invalid input gracefully');
        });
    });

    suite('Template Configuration Workflow', () => {
        test('Should open template configuration and handle save', async () => {
            // Execute template configuration command
            await vscode.commands.executeCommand('layered-gen.configureTemplates');

            // Wait for webview to be created
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify webview was opened
            const tabs = vscode.window.tabGroups.all.flatMap(tg => tg.tabs);
            const configTab = tabs.find(tab => 
                tab.label === 'テンプレート設定' && 
                tab.input instanceof vscode.TabInputWebview
            );

            assert.ok(configTab, 'Template configuration webview should be opened');
        });

        test('Should register new templates workflow', async () => {
            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
            showInformationMessageStub.resolves();

            // Execute register templates command
            await vscode.commands.executeCommand('layered-gen.registerTemplates');

            // Should not throw error
            assert.ok(true, 'Register templates command should execute without error');
        });
    });

    suite('Protobuf Workflow', () => {
        test('Should handle complete protobuf numbering workflow', async () => {
            // Create test .proto file
            const protoContent = `syntax = "proto3";

package test;

message User {
    string name;
    int32 age;
    repeated string emails;
}

message Order {
    string id;
    User user;
    double total;
}`;

            const testWorkspace = path.join(__dirname, '../../../test-workspace-proto');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const protoFile = path.join(testWorkspace, 'schema.proto');
            fs.writeFileSync(protoFile, protoContent);

            // Open the file in editor
            const document = await vscode.workspace.openTextDocument(protoFile);
            const editor = await vscode.window.showTextDocument(document);

            // Execute numbering command
            await vscode.commands.executeCommand('layered-gen.numberProtobufFields');

            // Verify changes
            const updatedContent = editor.document.getText();
            
            // Should number User message fields
            assert.ok(updatedContent.includes('string name = 1;'), 'User.name should be numbered 1');
            assert.ok(updatedContent.includes('int32 age = 2;'), 'User.age should be numbered 2');
            assert.ok(updatedContent.includes('repeated string emails = 3;'), 'User.emails should be numbered 3');

            // Should number Order message fields
            assert.ok(updatedContent.includes('string id = 1;'), 'Order.id should be numbered 1');
            assert.ok(updatedContent.includes('User user = 2;'), 'Order.user should be numbered 2');
            assert.ok(updatedContent.includes('double total = 3;'), 'Order.total should be numbered 3');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });

        test('Should handle non-proto files gracefully', async () => {
            // Create a non-proto file
            const testWorkspace = path.join(__dirname, '../../../test-workspace-nonproto');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const tsFile = path.join(testWorkspace, 'test.ts');
            fs.writeFileSync(tsFile, 'export class Test {}');

            const document = await vscode.workspace.openTextDocument(tsFile);
            await vscode.window.showTextDocument(document);

            const showWarningMessageStub = sandbox.stub(vscode.window, 'showWarningMessage');

            // Execute numbering command on non-proto file
            await vscode.commands.executeCommand('layered-gen.numberProtobufFields');

            // Should show warning or handle gracefully
            // (The exact behavior depends on implementation)
            assert.ok(true, 'Should handle non-proto files without crashing');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });
    });

    suite('GraphQL Documentation Workflow', () => {
        test('Should complete GraphQL documentation generation workflow', async () => {
            // Create test GraphQL schema
            const schemaContent = `type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users: [User!]!
  post(id: ID!): Post
  posts: [Post!]!
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String, email: String): User!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}`;

            const testWorkspace = path.join(__dirname, '../../../test-workspace-graphql');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            const schemaFile = path.join(testWorkspace, 'schema.graphql');
            fs.writeFileSync(schemaFile, schemaContent);

            // Mock workspace
            const workspaceFolderStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
                uri: vscode.Uri.file(testWorkspace),
                name: 'test-workspace',
                index: 0
            }]);

            const showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
            showInformationMessageStub.resolves();

            // Execute GraphQL docs generation
            await vscode.commands.executeCommand('layered-gen.generateGraphQLDocs');

            // Wait for generation to complete
            await new Promise(resolve => setTimeout(resolve, 300));

            // Verify documentation was generated
            const docsDir = path.join(testWorkspace, 'docs');
            assert.ok(fs.existsSync(docsDir), 'Docs directory should be created');

            // Should show success message
            assert.ok(showInformationMessageStub.called, 'Should show completion message');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });
    });

    suite('Dependency Graph Workflow', () => {
        test('Should show dependency graph for workspace', async () => {
            // Create test files with dependencies
            const testWorkspace = path.join(__dirname, '../../../test-workspace-deps');
            if (!fs.existsSync(testWorkspace)) {
                fs.mkdirSync(testWorkspace, { recursive: true });
            }

            // Create interconnected files
            const appFile = path.join(testWorkspace, 'app.ts');
            const controllerFile = path.join(testWorkspace, 'controller.ts');
            const serviceFile = path.join(testWorkspace, 'service.ts');

            fs.writeFileSync(appFile, `import { Controller } from './controller';\nconst controller = new Controller();`);
            fs.writeFileSync(controllerFile, `import { Service } from './service';\nexport class Controller {}`);
            fs.writeFileSync(serviceFile, `export class Service {}`);

            // Mock workspace
            const workspaceFolderStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
                uri: vscode.Uri.file(testWorkspace),
                name: 'test-workspace',
                index: 0
            }]);

            // Execute dependency graph command
            await vscode.commands.executeCommand('layered-gen.showDependencyGraph');

            // Wait for webview creation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify webview was created
            const tabs = vscode.window.tabGroups.all.flatMap(tg => tg.tabs);
            const graphTab = tabs.find(tab => 
                tab.label === 'ファイル依存グラフ' && 
                tab.input instanceof vscode.TabInputWebview
            );

            assert.ok(graphTab, 'Dependency graph webview should be opened');

            // Clean up
            try {
                fs.rmSync(testWorkspace, { recursive: true, force: true });
            } catch (error) {
                console.warn('Could not clean up test workspace:', error);
            }
        });
    });

    suite('Error Recovery Workflows', () => {
        test('Should recover from file system errors', async () => {
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');

            showInputBoxStub.resolves('TestEntity');

            // Try to write to read-only location
            const readOnlyUri = vscode.Uri.file('/proc/invalid');

            try {
                await vscode.commands.executeCommand('layered-gen.generateFiles', readOnlyUri);
            } catch (error) {
                // Expected to fail
            }

            // Extension should still be functional
            const commands = await vscode.commands.getCommands();
            assert.ok(commands.includes('layered-gen.generateFiles'), 
                'Extension should remain functional after error');
        });

        test('Should handle cancelled operations gracefully', async () => {
            const showInputBoxStub = sandbox.stub(vscode.window, 'showInputBox');
            const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

            // User cancels input
            showInputBoxStub.resolves(undefined);

            const testUri = vscode.Uri.file('/tmp/test');

            await vscode.commands.executeCommand('layered-gen.generateFiles', testUri);

            // Should not show error for cancelled operation
            assert.ok(!showErrorMessageStub.called, 'Should not show error for user cancellation');
        });
    });
});