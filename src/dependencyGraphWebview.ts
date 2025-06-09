import * as vscode from 'vscode';
import { DependencyGraphAnalyzer, DependencyGraph } from './dependencyGraphAnalyzer';

export class DependencyGraphWebview {
    private panel: vscode.WebviewPanel | undefined;
    private analyzer: DependencyGraphAnalyzer;

    constructor(private context: vscode.ExtensionContext) {
        this.analyzer = new DependencyGraphAnalyzer();
    }

    async show(): Promise<void> {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'dependencyGraph',
            'ファイル依存グラフ',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        await this.updateContent();

        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openFile':
                        if (message.filePath) {
                            const document = await vscode.workspace.openTextDocument(message.filePath);
                            await vscode.window.showTextDocument(document);
                        }
                        break;
                    case 'refresh':
                        await this.updateContent();
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );
    }

    private async updateContent(): Promise<void> {
        if (!this.panel) {
            return;
        }

        try {
            const graph = await this.analyzer.analyzeWorkspace();
            this.panel.webview.html = this.getWebviewContent(graph);
        } catch (error) {
            vscode.window.showErrorMessage(`依存グラフの生成に失敗しました: ${error}`);
        }
    }

    private getWebviewContent(graph: DependencyGraph): string {
        const nodes = graph.nodes.map(node => ({
            id: node.id,
            label: node.id.split('/').pop() || node.id,
            title: node.filePath,
            color: node.hasCycle ? '#ff6b6b' : '#4ecdc4',
            shape: 'box'
        }));

        const edges = graph.edges.map(edge => ({
            from: edge.from,
            to: edge.to,
            arrows: 'to'
        }));

        return `<!DOCTYPE html>
        <html>
        <head>
            <title>ファイル依存グラフ</title>
            <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
            <style type="text/css">
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                #mynetworkid {
                    width: 100%;
                    height: calc(100vh - 80px);
                    border: 1px solid var(--vscode-panel-border);
                }
                .controls {
                    margin-bottom: 10px;
                }
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    margin-right: 8px;
                    cursor: pointer;
                    border-radius: 2px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                .legend {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: var(--vscode-panel-background);
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    border-radius: 4px;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .legend-color {
                    width: 16px;
                    height: 16px;
                    margin-right: 8px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <div class="controls">
                <button onclick="refreshGraph()">更新</button>
                <button onclick="fitNetwork()">全体表示</button>
                <button onclick="togglePhysics()">物理演算ON/OFF</button>
            </div>
            
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #4ecdc4;"></div>
                    <span>通常ファイル</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: #ff6b6b;"></div>
                    <span>循環依存あり</span>
                </div>
            </div>

            <div id="mynetworkid"></div>

            <script type="text/javascript">
                const vscode = acquireVsCodeApi();
                let network;
                let physicsEnabled = true;

                const nodes = new vis.DataSet(${JSON.stringify(nodes)});
                const edges = new vis.DataSet(${JSON.stringify(edges)});

                const data = {
                    nodes: nodes,
                    edges: edges
                };

                const options = {
                    layout: {
                        improvedLayout: true,
                        hierarchical: false
                    },
                    physics: {
                        enabled: true,
                        stabilization: {
                            iterations: 1000
                        },
                        barnesHut: {
                            gravitationalConstant: -8000,
                            centralGravity: 0.3,
                            springLength: 95,
                            springConstant: 0.04,
                            damping: 0.09
                        }
                    },
                    nodes: {
                        font: {
                            color: 'var(--vscode-editor-foreground)'
                        },
                        borderWidth: 2
                    },
                    edges: {
                        arrows: {
                            to: { enabled: true, scaleFactor: 1, type: 'arrow' }
                        },
                        color: {
                            color: 'var(--vscode-editor-foreground)',
                            opacity: 0.7
                        },
                        smooth: {
                            type: 'continuous'
                        }
                    },
                    interaction: {
                        hover: true,
                        tooltipDelay: 200
                    }
                };

                function initNetwork() {
                    const container = document.getElementById('mynetworkid');
                    network = new vis.Network(container, data, options);

                    network.on("click", function (params) {
                        if (params.nodes.length > 0) {
                            const nodeId = params.nodes[0];
                            const node = nodes.get(nodeId);
                            if (node && node.title) {
                                vscode.postMessage({
                                    command: 'openFile',
                                    filePath: node.title
                                });
                            }
                        }
                    });
                }

                function refreshGraph() {
                    vscode.postMessage({
                        command: 'refresh'
                    });
                }

                function fitNetwork() {
                    if (network) {
                        network.fit();
                    }
                }

                function togglePhysics() {
                    physicsEnabled = !physicsEnabled;
                    if (network) {
                        network.setOptions({ physics: { enabled: physicsEnabled } });
                    }
                }

                initNetwork();
            </script>
        </body>
        </html>`;
    }
}