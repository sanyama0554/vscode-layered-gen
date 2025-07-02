import * as assert from 'assert';
import * as vscode from 'vscode';
import { DeadCodeTreeProvider, DeadCodeTreeItem } from '../../../../features/dead-code/deadCodeTreeProvider';
import { DeadCodeReport } from '../../../../features/dead-code/deadCodeAnalyzer';

suite('DeadCodeTreeProvider Test Suite', () => {
    let provider: DeadCodeTreeProvider;
    const testWorkspaceRoot = '/test/workspace';

    setup(() => {
        provider = new DeadCodeTreeProvider(testWorkspaceRoot);
    });

    test('should return empty array when no report', async () => {
        const children = await provider.getChildren();
        assert.strictEqual(children.length, 0);
    });

    test('should return categories for top level', async () => {
        const report: DeadCodeReport = {
            timestamp: new Date(),
            items: [
                {
                    type: 'unused-file',
                    filePath: 'src/unused.ts',
                    description: 'Unused file'
                },
                {
                    type: 'unused-export',
                    filePath: 'src/utils.ts',
                    name: 'unusedFunc',
                    description: 'Unused export: unusedFunc'
                },
                {
                    type: 'unreachable',
                    filePath: 'src/service.ts',
                    line: 42,
                    description: 'Unreachable code'
                }
            ]
        };

        provider.refresh(report);
        const children = await provider.getChildren();

        assert.strictEqual(children.length, 3);
        assert.strictEqual(children[0].label, '未使用ファイル (1)');
        assert.strictEqual(children[1].label, '未使用エクスポート (1)');
        assert.strictEqual(children[2].label, '到達不能コード (1)');
    });

    test('should return items for category', async () => {
        const report: DeadCodeReport = {
            timestamp: new Date(),
            items: [
                {
                    type: 'unused-export',
                    filePath: 'src/utils.ts',
                    name: 'func1',
                    description: 'Unused export: func1'
                },
                {
                    type: 'unused-export',
                    filePath: 'src/helpers.ts',
                    name: 'func2',
                    description: 'Unused export: func2'
                }
            ]
        };

        provider.refresh(report);
        const categories = await provider.getChildren();
        const items = await provider.getChildren(categories[0]);

        assert.strictEqual(items.length, 2);
        assert.strictEqual(items[0].label, 'utils.ts → func1');
        assert.strictEqual(items[1].label, 'helpers.ts → func2');
    });

    test('should create tree item with correct properties', () => {
        const deadCodeItem = {
            type: 'unreachable' as const,
            filePath: 'src/service.ts',
            line: 42,
            column: 8,
            description: 'Unreachable code'
        };

        const treeItem = new DeadCodeTreeItem(
            'service.ts:42',
            vscode.TreeItemCollapsibleState.None,
            deadCodeItem,
            testWorkspaceRoot
        );

        assert.strictEqual(treeItem.label, 'service.ts:42');
        assert.strictEqual(treeItem.tooltip, 'Unreachable code');
        assert.strictEqual(treeItem.contextValue, 'deadCodeItem');
        assert.ok(treeItem.command);
        assert.strictEqual(treeItem.command.command, 'vscode.open');
    });

    test('should create category tree item', () => {
        const treeItem = new DeadCodeTreeItem(
            '未使用ファイル (5)',
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            testWorkspaceRoot,
            'unused-file',
            'file'
        );

        assert.strictEqual(treeItem.label, '未使用ファイル (5)');
        assert.strictEqual(treeItem.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
        assert.strictEqual(treeItem.contextValue, 'deadCodeCategory');
        assert.strictEqual(treeItem.command, undefined);
    });

    test('should format item labels correctly', async () => {
        const report: DeadCodeReport = {
            timestamp: new Date(),
            items: [
                {
                    type: 'unused-file',
                    filePath: 'src/components/Button.tsx',
                    description: 'Unused file'
                },
                {
                    type: 'unused-export',
                    filePath: 'src/utils/helpers.ts',
                    name: 'formatDate',
                    description: 'Unused export: formatDate'
                },
                {
                    type: 'unreachable',
                    filePath: 'src/services/api.ts',
                    line: 100,
                    description: 'Unreachable code'
                }
            ]
        };

        provider.refresh(report);
        const categories = await provider.getChildren();
        
        // Get items for each category
        const unusedFiles = await provider.getChildren(categories[0]);
        assert.strictEqual(unusedFiles[0].label, 'Button.tsx');

        const unusedExports = await provider.getChildren(categories[1]);
        assert.strictEqual(unusedExports[0].label, 'helpers.ts → formatDate');

        const unreachableCode = await provider.getChildren(categories[2]);
        assert.strictEqual(unreachableCode[0].label, 'api.ts:100');
    });
});