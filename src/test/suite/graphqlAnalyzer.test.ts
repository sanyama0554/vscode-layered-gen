import * as assert from 'assert';
import * as path from 'path';
import { GraphQLAnalyzer } from '../../graphqlAnalyzer';

suite('GraphQLAnalyzer Test Suite', () => {
    let analyzer: GraphQLAnalyzer;

    setup(() => {
        analyzer = new GraphQLAnalyzer();
    });

    test('should analyze GraphQL operations from SDL file', async () => {
        const testDir = path.join(__dirname, '../../../test-samples');
        const operations = await analyzer.analyzeDirectory(testDir);

        // Should find operations from schema.graphql
        const queryOperations = operations.filter(op => op.type === 'Query');
        const mutationOperations = operations.filter(op => op.type === 'Mutation');

        assert.ok(queryOperations.length > 0, 'Should find query operations');
        assert.ok(mutationOperations.length > 0, 'Should find mutation operations');
    });

    test('should analyze GraphQL operations from code-first resolver', async () => {
        const testDir = path.join(__dirname, '../../../test-samples/nestjs');
        const operations = await analyzer.analyzeDirectory(testDir);

        assert.strictEqual(operations.length, 5, 'Should find 5 GraphQL operations');

        // Check queries
        const getUser = operations.find(op => op.name === 'getUser');
        assert.ok(getUser, 'Should find getUser query');
        assert.strictEqual(getUser!.type, 'Query');
        assert.strictEqual(getUser!.arguments.length, 1);
        assert.ok(getUser!.arguments.find(arg => arg.name === 'id'));

        const listUsers = operations.find(op => op.name === 'listUsers');
        assert.ok(listUsers, 'Should find listUsers query');
        assert.strictEqual(listUsers!.type, 'Query');
        assert.strictEqual(listUsers!.arguments.length, 2);

        // Check mutations
        const createUser = operations.find(op => op.name === 'createUser');
        assert.ok(createUser, 'Should find createUser mutation');
        assert.strictEqual(createUser!.type, 'Mutation');

        const updateUser = operations.find(op => op.name === 'updateUser');
        assert.ok(updateUser, 'Should find updateUser mutation');
        assert.strictEqual(updateUser!.type, 'Mutation');
        assert.strictEqual(updateUser!.arguments.length, 2);

        const deleteUser = operations.find(op => op.name === 'deleteUser');
        assert.ok(deleteUser, 'Should find deleteUser mutation');
        assert.strictEqual(deleteUser!.type, 'Mutation');
    });

    test('should handle empty directory', async () => {
        const tempDir = path.join(__dirname, '../../../test-samples/empty');
        const operations = await analyzer.analyzeDirectory(tempDir);
        assert.strictEqual(operations.length, 0, 'Should return empty array for empty directory');
    });
});