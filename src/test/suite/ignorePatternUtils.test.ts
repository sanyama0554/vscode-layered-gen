import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { IgnorePatternUtils } from '../../ignorePatternUtils';

suite('IgnorePatternUtils Test Suite', () => {
    let testWorkspaceDir: string;
    
    suiteSetup(async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        testWorkspaceDir = workspaceFolder.uri.fsPath;
    });

    suiteTeardown(async () => {
        // Clean up test files
        const filesToClean = ['.depgraphignore', '.gitignore'];
        for (const file of filesToClean) {
            const filePath = path.join(testWorkspaceDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);
    });

    test('Should use VSCode settings when available', async () => {
        // Set VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        const testPatterns = ['**/*.spec.ts', 'test/**', 'mock/**'];
        await config.update('exclude', testPatterns, vscode.ConfigurationTarget.Workspace);

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        assert.deepStrictEqual(patterns, testPatterns);
    });

    test('Should parse .depgraphignore file correctly', async () => {
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);

        // Create .depgraphignore file
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        const content = `
# Comment line
node_modules/
dist/
*.spec.ts
test/**

# Negation pattern
!test/important.ts
`;
        fs.writeFileSync(depgraphIgnorePath, content);

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        assert.ok(patterns.includes('**/node_modules/**'));
        assert.ok(patterns.includes('**/dist/**'));
        assert.ok(patterns.includes('**/*.spec.ts'));
        assert.ok(patterns.includes('**/test/**'));
        assert.ok(!patterns.includes('**/test/important.ts'));
    });

    test('Should fallback to .gitignore when .depgraphignore does not exist', async () => {
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);

        // Ensure .depgraphignore does not exist
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        if (fs.existsSync(depgraphIgnorePath)) {
            fs.unlinkSync(depgraphIgnorePath);
        }

        // Create .gitignore file
        const gitignorePath = path.join(testWorkspaceDir, '.gitignore');
        const content = `
node_modules
build/
*.log
.env
`;
        fs.writeFileSync(gitignorePath, content);

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        assert.ok(patterns.includes('**/node_modules'));
        assert.ok(patterns.includes('**/build/**'));
        assert.ok(patterns.includes('**/*.log'));
        assert.ok(patterns.includes('**/.env'));
    });

    test('Should use default patterns when no ignore files exist', async () => {
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);

        // Ensure ignore files don't exist
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        const gitignorePath = path.join(testWorkspaceDir, '.gitignore');
        
        if (fs.existsSync(depgraphIgnorePath)) {
            fs.unlinkSync(depgraphIgnorePath);
        }
        if (fs.existsSync(gitignorePath)) {
            fs.unlinkSync(gitignorePath);
        }

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        // Check some default patterns
        assert.ok(patterns.includes('**/node_modules/**'));
        assert.ok(patterns.includes('**/dist/**'));
        assert.ok(patterns.includes('**/*.spec.ts'));
        assert.ok(patterns.includes('**/coverage/**'));
        assert.ok(patterns.length > 10, 'Should have many default patterns');
    });

    test('Should handle directory patterns correctly', async () => {
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);

        // Create .depgraphignore with various patterns
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        const content = `
# Directory with trailing slash
coverage/
# Directory without trailing slash
dist
# Nested directory
src/generated/
`;
        fs.writeFileSync(depgraphIgnorePath, content);

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        assert.ok(patterns.includes('**/coverage/**'));
        assert.ok(patterns.includes('**/dist'));
        assert.ok(patterns.includes('**/src/generated/**'));
    });

    test('Should handle negation patterns correctly', async () => {
        // Reset VSCode settings
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);

        // Create .depgraphignore with negation patterns
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        const content = `
test/**
!test/unit/**
*.spec.ts
!important.spec.ts
`;
        fs.writeFileSync(depgraphIgnorePath, content);

        const patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        
        assert.ok(patterns.includes('**/test/**'));
        assert.ok(!patterns.includes('**/test/unit/**'));
        assert.ok(patterns.includes('**/*.spec.ts'));
        assert.ok(!patterns.includes('**/important.spec.ts'));
    });

    test('Priority should be VSCode settings > .depgraphignore > .gitignore > defaults', async () => {
        // Create all possible sources
        const depgraphIgnorePath = path.join(testWorkspaceDir, '.depgraphignore');
        fs.writeFileSync(depgraphIgnorePath, 'depgraph/**');
        
        const gitignorePath = path.join(testWorkspaceDir, '.gitignore');
        fs.writeFileSync(gitignorePath, 'gitignore/**');

        // Test 1: VSCode settings should take priority
        const config = vscode.workspace.getConfiguration('depGraph');
        await config.update('exclude', ['vscode/**'], vscode.ConfigurationTarget.Workspace);
        
        let patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        assert.deepStrictEqual(patterns, ['vscode/**']);

        // Test 2: .depgraphignore should be used when VSCode settings are empty
        await config.update('exclude', undefined, vscode.ConfigurationTarget.Workspace);
        patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        assert.ok(patterns.includes('**/depgraph/**'));
        assert.ok(!patterns.includes('**/gitignore/**'));

        // Test 3: .gitignore should be used when .depgraphignore doesn't exist
        fs.unlinkSync(depgraphIgnorePath);
        patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        assert.ok(patterns.includes('**/gitignore/**'));

        // Test 4: defaults should be used when nothing else exists
        fs.unlinkSync(gitignorePath);
        patterns = await IgnorePatternUtils.getExcludePatterns(testWorkspaceDir);
        assert.ok(patterns.includes('**/node_modules/**'));
        assert.ok(patterns.includes('**/dist/**'));
    });
});