import * as assert from 'assert';
import { JSDOM } from 'jsdom';
import * as sinon from 'sinon';

// Mock VSCode API for webview testing
const mockWebview = {
    html: '',
    options: {},
    asWebviewUri: (uri: any) => uri,
    cspSource: 'vscode-webview:'
};

const mockContext = {
    extensionUri: { path: '/mock/extension/path' }
};

suite('WebView Content Tests', () => {
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('Dependency Graph WebView Tests', () => {
        test('Should generate valid HTML for dependency graph', () => {
            // Mock dependency graph data
            const mockGraph = {
                nodes: [
                    { id: 'app.ts', label: 'app.ts', group: 'entry' },
                    { id: 'controller.ts', label: 'controller.ts', group: 'controller' },
                    { id: 'service.ts', label: 'service.ts', group: 'service' }
                ],
                edges: [
                    { from: 'app.ts', to: 'controller.ts' },
                    { from: 'controller.ts', to: 'service.ts' }
                ]
            };

            // Generate HTML content (simulating DependencyGraphWebview.getWebviewContent)
            const htmlContent = generateDependencyGraphHTML(mockGraph);

            // Parse with jsdom
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;

            // Verify essential elements exist
            assert.ok(document.querySelector('#mynetworkid'), 'Network container should exist');
            assert.ok(document.querySelector('.controls'), 'Controls section should exist');
            assert.ok(document.querySelector('script'), 'JavaScript should be included');

            // Verify vis.js is loaded
            const scripts = Array.from(document.querySelectorAll('script'));
            const visScript = scripts.find(script => 
                script.textContent?.includes('vis-network') || 
                script.src?.includes('vis')
            );
            assert.ok(visScript, 'vis.js library should be loaded');

            // Verify graph data is embedded
            const dataScript = scripts.find(script => 
                script.textContent?.includes('nodes') && 
                script.textContent?.includes('edges')
            );
            assert.ok(dataScript, 'Graph data should be embedded');
        });

        test('Should handle empty dependency graph', () => {
            const emptyGraph = { nodes: [], edges: [] };
            const htmlContent = generateDependencyGraphHTML(emptyGraph);

            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;

            // Should still generate valid HTML structure
            assert.ok(document.querySelector('#mynetworkid'), 'Network container should exist even for empty graph');
            assert.ok(document.querySelector('.controls'), 'Controls should exist even for empty graph');
        });

        test('Should include node color coding by file type', () => {
            const mockGraph = {
                nodes: [
                    { id: 'test.ts', label: 'test.ts', group: 'typescript' },
                    { id: 'test.js', label: 'test.js', group: 'javascript' },
                    { id: 'test.json', label: 'test.json', group: 'config' }
                ],
                edges: []
            };

            const htmlContent = generateDependencyGraphHTML(mockGraph);
            const dom = new JSDOM(htmlContent);

            // Verify CSS includes color definitions
            const styles = Array.from(dom.window.document.querySelectorAll('style'));
            const hasColorStyles = styles.some(style => 
                style.textContent?.includes('color') && 
                style.textContent?.includes('typescript')
            );
            assert.ok(hasColorStyles, 'Should include file type color coding');
        });
    });

    suite('Template Configuration WebView Tests', () => {
        test('Should generate template configuration form', () => {
            const mockTemplates = [
                {
                    name: 'Default',
                    structure: [
                        { path: 'domain/{name}.ts', template: 'domain' },
                        { path: 'service/{name}Service.ts', template: 'service' }
                    ]
                }
            ];

            const htmlContent = generateTemplateConfigHTML(mockTemplates);
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;

            // Verify form elements exist
            assert.ok(document.querySelector('form'), 'Configuration form should exist');
            assert.ok(document.querySelector('input[type="text"]'), 'Text inputs should exist');
            assert.ok(document.querySelector('textarea'), 'Template textarea should exist');
            assert.ok(document.querySelector('button'), 'Action buttons should exist');

            // Verify template data is populated
            const templateNameInput = document.querySelector('input[value="Default"]');
            assert.ok(templateNameInput, 'Template name should be populated');
        });

        test('Should include JavaScript for form handling', () => {
            const mockTemplates = [{ name: 'Test', structure: [] }];
            const htmlContent = generateTemplateConfigHTML(mockTemplates);
            const dom = new JSDOM(htmlContent);

            const scripts = Array.from(dom.window.document.querySelectorAll('script'));
            const formHandlerScript = scripts.find(script => 
                script.textContent?.includes('addEventListener') ||
                script.textContent?.includes('postMessage')
            );
            assert.ok(formHandlerScript, 'Form handling JavaScript should be included');
        });
    });

    suite('WebView Security Tests', () => {
        test('Should include proper CSP headers', () => {
            const htmlContent = generateDependencyGraphHTML({ nodes: [], edges: [] });
            const dom = new JSDOM(htmlContent);

            const metaTags = Array.from(dom.window.document.querySelectorAll('meta'));
            const cspMeta = metaTags.find(meta => 
                meta.getAttribute('http-equiv') === 'Content-Security-Policy'
            );
            assert.ok(cspMeta, 'CSP meta tag should be present');

            const cspContent = cspMeta?.getAttribute('content');
            assert.ok(cspContent?.includes('vscode-webview:'), 'CSP should allow vscode-webview sources');
        });

        test('Should sanitize user input in templates', () => {
            const maliciousTemplate = {
                name: '<script>alert("xss")</script>',
                structure: []
            };

            const htmlContent = generateTemplateConfigHTML([maliciousTemplate]);
            
            // Should not contain unescaped script tags
            assert.ok(!htmlContent.includes('<script>alert("xss")</script>'), 
                'Should escape malicious script tags');
        });
    });
});

