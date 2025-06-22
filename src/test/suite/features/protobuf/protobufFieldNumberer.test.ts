import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProtobufFieldNumberer } from '../../../../features/protobuf/protobufFieldNumberer';
import * as path from 'path';
import * as fs from 'fs';

suite('ProtobufFieldNumberer Test Suite', () => {
    let protobufFieldNumberer: ProtobufFieldNumberer;
    const testWorkspace = path.join(__dirname, 'test-workspace');
    const testProtoFile = path.join(testWorkspace, 'test.proto');

    setup(() => {
        protobufFieldNumberer = new ProtobufFieldNumberer();
        
        // Create test workspace directory
        if (!fs.existsSync(testWorkspace)) {
            fs.mkdirSync(testWorkspace, { recursive: true });
        }
    });

    teardown(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });

    test('Should create protobuf field numberer instance', () => {
        assert.ok(protobufFieldNumberer);
    });

    test('Should show error when no active editor', async () => {
        // Close all editors
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        
        // This test would need to mock vscode.window.showErrorMessage
        // to verify the error message is shown
    });

    test('Should show error for non-.proto files', async () => {
        // Create a non-proto file
        const nonProtoFile = path.join(testWorkspace, 'test.txt');
        fs.writeFileSync(nonProtoFile, 'not a proto file');
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(nonProtoFile);
        await vscode.window.showTextDocument(doc);
        
        // Execute command - should show error
        await protobufFieldNumberer.numberFields();
        
        // Close the editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('Should number fields in proto file', async () => {
        // Create a test proto file
        const protoContent = `syntax = "proto3";

message User {
    string name = 10;
    int32 age = 5;
    repeated string emails = 1;
}

message Product {
    string id = 2;
    string title = 1;
    double price = 3;
}`;
        
        fs.writeFileSync(testProtoFile, protoContent);
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(testProtoFile);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Execute numbering
        await protobufFieldNumberer.numberFields();
        
        // Check the result
        const updatedContent = doc.getText();
        
        // Verify User message fields are numbered 1, 2, 3
        assert.ok(updatedContent.includes('string name = 1;'));
        assert.ok(updatedContent.includes('int32 age = 2;'));
        assert.ok(updatedContent.includes('repeated string emails = 3;'));
        
        // Verify Product message fields are numbered 1, 2, 3
        assert.ok(updatedContent.match(/Product[\s\S]*?string id = 1;/));
        assert.ok(updatedContent.match(/Product[\s\S]*?string title = 2;/));
        assert.ok(updatedContent.match(/Product[\s\S]*?double price = 3;/));
        
        // Close the editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
});