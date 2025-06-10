import * as assert from 'assert';
import * as path from 'path';
import { RestApiAnalyzer } from '../../restApiAnalyzer';

suite('RestApiAnalyzer Test Suite', () => {
    let analyzer: RestApiAnalyzer;

    setup(() => {
        analyzer = new RestApiAnalyzer();
    });

    test('should analyze REST endpoints from NestJS controller', async () => {
        const testDir = path.join(__dirname, '../../../test-samples/nestjs');
        const endpoints = await analyzer.analyzeDirectory(testDir);

        assert.strictEqual(endpoints.length, 5, 'Should find 5 endpoints');

        // Check GET endpoints
        const getEndpoints = endpoints.filter(e => e.method === 'GET');
        assert.strictEqual(getEndpoints.length, 2, 'Should find 2 GET endpoints');

        // Check findAll endpoint
        const findAllEndpoint = endpoints.find(e => e.methodName === 'findAll');
        assert.ok(findAllEndpoint, 'Should find findAll endpoint');
        assert.strictEqual(findAllEndpoint!.method, 'GET');
        assert.strictEqual(findAllEndpoint!.path, '');
        assert.strictEqual(findAllEndpoint!.controllerPath, '/users');
        assert.strictEqual(findAllEndpoint!.parameters.length, 2);
        assert.ok(findAllEndpoint!.parameters.find(p => p.name === 'page' && p.type === 'query'));
        assert.ok(findAllEndpoint!.parameters.find(p => p.name === 'limit' && p.type === 'query'));

        // Check findOne endpoint
        const findOneEndpoint = endpoints.find(e => e.methodName === 'findOne');
        assert.ok(findOneEndpoint, 'Should find findOne endpoint');
        assert.strictEqual(findOneEndpoint!.method, 'GET');
        assert.strictEqual(findOneEndpoint!.path, ':id');
        assert.strictEqual(findOneEndpoint!.parameters.length, 1);
        assert.ok(findOneEndpoint!.parameters.find(p => p.name === 'id' && p.type === 'path'));

        // Check POST endpoint
        const createEndpoint = endpoints.find(e => e.methodName === 'create');
        assert.ok(createEndpoint, 'Should find create endpoint');
        assert.strictEqual(createEndpoint!.method, 'POST');
        assert.strictEqual(createEndpoint!.parameters.length, 1);
        assert.ok(createEndpoint!.parameters.find(p => p.type === 'body'));

        // Check PATCH endpoint
        const updateEndpoint = endpoints.find(e => e.methodName === 'update');
        assert.ok(updateEndpoint, 'Should find update endpoint');
        assert.strictEqual(updateEndpoint!.method, 'PATCH');
        assert.strictEqual(updateEndpoint!.path, ':id');
        assert.strictEqual(updateEndpoint!.parameters.length, 2);

        // Check DELETE endpoint
        const deleteEndpoint = endpoints.find(e => e.methodName === 'remove');
        assert.ok(deleteEndpoint, 'Should find remove endpoint');
        assert.strictEqual(deleteEndpoint!.method, 'DELETE');
        assert.strictEqual(deleteEndpoint!.path, ':id');
    });

    test('should handle empty directory', async () => {
        const tempDir = path.join(__dirname, '../../../test-samples/empty');
        const endpoints = await analyzer.analyzeDirectory(tempDir);
        assert.strictEqual(endpoints.length, 0, 'Should return empty array for empty directory');
    });
});