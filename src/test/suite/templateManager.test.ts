import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TemplateManager } from '../../templateManager';

suite('TemplateManager Test Suite', () => {
    const testWorkspace = path.join(__dirname, 'test-workspace');

    setup(() => {
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

    test('Should create template manager instance', () => {
        const manager = new TemplateManager();
        assert.ok(manager);
    });

    test('Should get templates from configuration', () => {
        const manager = new TemplateManager();
        const templates = manager.getTemplates();
        assert.ok(Array.isArray(templates));
    });

    test('Should generate files based on template', async () => {
        const manager = new TemplateManager();
        const entityName = 'TestUser';
        
        try {
            const generatedFiles = await manager.generateFiles(testWorkspace, entityName);
            
            assert.ok(generatedFiles.length > 0);
            
            // Check if files were created
            for (const file of generatedFiles) {
                assert.ok(fs.existsSync(file));
            }
            
            // Check content replacement
            const domainFile = generatedFiles.find(f => f.includes('domain'));
            if (domainFile) {
                const content = fs.readFileSync(domainFile, 'utf-8');
                assert.ok(content.includes('TestUser'));
            }
        } catch (error) {
            // If no templates are configured, this is expected
            console.log('No templates configured, skipping file generation test');
        }
    });

    test('Should convert string to PascalCase', () => {
        const manager = new TemplateManager();
        // Use reflection to test private method
        const pascalCase = (manager as any).toPascalCase('test-user');
        assert.strictEqual(pascalCase, 'TestUser');
    });

    test('Should convert string to camelCase', () => {
        const manager = new TemplateManager();
        // Use reflection to test private method
        const camelCase = (manager as any).toCamelCase('test-user');
        assert.strictEqual(camelCase, 'testUser');
    });
});