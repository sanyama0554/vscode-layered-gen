import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as sinon from 'sinon';
import { DeadCodeAnalyzer, DeadCodeItem } from '../../../../features/dead-code/deadCodeAnalyzer';

suite('DeadCodeAnalyzer Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let analyzer: DeadCodeAnalyzer;
    const testWorkspaceRoot = '/test/workspace';

    setup(() => {
        sandbox = sinon.createSandbox();
        analyzer = new DeadCodeAnalyzer(testWorkspaceRoot);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should create cache directory on analysis', async () => {
        const mkdirStub = sandbox.stub(fs, 'mkdir').resolves();
        const execStub = sandbox.stub().resolves({ stdout: '{}' });
        sandbox.stub(analyzer as any, 'execAsync').value(execStub);
        sandbox.stub(fs, 'writeFile').resolves();

        await analyzer.analyze();

        assert.strictEqual(mkdirStub.calledOnce, true);
        assert.strictEqual(
            mkdirStub.firstCall.args[0],
            path.join(testWorkspaceRoot, '.cache', 'deadcode')
        );
    });

    test('should detect unused exports from knip', async () => {
        const knipOutput = JSON.stringify({
            files: ['src/unused.ts'],
            exports: {
                'src/utils.ts': ['unusedFunction', 'unusedClass']
            }
        });

        sandbox.stub(fs, 'mkdir').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'access').rejects(); // knip.json doesn't exist
        
        const execStub = sandbox.stub().resolves({ stdout: knipOutput });
        sandbox.stub(analyzer as any, 'execAsync').value(execStub);

        const report = await analyzer.analyze();

        assert.strictEqual(report.items.length, 3);
        assert.strictEqual(report.items[0].type, 'unused-file');
        assert.strictEqual(report.items[0].filePath, 'src/unused.ts');
        assert.strictEqual(report.items[1].type, 'unused-export');
        assert.strictEqual(report.items[1].name, 'unusedFunction');
    });

    test('should detect unreachable code from eslint', async () => {
        const eslintOutput = JSON.stringify([{
            filePath: '/test/workspace/src/service.ts',
            messages: [{
                ruleId: 'no-unreachable',
                line: 42,
                column: 8,
                message: 'Unreachable code.'
            }]
        }]);

        sandbox.stub(fs, 'mkdir').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        
        const execStub = sandbox.stub()
            .onFirstCall().resolves({ stdout: '{}' }) // knip
            .onSecondCall().resolves({ stdout: eslintOutput }); // eslint
        sandbox.stub(analyzer as any, 'execAsync').value(execStub);

        const report = await analyzer.analyze();

        const unreachableItems = report.items.filter(item => item.type === 'unreachable');
        assert.strictEqual(unreachableItems.length, 1);
        assert.strictEqual(unreachableItems[0].line, 42);
        assert.strictEqual(unreachableItems[0].column, 8);
    });

    test('should detect zero coverage code', async () => {
        const coverageData = {
            '/test/workspace/src/component.tsx': {
                statementMap: {
                    '0': {
                        start: { line: 10, column: 4 },
                        end: { line: 10, column: 20 }
                    },
                    '1': {
                        start: { line: 15, column: 4 },
                        end: { line: 15, column: 30 }
                    }
                },
                s: { '0': 0, '1': 5 } // Statement 0 has zero coverage
            }
        };

        sandbox.stub(fs, 'mkdir').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'readFile').resolves(JSON.stringify(coverageData));
        sandbox.stub(analyzer as any, 'fileExists').resolves(true);
        
        const execStub = sandbox.stub().resolves({ stdout: '{}' });
        sandbox.stub(analyzer as any, 'execAsync').value(execStub);

        const report = await analyzer.analyze();

        const zeroCoverageItems = report.items.filter(item => item.type === 'zero-coverage');
        assert.strictEqual(zeroCoverageItems.length, 1);
        assert.strictEqual(zeroCoverageItems[0].line, 10);
        assert.strictEqual(zeroCoverageItems[0].column, 4);
    });

    test('should deduplicate items', async () => {
        const items: DeadCodeItem[] = [
            {
                type: 'unused-export',
                filePath: 'src/utils.ts',
                name: 'duplicate',
                description: 'Unused export: duplicate'
            },
            {
                type: 'unused-export',
                filePath: 'src/utils.ts',
                name: 'duplicate',
                description: 'Unused export: duplicate'
            },
            {
                type: 'unused-export',
                filePath: 'src/utils.ts',
                name: 'different',
                description: 'Unused export: different'
            }
        ];

        const deduplicatedItems = (analyzer as any).deduplicateItems(items);
        assert.strictEqual(deduplicatedItems.length, 2);
    });

    test('should save and retrieve report', async () => {
        const report = {
            timestamp: new Date(),
            items: [{
                type: 'unused-file' as const,
                filePath: 'test.ts',
                description: 'Test'
            }]
        };

        const reportPath = path.join(testWorkspaceRoot, '.cache', 'deadcode', 'deadcode-report.json');
        
        sandbox.stub(fs, 'mkdir').resolves();
        const writeStub = sandbox.stub(fs, 'writeFile').resolves();
        const readStub = sandbox.stub(fs, 'readFile').resolves(JSON.stringify(report));

        await (analyzer as any).saveReport(report);
        assert.strictEqual(writeStub.calledOnce, true);
        assert.strictEqual(writeStub.firstCall.args[0], reportPath);

        const retrievedReport = await analyzer.getLastReport();
        assert.deepStrictEqual(retrievedReport!.items, report.items);
    });

    test('should handle errors gracefully', async () => {
        sandbox.stub(fs, 'mkdir').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        
        const execStub = sandbox.stub().rejects(new Error('Command failed'));
        sandbox.stub(analyzer as any, 'execAsync').value(execStub);

        const report = await analyzer.analyze();
        assert.strictEqual(report.items.length, 0);
    });
});