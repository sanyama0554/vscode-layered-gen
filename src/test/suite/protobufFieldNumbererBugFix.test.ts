import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProtobufFieldNumberer } from '../../protobufFieldNumberer';
import * as path from 'path';
import * as fs from 'fs';

suite('ProtobufFieldNumberer Bug Fix Test Suite', () => {
    let protobufFieldNumberer: ProtobufFieldNumberer;
    const testWorkspace = path.join(__dirname, 'test-workspace');
    const testProtoFile = path.join(testWorkspace, 'bugfix.proto');

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

    test('Should correctly number fields in proto3 syntax', async () => {
        // Create a test proto file similar to the example
        const protoContent = `syntax = "proto3";

package example;

// Example message with unordered field numbers
message User {
    string id = 10;
    string name = 2;
    int32 age = 5;
    repeated string emails = 1;
    bool is_active = 8;
}`;
        
        fs.writeFileSync(testProtoFile, protoContent);
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(testProtoFile);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Execute numbering
        await protobufFieldNumberer.numberFields();
        
        // Check the result
        const updatedContent = doc.getText();
        const lines = updatedContent.split('\n');
        
        // Find the User message fields
        let fieldNumber = 1;
        let foundFields = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('string id =')) {
                assert.ok(line.includes('= 1;'), 'id field should be numbered 1');
                foundFields++;
            } else if (line.includes('string name =')) {
                assert.ok(line.includes('= 2;'), 'name field should be numbered 2');
                foundFields++;
            } else if (line.includes('int32 age =')) {
                assert.ok(line.includes('= 3;'), 'age field should be numbered 3');
                foundFields++;
            } else if (line.includes('repeated string emails =')) {
                assert.ok(line.includes('= 4;'), 'emails field should be numbered 4');
                foundFields++;
            } else if (line.includes('bool is_active =')) {
                assert.ok(line.includes('= 5;'), 'is_active field should be numbered 5');
                foundFields++;
            }
        }
        
        assert.strictEqual(foundFields, 5, 'Should have found and numbered all 5 fields');
        
        // Close the editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });

    test('Should handle nested messages correctly', async () => {
        // Create a test proto file with nested messages
        const protoContent = `syntax = "proto3";

message Order {
    string order_id = 3;
    User customer = 1;
    repeated Item items = 5;
    double total_price = 2;
    
    message Item {
        string product_id = 2;
        int32 quantity = 1;
        double price = 3;
    }
}`;
        
        fs.writeFileSync(testProtoFile, protoContent);
        
        // Open the file
        const doc = await vscode.workspace.openTextDocument(testProtoFile);
        const editor = await vscode.window.showTextDocument(doc);
        
        // Execute numbering
        await protobufFieldNumberer.numberFields();
        
        // Check the result
        const updatedContent = doc.getText();
        
        // Check Order fields are numbered 1-4
        assert.ok(updatedContent.includes('string order_id = 1;'));
        assert.ok(updatedContent.includes('User customer = 2;'));
        assert.ok(updatedContent.includes('repeated Item items = 3;'));
        assert.ok(updatedContent.includes('double total_price = 4;'));
        
        // Check nested Item fields are numbered 1-3
        assert.ok(updatedContent.match(/Item[\s\S]*?string product_id = 1;/));
        assert.ok(updatedContent.match(/Item[\s\S]*?int32 quantity = 2;/));
        assert.ok(updatedContent.match(/Item[\s\S]*?double price = 3;/));
        
        // Close the editor
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    });
});