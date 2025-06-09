import * as assert from 'assert';
import * as vscode from 'vscode';
import { DependencyTreeProvider, DependencyItem } from '../../dependencyTreeProvider';

suite('DependencyTreeProvider Test Suite', () => {
    let treeProvider: DependencyTreeProvider;

    suiteSetup(() => {
        treeProvider = new DependencyTreeProvider();
    });

    test('Should create tree provider instance', () => {
        assert.ok(treeProvider, 'Tree provider should be created');
        assert.ok(treeProvider.onDidChangeTreeData, 'Should have onDidChangeTreeData event');
    });

    test('Should provide tree items', async () => {
        const children = await treeProvider.getChildren();
        assert.ok(Array.isArray(children), 'Should return an array');
    });

    test('Should handle getTreeItem correctly', () => {
        const testItem = new DependencyItem(
            'test.ts',
            vscode.TreeItemCollapsibleState.None,
            '/path/to/test.ts',
            false
        );

        const treeItem = treeProvider.getTreeItem(testItem);
        assert.strictEqual(treeItem.label, 'test.ts');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.None);
    });

    test('Should create dependency item with cycle warning', () => {
        const testItem = new DependencyItem(
            'cyclic.ts',
            vscode.TreeItemCollapsibleState.None,
            '/path/to/cyclic.ts',
            true
        );

        assert.ok(typeof testItem.tooltip === 'string' && testItem.tooltip.includes('循環依存あり'), 'Should include cycle warning in tooltip');
        assert.ok(testItem.iconPath, 'Should have warning icon for cyclic dependencies');
    });

    test('Should refresh tree data', () => {
        let eventFired = false;
        const disposable = treeProvider.onDidChangeTreeData(() => {
            eventFired = true;
        });

        treeProvider.refresh();
        
        // Give some time for the async operation
        setTimeout(() => {
            disposable.dispose();
        }, 1000);
    });
});