import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { GraphQLDocsGenerator } from '../../graphqlDocsGenerator';

suite('GraphQLDocsGenerator Test Suite', () => {
    let generator: GraphQLDocsGenerator;
    let testWorkspaceDir: string;

    suiteSetup(() => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        testWorkspaceDir = workspaceFolder.uri.fsPath;
        generator = new GraphQLDocsGenerator();
    });

    suiteTeardown(() => {
        // Clean up generated docs if needed
        const docsDir = path.join(testWorkspaceDir, 'docs');
        if (fs.existsSync(docsDir)) {
            try {
                fs.rmSync(docsDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    });

    test('Should generate docs from GraphQL schema', async () => {
        // Create a simple test schema
        const testSchemaPath = path.join(testWorkspaceDir, 'test-schema.graphql');
        const testSchema = `
            type Query {
                hello: String
                user(id: ID!): User
            }
            
            type User {
                id: ID!
                name: String!
                email: String!
                posts: [Post!]!
            }
            
            type Post {
                id: ID!
                title: String!
                content: String!
                author: User!
            }
            
            input CreateUserInput {
                name: String!
                email: String!
            }
            
            enum UserRole {
                ADMIN
                USER
            }
        `;
        
        fs.writeFileSync(testSchemaPath, testSchema);

        try {
            // Generate docs
            await generator.generateDocs(testSchemaPath);

            // Check if docs directory was created
            const docsDir = path.join(testWorkspaceDir, 'docs');
            assert.ok(fs.existsSync(docsDir), 'Docs directory should be created');

            // Find the generated markdown file
            const dateString = new Date().toISOString().split('T')[0];
            const expectedDocPath = path.join(docsDir, dateString, 'graphql-schema.md');
            
            assert.ok(fs.existsSync(expectedDocPath), 'GraphQL docs markdown file should be created');

            // Read and verify content
            const content = fs.readFileSync(expectedDocPath, 'utf-8');
            
            // Check for basic structure
            assert.ok(content.includes('# GraphQL Schema Documentation'), 'Should have main title');
            assert.ok(content.includes('## Table of Contents'), 'Should have table of contents');
            assert.ok(content.includes('## Queries'), 'Should have queries section');
            assert.ok(content.includes('## Types'), 'Should have types section');
            assert.ok(content.includes('## Input Types'), 'Should have input types section');
            assert.ok(content.includes('## Enums'), 'Should have enums section');
            
            // Check for specific types
            assert.ok(content.includes('### User'), 'Should document User type');
            assert.ok(content.includes('### Post'), 'Should document Post type');
            assert.ok(content.includes('### CreateUserInput'), 'Should document CreateUserInput');
            assert.ok(content.includes('### UserRole'), 'Should document UserRole enum');
            
            // Check for cross-references
            assert.ok(content.includes('[User](#user)'), 'Should have cross-reference links');
            assert.ok(content.includes('[Post](#post)'), 'Should have cross-reference links');

        } finally {
            // Clean up test schema file
            if (fs.existsSync(testSchemaPath)) {
                fs.unlinkSync(testSchemaPath);
            }
        }
    });

    test('Should handle complex schema with all GraphQL features', async () => {
        // Use the comprehensive test schema
        const testSchemaPath = path.join(testWorkspaceDir, 'test-samples', 'schema.graphql');
        
        if (!fs.existsSync(testSchemaPath)) {
            // Skip test if schema file doesn't exist
            console.log('Skipping complex schema test - schema.graphql not found');
            return;
        }

        try {
            await generator.generateDocs(testSchemaPath);

            const docsDir = path.join(testWorkspaceDir, 'docs');
            const dateString = new Date().toISOString().split('T')[0];
            const expectedDocPath = path.join(docsDir, dateString, 'graphql-schema.md');
            
            assert.ok(fs.existsSync(expectedDocPath), 'Complex schema docs should be generated');

            const content = fs.readFileSync(expectedDocPath, 'utf-8');
            
            // Check for all sections
            assert.ok(content.includes('## Queries'), 'Should have queries section');
            assert.ok(content.includes('## Mutations'), 'Should have mutations section');
            assert.ok(content.includes('## Subscriptions'), 'Should have subscriptions section');
            assert.ok(content.includes('## Types'), 'Should have types section');
            assert.ok(content.includes('## Input Types'), 'Should have input types section');
            assert.ok(content.includes('## Enums'), 'Should have enums section');
            assert.ok(content.includes('## Interfaces'), 'Should have interfaces section');
            assert.ok(content.includes('## Unions'), 'Should have unions section');
            assert.ok(content.includes('## Scalars'), 'Should have scalars section');
            
            // Check for specific complex types
            assert.ok(content.includes('### User'), 'Should document User type');
            assert.ok(content.includes('### Post'), 'Should document Post type');
            assert.ok(content.includes('### UserRole'), 'Should document UserRole enum');
            assert.ok(content.includes('### SearchResult'), 'Should document SearchResult union');
            assert.ok(content.includes('### Node'), 'Should document Node interface');
            assert.ok(content.includes('### DateTime'), 'Should document DateTime scalar');
            
            // Check for descriptions
            assert.ok(content.includes('User management GraphQL schema'), 'Should include schema description');
            
            // Check for field documentation
            assert.ok(content.includes('Unique user identifier'), 'Should include field descriptions');

        } catch (error) {
            console.error('Complex schema test failed:', error);
            throw error;
        }
    });

    test('Should handle schema with validation errors gracefully', async () => {
        const testSchemaPath = path.join(testWorkspaceDir, 'invalid-schema.graphql');
        const invalidSchema = `
            type Query {
                hello: InvalidType
            }
        `;
        
        fs.writeFileSync(testSchemaPath, invalidSchema);

        try {
            // This should throw an error
            await assert.rejects(
                async () => await generator.generateDocs(testSchemaPath),
                /Unknown type/,
                'Should reject invalid schema'
            );
        } finally {
            // Clean up
            if (fs.existsSync(testSchemaPath)) {
                fs.unlinkSync(testSchemaPath);
            }
        }
    });

    test('Should generate proper cross-reference links', async () => {
        const testSchemaPath = path.join(testWorkspaceDir, 'cross-ref-schema.graphql');
        const testSchema = `
            type Query {
                user: User
            }
            
            type User {
                id: ID!
                profile: UserProfile
                posts: [Post!]!
            }
            
            type UserProfile {
                user: User!
                settings: ProfileSettings
            }
            
            type ProfileSettings {
                theme: String
                notifications: Boolean
            }
            
            type Post {
                id: ID!
                author: User!
            }
        `;
        
        fs.writeFileSync(testSchemaPath, testSchema);

        try {
            await generator.generateDocs(testSchemaPath);

            const docsDir = path.join(testWorkspaceDir, 'docs');
            const dateString = new Date().toISOString().split('T')[0];
            const expectedDocPath = path.join(docsDir, dateString, 'graphql-schema.md');
            
            const content = fs.readFileSync(expectedDocPath, 'utf-8');
            
            // Check for proper cross-reference links
            assert.ok(content.includes('[User](#user)'), 'Should link to User type');
            assert.ok(content.includes('[UserProfile](#userprofile)'), 'Should link to UserProfile type');
            assert.ok(content.includes('[Post](#post)'), 'Should link to Post type');
            assert.ok(content.includes('[ProfileSettings](#profilesettings)'), 'Should link to ProfileSettings type');
            
            // Standard scalars should not have links
            assert.ok(content.includes('ID!') && !content.includes('[ID]'), 'Should not link standard scalars');
            assert.ok(content.includes('String') && !content.includes('[String]'), 'Should not link standard scalars');

        } finally {
            if (fs.existsSync(testSchemaPath)) {
                fs.unlinkSync(testSchemaPath);
            }
        }
    });
});