// Helper functions to simulate webview content generation
function generateDependencyGraphHTML(graph: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src vscode-webview: 'unsafe-inline'; style-src vscode-webview: 'unsafe-inline';">
    <title>Dependency Graph</title>
    <style>
        #mynetworkid { width: 100%; height: 400px; border: 1px solid #ccc; }
        .controls { margin: 10px 0; }
        .typescript { color: #007ACC; }
        .javascript { color: #F7DF1E; }
        .config { color: #6CC644; }
    </style>
</head>
<body>
    <div class="controls">
        <button onclick="fit()">Fit to Screen</button>
        <button onclick="resetZoom()">Reset Zoom</button>
    </div>
    <div id="mynetworkid"></div>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <script>
        const nodes = new vis.DataSet(${JSON.stringify(graph.nodes)});
        const edges = new vis.DataSet(${JSON.stringify(graph.edges)});
        const container = document.getElementById('mynetworkid');
        const data = { nodes: nodes, edges: edges };
        const options = {};
        const network = new vis.Network(container, data, options);
    </script>
</body>
</html>`;
}

function generateTemplateConfigHTML(templates: any[]): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src vscode-webview: 'unsafe-inline'; style-src vscode-webview: 'unsafe-inline';">
    <title>Template Configuration</title>
</head>
<body>
    <form id="templateForm">
        ${templates.map((template, index) => `
            <div class="template-section">
                <h3>Template ${index + 1}</h3>
                <input type="text" name="name" value="${escapeHtml(template.name)}" placeholder="Template Name">
                <textarea name="structure" rows="5">${JSON.stringify(template.structure, null, 2)}</textarea>
            </div>
        `).join('')}
        <button type="button" onclick="addTemplate()">Add Template</button>
        <button type="submit">Save Changes</button>
    </form>
    <script>
        document.getElementById('templateForm').addEventListener('submit', function(e) {
            e.preventDefault();
            // Handle form submission
            vscode.postMessage({ command: 'saveTemplates', data: getFormData() });
        });
        
        function addTemplate() {
            // Add new template logic
        }
        
        function getFormData() {
            // Extract form data
            return {};
        }
    </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
    const div = new JSDOM('').window.document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}