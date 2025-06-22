import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTestSkeletonGenerator } from '../../../../features/api-analysis/apiTestSkeletonGenerator';

suite('ApiTestSkeletonGenerator Test Suite', () => {
    let generator: ApiTestSkeletonGenerator;
    const testOutputDir = path.join(__dirname, '../../../test-output');

    setup(() => {
        generator = new ApiTestSkeletonGenerator();
        // Create test output directory
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }
    });

    teardown(() => {
        // Clean up test output
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    test('should generate Jest test skeletons for REST endpoints', async () => {
        const testDir = path.join(__dirname, '../../../test-samples/nestjs');
        
        // Copy test files to output directory
        if (!fs.existsSync(path.join(testOutputDir, 'nestjs'))) {
            fs.mkdirSync(path.join(testOutputDir, 'nestjs'), { recursive: true });
        }
        fs.copyFileSync(
            path.join(testDir, 'user.controller.ts'),
            path.join(testOutputDir, 'nestjs', 'user.controller.ts')
        );

        await generator.generateTestSkeletons(testOutputDir);

        // Check if test files were generated
        const testFilePath = path.join(testOutputDir, '__tests__', 'user.e2e-spec.ts');
        assert.ok(fs.existsSync(testFilePath), 'Should generate REST test file');

        const content = fs.readFileSync(testFilePath, 'utf-8');
        assert.ok(content.includes('UserController (e2e)'), 'Should include controller name');
        assert.ok(content.includes('GET /users'), 'Should include GET endpoint');
        assert.ok(content.includes('POST /users'), 'Should include POST endpoint');
        assert.ok(content.includes('supertest'), 'Should use supertest');
    });

    test('should generate k6 load test when e2e option is true', async () => {
        const testDir = path.join(__dirname, '../../../test-samples/nestjs');
        
        // Copy test files to output directory
        if (!fs.existsSync(path.join(testOutputDir, 'nestjs'))) {
            fs.mkdirSync(path.join(testOutputDir, 'nestjs'), { recursive: true });
        }
        fs.copyFileSync(
            path.join(testDir, 'user.controller.ts'),
            path.join(testOutputDir, 'nestjs', 'user.controller.ts')
        );

        await generator.generateTestSkeletons(testOutputDir, {
            e2e: true,
            k6Config: { vus: 20, duration: '60s' }
        });

        // Check if k6 files were generated
        const k6FilePath = path.join(testOutputDir, 'k6', 'rest-load-test.js');
        assert.ok(fs.existsSync(k6FilePath), 'Should generate k6 test file');

        const content = fs.readFileSync(k6FilePath, 'utf-8');
        assert.ok(content.includes('vus: 20'), 'Should include custom VUs');
        assert.ok(content.includes("duration: '60s'"), 'Should include custom duration');
        assert.ok(content.includes('http.get'), 'Should include HTTP methods');
    });

    test('should not overwrite existing test files', async () => {
        const testDir = path.join(__dirname, '../../../test-samples/nestjs');
        
        // Copy test files to output directory
        if (!fs.existsSync(path.join(testOutputDir, 'nestjs'))) {
            fs.mkdirSync(path.join(testOutputDir, 'nestjs'), { recursive: true });
        }
        fs.copyFileSync(
            path.join(testDir, 'user.controller.ts'),
            path.join(testOutputDir, 'nestjs', 'user.controller.ts')
        );

        // Create existing test file
        const testFilePath = path.join(testOutputDir, '__tests__', 'user.e2e-spec.ts');
        fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
        fs.writeFileSync(testFilePath, '// Existing test content');

        await generator.generateTestSkeletons(testOutputDir);

        // Check that file was not overwritten
        const content = fs.readFileSync(testFilePath, 'utf-8');
        assert.strictEqual(content, '// Existing test content', 'Should not overwrite existing file');
    });
});