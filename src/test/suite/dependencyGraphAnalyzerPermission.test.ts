import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DependencyGraphAnalyzer } from '../../dependencyGraphAnalyzer';
import * as globby from 'globby';

suite('DependencyGraphAnalyzer Permission Error Test Suite', () => {
    let analyzer: DependencyGraphAnalyzer;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        analyzer = new DependencyGraphAnalyzer();
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Should handle permission errors gracefully', async () => {
        // Mock globby to throw a permission error
        const permissionError = new Error("EACCES: permission denied, scandir '/Library/OSAnalytics'");
        sandbox.stub(globby, 'default').rejects(permissionError);

        // Spy on console.error and vscode.window.showErrorMessage
        const consoleErrorSpy = sandbox.spy(console, 'error');
        const showErrorMessageSpy = sandbox.spy(vscode.window, 'showErrorMessage');

        // Analyze workspace should not throw but return empty graph
        const graph = await analyzer.analyzeWorkspace();

        // Verify error was logged
        assert.ok(consoleErrorSpy.calledOnce, 'console.error should be called once');
        assert.ok(consoleErrorSpy.firstCall.args[0].includes('Error collecting files'), 
            'console.error should log the correct message');

        // Verify user-friendly error message was shown
        assert.ok(showErrorMessageSpy.calledOnce, 'vscode.window.showErrorMessage should be called once');
        assert.ok(showErrorMessageSpy.firstCall.args[0].includes('依存グラフの生成中にアクセス権限エラーが発生しました'), 
            'Error message should be shown to user');

        // Verify empty graph is returned
        assert.strictEqual(graph.nodes.length, 0, 'Graph should have no nodes');
        assert.strictEqual(graph.edges.length, 0, 'Graph should have no edges');
    });

    test('Should not follow symbolic links', async () => {
        // Create a spy on globby to check the options
        const globbySpy = sandbox.spy(globby, 'default');

        // Analyze workspace
        await analyzer.analyzeWorkspace();

        // Verify globby was called with correct options
        assert.ok(globbySpy.calledOnce, 'globby should be called once');
        const options = globbySpy.firstCall.args[1] as any;
        assert.ok(options, 'Options should be provided to globby');
        assert.strictEqual(options.followSymbolicLinks, false, 
            'followSymbolicLinks should be false to prevent scanning outside workspace');
        assert.strictEqual(options.onlyFiles, true, 
            'onlyFiles should be true to only scan files');
        assert.strictEqual(options.dot, false, 
            'dot should be false to exclude hidden files by default');
        assert.strictEqual(options.unique, true, 
            'unique should be true to ensure unique results');
    });

    test('Should remove absolute paths from filter patterns', async () => {
        // Create a spy on globby to check the patterns
        const globbySpy = sandbox.spy(globby, 'default');

        // Analyze workspace with absolute path filter
        await analyzer.analyzeWorkspace('/src');

        // Verify globby was called with relative patterns
        assert.ok(globbySpy.calledOnce, 'globby should be called once');
        const patterns = globbySpy.firstCall.args[0] as string[];
        assert.ok(Array.isArray(patterns), 'Patterns should be an array');
        
        // All patterns should be relative (not start with /)
        patterns.forEach((pattern: string) => {
            assert.ok(!pattern.startsWith('/'), 
                `Pattern "${pattern}" should not start with / to stay within workspace`);
        });

        // Should have patterns for src directory
        assert.ok(patterns.some((p: string) => p.includes('src/**/*.ts')), 
            'Should include TypeScript files in src directory');
    });
});