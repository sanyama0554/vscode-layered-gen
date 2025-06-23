import * as assert from 'assert';
import * as vscode from 'vscode';
import { DependencyTreeProvider, DependencyItem } from '../../../../features/dependency-graph/dependencyTreeProvider';

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
        // 初期化時は空であることを確認（自動リフレッシュが無効化されているため）
        assert.strictEqual(children.length, 0, 'Should return empty array on initialization');
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

    test('Should refresh tree data', async () => {
        let eventFired = false;
        const disposable = treeProvider.onDidChangeTreeData(() => {
            eventFired = true;
        });

        try {
            await treeProvider.refresh();
            // イベントが発火したことを確認
            assert.ok(eventFired, 'onDidChangeTreeData event should be fired after refresh');
        } finally {
            disposable.dispose();
        }
    });

    test('Should handle cancellation during refresh', async () => {
        const cancellationTokenSource = new vscode.CancellationTokenSource();
        
        // すぐにキャンセル
        cancellationTokenSource.cancel();
        
        try {
            await treeProvider.refresh(cancellationTokenSource.token);
            assert.fail('Should throw error on cancellation');
        } catch (error: any) {
            assert.strictEqual(error.message, 'Analysis cancelled', 'Should throw cancellation error');
        } finally {
            cancellationTokenSource.dispose();
        }
    });
});