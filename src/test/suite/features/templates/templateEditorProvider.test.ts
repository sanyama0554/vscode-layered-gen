import * as assert from 'assert';
import * as vscode from 'vscode';
import { TemplateEditorProvider } from '../../../../features/templates/templateEditorProvider';
import { TemplateManager } from '../../../../features/templates/templateManager';

suite('TemplateEditorProvider Test Suite', () => {
    let context: vscode.ExtensionContext;
    let templateManager: TemplateManager;
    let templateEditorProvider: TemplateEditorProvider;

    setup(() => {
        // Mock extension context
        context = {
            subscriptions: []
        } as any;
        
        templateManager = new TemplateManager();
        templateEditorProvider = new TemplateEditorProvider(context, templateManager);
    });

    test('Should create template editor provider instance', () => {
        assert.ok(templateEditorProvider);
    });

    test('Should have showTemplateConfiguration method', () => {
        assert.ok(typeof templateEditorProvider.showTemplateConfiguration === 'function');
    });

    test('Should have showTemplateRegistration method', () => {
        assert.ok(typeof templateEditorProvider.showTemplateRegistration === 'function');
    });
});