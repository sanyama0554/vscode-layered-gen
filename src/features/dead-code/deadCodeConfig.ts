import * as vscode from 'vscode';

export interface DeadCodeConfig {
    enabled: boolean;
    ignoreGlobs: string[];
    maxAllowed: number;
    autoAnalyzeOnSave: boolean;
    useDefaultNestJSConfig: boolean;
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

    private static readonly NESTJS_DEFAULT_CONFIG = {
        ignoreGlobs: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/.git/**',
            '**/coverage/**',
            '**/*.test.ts',
            '**/*.spec.ts',
            '**/*.d.ts',
            '**/test/**',
            '**/*.e2e-spec.ts'
        ],
        knipConfig: {
            entry: ['src/main.ts'],
            project: ['src/**/*.ts']
        },
        eslintRules: ['no-unreachable'],
        coverageThreshold: 0
    };

    static getConfig(): DeadCodeConfig {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const useDefault = config.get<boolean>('useDefaultNestJSConfig', true);
        
        const baseConfig = {
            enabled: config.get<boolean>('enabled', true),
            maxAllowed: config.get<number>('maxAllowed', 100),
            autoAnalyzeOnSave: config.get<boolean>('autoAnalyzeOnSave', false),
            useDefaultNestJSConfig: useDefault
        };

        if (useDefault) {
            return {
                ...baseConfig,
                ignoreGlobs: this.NESTJS_DEFAULT_CONFIG.ignoreGlobs,
                knipConfig: this.NESTJS_DEFAULT_CONFIG.knipConfig,
                eslintRules: this.NESTJS_DEFAULT_CONFIG.eslintRules,
                coverageThreshold: this.NESTJS_DEFAULT_CONFIG.coverageThreshold
            };
        }

        return {
            ...baseConfig,
            ignoreGlobs: config.get<string[]>('ignoreGlobs', this.NESTJS_DEFAULT_CONFIG.ignoreGlobs),
            knipConfig: config.get<any>('knipConfig', this.NESTJS_DEFAULT_CONFIG.knipConfig),
            eslintRules: config.get<string[]>('eslintRules', this.NESTJS_DEFAULT_CONFIG.eslintRules),
            coverageThreshold: config.get<number>('coverageThreshold', this.NESTJS_DEFAULT_CONFIG.coverageThreshold)
        };
    }

    static getNestJSDefaultConfig() {
        return this.NESTJS_DEFAULT_CONFIG;
    }

    static async updateConfig(key: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    static async setUseDefaultConfig(useDefault: boolean): Promise<void> {
        await this.updateConfig('useDefaultNestJSConfig', useDefault);
        
        if (useDefault) {
            // デフォルト設定を使う場合、カスタム設定をクリア
            await this.updateConfig('ignoreGlobs', undefined);
            await this.updateConfig('knipConfig', undefined);
            await this.updateConfig('eslintRules', undefined);
            await this.updateConfig('coverageThreshold', undefined);
        }
    }

    static watchConfigChanges(callback: (config: DeadCodeConfig) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.CONFIG_SECTION)) {
                callback(this.getConfig());
            }
        });
    }

    static validateConfig(config: DeadCodeConfig): { isValid: boolean; errors: string[]; warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!config.enabled) {
            warnings.push('Dead code analysis is disabled');
        }

        if (config.ignoreGlobs.length === 0) {
            errors.push('Ignore patterns cannot be empty');
        }

        if (config.maxAllowed < 0) {
            errors.push('Maximum allowed dead code items must be >= 0');
        }

        if (config.coverageThreshold !== undefined && (config.coverageThreshold < 0 || config.coverageThreshold > 100)) {
            errors.push('Coverage threshold must be between 0 and 100');
        }

        if (config.knipConfig) {
            if (config.knipConfig.entry && config.knipConfig.entry.length === 0) {
                errors.push('Knip entry points cannot be empty');
            }
            if (config.knipConfig.project && config.knipConfig.project.length === 0) {
                errors.push('Knip project patterns cannot be empty');
            }
        }

        if (!config.useDefaultNestJSConfig && (!config.knipConfig || !config.knipConfig.entry)) {
            warnings.push('Custom configuration without entry points may not detect unused exports properly');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}