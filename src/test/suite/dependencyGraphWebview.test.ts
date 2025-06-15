import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { DependencyGraphWebview } from '../../dependencyGraphWebview';

suite('DependencyGraphWebview Test Suite', () => {
    let context: vscode.ExtensionContext;
    let webview: DependencyGraphWebview;
    let sandbox: sinon.SinonSandbox;
    let webviewPanel: vscode.WebviewPanel;
    let postMessageStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();
        
        // Mock WebviewPanel
        postMessageStub = sandbox.stub();
        webviewPanel = {
            webview: {
                html: '',
                postMessage: postMessageStub,
                onDidReceiveMessage: sandbox.stub()
            },
            reveal: sandbox.stub(),
            onDidDispose: sandbox.stub()
        } as any;

        // Mock vscode.window.createWebviewPanel
        sandbox.stub(vscode.window, 'createWebviewPanel').returns(webviewPanel);

        // Mock extension context
        context = {
            subscriptions: [],
            workspaceState: {
                get: sandbox.stub().returns(''),
                update: sandbox.stub().returns(Promise.resolve())
            }
        } as any;

        webview = new DependencyGraphWebview(context);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Should create webview panel on show', async () => {
        await webview.show();
        
        assert.ok((vscode.window.createWebviewPanel as sinon.SinonStub).calledOnce);
        assert.ok((vscode.window.createWebviewPanel as sinon.SinonStub).calledWith(
            'dependencyGraph',
            'ファイル依存グラフ',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        ));
    });

    test('Should reveal existing panel if already shown', async () => {
        // First show
        await webview.show();
        
        // Second show
        await webview.show();
        
        assert.ok((webviewPanel.reveal as sinon.SinonStub).calledOnce);
        assert.strictEqual((vscode.window.createWebviewPanel as sinon.SinonStub).callCount, 1);
    });

    test('Should handle concurrent filter updates correctly', async () => {
        await webview.show();
        
        // Get the message handler
        const onDidReceiveMessage = (webviewPanel.webview.onDidReceiveMessage as sinon.SinonStub);
        const messageHandler = onDidReceiveMessage.getCall(0).args[0];

        // Simulate concurrent filter updates
        const promise1 = messageHandler({ command: 'applyFilter', filterPattern: 'test1' });
        const promise2 = messageHandler({ command: 'applyFilter', filterPattern: 'test2' });

        await Promise.all([promise1, promise2]);

        // Should send hideLoading message for the blocked request
        const hideLoadingCalls = postMessageStub.getCalls().filter(call => 
            call.args[0].command === 'hideLoading'
        );
        assert.ok(hideLoadingCalls.length >= 1, 'Should send hideLoading message for blocked requests');
    });

    test('Should save filter pattern to workspace state', async () => {
        await webview.show();
        
        const onDidReceiveMessage = (webviewPanel.webview.onDidReceiveMessage as sinon.SinonStub);
        const messageHandler = onDidReceiveMessage.getCall(0).args[0];

        await messageHandler({ command: 'applyFilter', filterPattern: 'src/**/*.ts' });

        assert.ok((context.workspaceState.update as sinon.SinonStub).calledWith(
            'dependencyGraphFilter',
            'src/**/*.ts'
        ));
    });

    test('Should load saved filter pattern on initialization', async () => {
        (context.workspaceState.get as sinon.SinonStub).returns('saved-filter');
        
        const newWebview = new DependencyGraphWebview(context);
        await newWebview.show();

        // Check that the saved filter is included in the HTML
        assert.ok(webviewPanel.webview.html.includes('saved-filter'));
    });

    test('Should handle errors gracefully', async () => {
        await webview.show();
        
        // Mock analyzer to throw error
        const analyzerStub = sandbox.stub().rejects(new Error('Test error'));
        (webview as any).analyzer = { analyzeWorkspace: analyzerStub };

        const showErrorMessageStub = sandbox.stub(vscode.window, 'showErrorMessage');

        const onDidReceiveMessage = (webviewPanel.webview.onDidReceiveMessage as sinon.SinonStub);
        const messageHandler = onDidReceiveMessage.getCall(0).args[0];

        await messageHandler({ command: 'refresh' });

        assert.ok(showErrorMessageStub.calledOnce);
        assert.ok(showErrorMessageStub.calledWith('依存グラフの生成に失敗しました: Error: Test error'));
        
        // Should send hideLoading message on error
        const hideLoadingCalls = postMessageStub.getCalls().filter(call => 
            call.args[0].command === 'hideLoading'
        );
        assert.ok(hideLoadingCalls.length >= 1, 'Should send hideLoading message on error');
    });

    test('Should include proper debounce delay in HTML', async () => {
        await webview.show();
        
        // Check that the HTML contains the increased debounce delay
        assert.ok(webviewPanel.webview.html.includes('setTimeout(applyFilter, 1000)'));
        assert.ok(!webviewPanel.webview.html.includes('setTimeout(applyFilter, 300)'));
    });

    test('Should include loading state management in HTML', async () => {
        await webview.show();
        
        // Check that the HTML contains the loading state management code
        assert.ok(webviewPanel.webview.html.includes('let isFiltering = false;'));
        assert.ok(webviewPanel.webview.html.includes('if (isFiltering)'));
        assert.ok(webviewPanel.webview.html.includes('isFiltering = true;'));
        assert.ok(webviewPanel.webview.html.includes('case \'hideLoading\':'));
    });
});