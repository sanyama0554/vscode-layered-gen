import * as vscode from 'vscode';
import { DeadCodeConfigManager } from './deadCodeConfig';

export class DeadCodePresetCommand {
    static async configure(): Promise<void> {
        try {
            const currentConfig = DeadCodeConfigManager.getConfig();
            
            const options = [
                {
                    label: '🚀 Use NestJS Default Configuration',
                    description: 'Recommended for most NestJS projects',
                    detail: currentConfig.useDefaultNestJSConfig ? '(current)' : 'Optimized settings for NestJS',
                    useDefault: true
                },
                {
                    label: '⚙️ Use Custom Configuration',
                    description: 'Advanced users only',
                    detail: !currentConfig.useDefaultNestJSConfig ? '(current)' : 'Configure all settings manually',
                    useDefault: false
                }
            ];

            const selected = await vscode.window.showQuickPick(options, {
                placeHolder: 'Choose configuration mode for dead code analysis',
                ignoreFocusOut: true
            });

            if (!selected) {
                return;
            }

            await DeadCodeConfigManager.setUseDefaultConfig(selected.useDefault);
            
            if (selected.useDefault) {
                vscode.window.showInformationMessage(
                    '✅ Using optimized NestJS configuration. Dead code analysis is ready to use!'
                );
            } else {
                vscode.window.showInformationMessage(
                    '⚠️ Custom configuration enabled. Please configure individual settings in VS Code settings.'
                );
            }

            // Validate the new configuration
            const newConfig = DeadCodeConfigManager.getConfig();
            const validation = DeadCodeConfigManager.validateConfig(newConfig);
            
            if (!validation.isValid) {
                vscode.window.showErrorMessage(
                    `Configuration errors: ${validation.errors.join(', ')}`
                );
            } else if (validation.warnings.length > 0) {
                vscode.window.showWarningMessage(
                    `Configuration warnings: ${validation.warnings.join(', ')}`
                );
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to configure dead code analysis: ${error}`);
        }
    }


    static async showCurrentConfiguration(): Promise<void> {
        const config = DeadCodeConfigManager.getConfig();
        const validation = DeadCodeConfigManager.validateConfig(config);
        const defaultConfig = DeadCodeConfigManager.getNestJSDefaultConfig();
        
        const configInfo = [
            `**Status**: ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`,
            `**Configuration Mode**: ${config.useDefaultNestJSConfig ? '🚀 NestJS Default' : '⚙️ Custom'}`,
            `**Auto Analyze on Save**: ${config.autoAnalyzeOnSave ? 'Enabled' : 'Disabled'}`,
            `**Max Allowed Items**: ${config.maxAllowed}`,
            `**Ignore Patterns**: ${config.ignoreGlobs.length} patterns`,
            `**ESLint Rules**: ${config.eslintRules?.length || 0} rules`,
            `**Coverage Threshold**: ${config.coverageThreshold || 0}%`,
            '',
            `**Validation**: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}`,
            ...(validation.errors.length > 0 ? ['**Errors**:', ...validation.errors.map(e => `- ${e}`)] : []),
            ...(validation.warnings.length > 0 ? ['**Warnings**:', ...validation.warnings.map(w => `- ${w}`)] : [])
        ].join('\n');

        const panel = vscode.window.createWebviewPanel(
            'deadCodeConfig',
            'Dead Code Configuration',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dead Code Configuration</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; line-height: 1.6; }
                    .config-section { margin-bottom: 30px; }
                    .config-card { border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; margin: 16px 0; }
                    .config-current { border-color: #28a745; background-color: #f0fff4; }
                    .config-alternative { border-color: #6f42c1; background-color: #f8f4ff; }
                    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; font-size: 14px; }
                    .highlight { background: #fff3cd; padding: 2px 4px; border-radius: 3px; }
                    h3 { margin-top: 0; }
                    .recommendation { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px; padding: 12px; margin: 16px 0; }
                </style>
            </head>
            <body>
                <h1>🔍 Dead Code Analysis Configuration</h1>
                
                <div class="config-section">
                    <h2>Current Status</h2>
                    <pre>${configInfo}</pre>
                </div>
                
                <div class="config-section">
                    <h2>Configuration Options</h2>
                    
                    <div class="config-card ${config.useDefaultNestJSConfig ? 'config-current' : ''}">
                        <h3>🚀 NestJS Default Configuration ${config.useDefaultNestJSConfig ? '(Current)' : ''}</h3>
                        <p>Optimized settings for NestJS projects with sensible defaults.</p>
                        <ul>
                            <li><strong>Entry Point:</strong> <code>src/main.ts</code></li>
                            <li><strong>Project Files:</strong> <code>src/**/*.ts</code></li>
                            <li><strong>Ignored Files:</strong> Tests, specs, node_modules, dist, etc.</li>
                            <li><strong>ESLint Rules:</strong> no-unreachable</li>
                        </ul>
                        ${config.useDefaultNestJSConfig ? '' : '<div class="recommendation">💡 <strong>Recommended:</strong> Use this configuration for most NestJS projects.</div>'}
                    </div>
                    
                    <div class="config-card ${!config.useDefaultNestJSConfig ? 'config-current' : 'config-alternative'}">
                        <h3>⚙️ Custom Configuration ${!config.useDefaultNestJSConfig ? '(Current)' : ''}</h3>
                        <p>Advanced configuration for users who need specific settings.</p>
                        <ul>
                            <li>Configure all settings manually in VS Code settings</li>
                            <li>Full control over ignore patterns, entry points, and rules</li>
                            <li>Requires knowledge of knip configuration</li>
                        </ul>
                        ${!config.useDefaultNestJSConfig ? '<div class="recommendation">⚠️ Make sure all required settings are properly configured.</div>' : ''}
                    </div>
                </div>
                
                <div class="config-section">
                    <h2>Quick Actions</h2>
                    <p>Use the command <span class="highlight">"Configure Dead Code Preset"</span> from the Command Palette to switch between configurations.</p>
                </div>
            </body>
            </html>
        `;
    }
}