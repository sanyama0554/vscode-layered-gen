import * as vscode from 'vscode';

export interface DeadCodeConfig {
    ignoreGlobs: string[];
    maxAllowed: number;
    autoAnalyzeOnSave: boolean;
    knipConfig?: {
        entry?: string[];
        project?: string[];
        ignore?: string[];
    };
    eslintRules?: string[];
    coverageThreshold?: number;
}

export class DeadCodeConfigManager {
    private static readonly CONFIG_SECTION = 'vscode-layered-gen.deadcode';

    static getConfig(): DeadCodeConfig {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        
        return {
            ignoreGlobs: config.get<string[]>('ignoreGlobs', [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/coverage/**',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/*.d.ts'
            ]),
            maxAllowed: config.get<number>('maxAllowed', 100),
            autoAnalyzeOnSave: config.get<boolean>('autoAnalyzeOnSave', false),
            knipConfig: config.get<any>('knipConfig'),
            eslintRules: config.get<string[]>('eslintRules', ['no-unreachable']),
            coverageThreshold: config.get<number>('coverageThreshold', 0)
        };
    }

    static async updateConfig(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    static watchConfigChanges(callback: (config: DeadCodeConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.CONFIG_SECTION)) {
                callback(this.getConfig());
            }
        });
    }
}