import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as ejs from 'ejs';
import { RestApiAnalyzer, RestEndpoint } from './restApiAnalyzer';
import { GraphQLAnalyzer, GraphQLOperation } from './graphqlAnalyzer';

export interface K6Config {
    vus: number;
    duration: string;
}

export class ApiTestSkeletonGenerator {
    private restAnalyzer: RestApiAnalyzer;
    private graphqlAnalyzer: GraphQLAnalyzer;
    private outputChannel: vscode.OutputChannel;

    constructor() {
        this.restAnalyzer = new RestApiAnalyzer();
        this.graphqlAnalyzer = new GraphQLAnalyzer();
        this.outputChannel = vscode.window.createOutputChannel('API Test Skeleton Generator');
    }

    async generateTestSkeletons(
        rootPath: string,
        options: { e2e?: boolean; k6Config?: K6Config } = {}
    ): Promise<void> {
        this.outputChannel.show();
        this.outputChannel.appendLine('Starting API test skeleton generation...');

        try {
            // Analyze REST endpoints
            const restEndpoints = await this.restAnalyzer.analyzeDirectory(rootPath);
            this.outputChannel.appendLine(`Found ${restEndpoints.length} REST endpoints`);

            // Analyze GraphQL operations
            const graphqlOperations = await this.graphqlAnalyzer.analyzeDirectory(rootPath);
            this.outputChannel.appendLine(`Found ${graphqlOperations.length} GraphQL operations`);

            // Generate Jest tests
            await this.generateJestTests(rootPath, restEndpoints, graphqlOperations);

            // Generate k6 tests if requested
            if (options.e2e) {
                const k6Config = options.k6Config || { vus: 10, duration: '30s' };
                await this.generateK6Tests(rootPath, restEndpoints, graphqlOperations, k6Config);
            }

            this.outputChannel.appendLine('Test skeleton generation completed successfully!');
            vscode.window.showInformationMessage('API test skeletons generated successfully!');
        } catch (error) {
            this.outputChannel.appendLine(`Error: ${error}`);
            vscode.window.showErrorMessage(`Failed to generate test skeletons: ${error}`);
        }
    }

    private async generateJestTests(
        rootPath: string,
        restEndpoints: RestEndpoint[],
        graphqlOperations: GraphQLOperation[]
    ): Promise<void> {
        const testDir = path.join(rootPath, '__tests__');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Group REST endpoints by controller
        const endpointsByController = this.groupEndpointsByController(restEndpoints);

        // Generate REST API tests
        for (const [controllerName, endpoints] of Object.entries(endpointsByController)) {
            const testFilePath = path.join(testDir, `${this.toKebabCase(controllerName)}.e2e-spec.ts`);
            
            // Skip if file already exists
            if (fs.existsSync(testFilePath)) {
                this.outputChannel.appendLine(`Skipping existing file: ${testFilePath}`);
                continue;
            }

            const templatePath = path.join(__dirname, 'templates', 'jest-rest.ejs');
            const templateContent = fs.readFileSync(templatePath, 'utf-8');
            
            const content = ejs.render(templateContent, {
                controllerName,
                endpoints
            });

            fs.writeFileSync(testFilePath, content);
            this.outputChannel.appendLine(`Generated: ${testFilePath}`);
        }

        // Generate GraphQL tests
        if (graphqlOperations.length > 0) {
            const graphqlTestPath = path.join(testDir, 'graphql.e2e-spec.ts');
            
            if (!fs.existsSync(graphqlTestPath)) {
                const templatePath = path.join(__dirname, 'templates', 'jest-graphql.ejs');
                const templateContent = fs.readFileSync(templatePath, 'utf-8');
                
                const content = ejs.render(templateContent, {
                    operations: graphqlOperations
                });

                fs.writeFileSync(graphqlTestPath, content);
                this.outputChannel.appendLine(`Generated: ${graphqlTestPath}`);
            } else {
                this.outputChannel.appendLine(`Skipping existing file: ${graphqlTestPath}`);
            }
        }
    }

    private async generateK6Tests(
        rootPath: string,
        restEndpoints: RestEndpoint[],
        graphqlOperations: GraphQLOperation[],
        k6Config: K6Config
    ): Promise<void> {
        const k6Dir = path.join(rootPath, 'k6');
        if (!fs.existsSync(k6Dir)) {
            fs.mkdirSync(k6Dir, { recursive: true });
        }

        // Generate REST k6 test
        if (restEndpoints.length > 0) {
            const k6RestPath = path.join(k6Dir, 'rest-load-test.js');
            
            if (!fs.existsSync(k6RestPath)) {
                const templatePath = path.join(__dirname, 'templates', 'k6-rest.ejs');
                const templateContent = fs.readFileSync(templatePath, 'utf-8');
                
                const content = ejs.render(templateContent, {
                    endpoints: restEndpoints,
                    vus: k6Config.vus,
                    duration: k6Config.duration
                });

                fs.writeFileSync(k6RestPath, content);
                this.outputChannel.appendLine(`Generated: ${k6RestPath}`);
            }
        }

        // Generate GraphQL k6 test
        if (graphqlOperations.length > 0) {
            const k6GraphqlPath = path.join(k6Dir, 'graphql-load-test.js');
            
            if (!fs.existsSync(k6GraphqlPath)) {
                const templatePath = path.join(__dirname, 'templates', 'k6-graphql.ejs');
                const templateContent = fs.readFileSync(templatePath, 'utf-8');
                
                const content = ejs.render(templateContent, {
                    operations: graphqlOperations,
                    vus: k6Config.vus,
                    duration: k6Config.duration
                });

                fs.writeFileSync(k6GraphqlPath, content);
                this.outputChannel.appendLine(`Generated: ${k6GraphqlPath}`);
            }
        }
    }

    private groupEndpointsByController(endpoints: RestEndpoint[]): Record<string, RestEndpoint[]> {
        const grouped: Record<string, RestEndpoint[]> = {};
        
        for (const endpoint of endpoints) {
            const controllerName = this.extractControllerName(endpoint.filePath);
            if (!grouped[controllerName]) {
                grouped[controllerName] = [];
            }
            grouped[controllerName].push(endpoint);
        }
        
        return grouped;
    }

    private extractControllerName(filePath: string): string {
        const fileName = path.basename(filePath, '.ts');
        return fileName.replace(/\.controller$/, '');
    }

    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
    }

    dispose() {
        this.outputChannel.dispose();
    }
}