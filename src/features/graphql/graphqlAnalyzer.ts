import { Project, SourceFile, Decorator, MethodDeclaration, ClassDeclaration, ts } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';
import { parse, DocumentNode, OperationDefinitionNode, FieldDefinitionNode, TypeNode, DefinitionNode } from 'graphql';

export interface GraphQLOperation {
    name: string;
    type: 'Query' | 'Mutation' | 'Subscription';
    arguments: {
        name: string;
        type: string;
        required: boolean;
    }[];
    returnType: string;
    filePath: string;
}

export class GraphQLAnalyzer {
    private project: Project;

    constructor() {
        // Initialize ts-morph Project without specifying tsconfig path
        this.project = new Project({
            skipAddingFilesFromTsConfig: true,
            compilerOptions: {
                allowJs: true,
                jsx: ts.JsxEmit.React
            }
        });
    }

    async analyzeDirectory(directoryPath: string): Promise<GraphQLOperation[]> {
        const operations: GraphQLOperation[] = [];
        
        // Analyze SDL files (.graphql)
        const sdlOperations = await this.analyzeSDLFiles(directoryPath);
        operations.push(...sdlOperations);
        
        // Analyze code-first resolvers
        const codeFirstOperations = await this.analyzeCodeFirstResolvers(directoryPath);
        operations.push(...codeFirstOperations);
        
        return operations;
    }

    private async analyzeSDLFiles(directoryPath: string): Promise<GraphQLOperation[]> {
        const operations: GraphQLOperation[] = [];
        const graphqlFiles = this.findGraphQLFiles(directoryPath);
        
        for (const filePath of graphqlFiles) {
            const content = fs.readFileSync(filePath, 'utf-8');
            try {
                const ast = parse(content);
                const fileOperations = this.extractOperationsFromAST(ast, filePath);
                operations.push(...fileOperations);
            } catch (error) {
                console.error(`Error parsing GraphQL file ${filePath}:`, error);
            }
        }
        
        return operations;
    }

    private findGraphQLFiles(directoryPath: string): string[] {
        const files: string[] = [];
        
        function walkDir(dir: string) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    walkDir(fullPath);
                } else if (entry.isFile() && entry.name.endsWith('.graphql')) {
                    files.push(fullPath);
                }
            }
        }
        
        walkDir(directoryPath);
        return files;
    }

    private extractOperationsFromAST(ast: DocumentNode, filePath: string): GraphQLOperation[] {
        const operations: GraphQLOperation[] = [];
        
        for (const definition of ast.definitions) {
            if (definition.kind === 'ObjectTypeDefinition') {
                const typeName = definition.name.value;
                if (typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription') {
                    for (const field of definition.fields || []) {
                        operations.push(this.fieldToOperation(field, typeName as GraphQLOperation['type'], filePath));
                    }
                }
            }
        }
        
        return operations;
    }

    private fieldToOperation(field: FieldDefinitionNode, type: GraphQLOperation['type'], filePath: string): GraphQLOperation {
        return {
            name: field.name.value,
            type,
            arguments: (field.arguments || []).map(arg => ({
                name: arg.name.value,
                type: this.typeNodeToString(arg.type),
                required: arg.type.kind === 'NonNullType'
            })),
            returnType: this.typeNodeToString(field.type),
            filePath
        };
    }

    private typeNodeToString(type: TypeNode): string {
        switch (type.kind) {
            case 'NamedType':
                return type.name.value;
            case 'ListType':
                return `[${this.typeNodeToString(type.type)}]`;
            case 'NonNullType':
                return `${this.typeNodeToString(type.type)}!`;
            default:
                return 'Unknown';
        }
    }

    private async analyzeCodeFirstResolvers(directoryPath: string): Promise<GraphQLOperation[]> {
        const operations: GraphQLOperation[] = [];
        
        this.project.addSourceFilesAtPaths(`${directoryPath}/**/*.ts`);
        const sourceFiles = this.project.getSourceFiles();
        
        for (const sourceFile of sourceFiles) {
            const fileOperations = this.analyzeResolverFile(sourceFile);
            operations.push(...fileOperations);
        }
        
        return operations;
    }

    private analyzeResolverFile(sourceFile: SourceFile): GraphQLOperation[] {
        const operations: GraphQLOperation[] = [];
        const classes = sourceFile.getClasses();
        
        for (const classDecl of classes) {
            const resolverDecorator = classDecl.getDecorator('Resolver');
            if (!resolverDecorator) {
                continue;
            }
            
            const methods = classDecl.getMethods();
            
            for (const method of methods) {
                const operation = this.analyzeResolverMethod(method, sourceFile.getFilePath());
                if (operation) {
                    operations.push(operation);
                }
            }
        }
        
        return operations;
    }

    private analyzeResolverMethod(method: MethodDeclaration, filePath: string): GraphQLOperation | null {
        const decorators = ['Query', 'Mutation', 'Subscription'];
        let operationType: GraphQLOperation['type'] | null = null;
        let operationName: string | null = null;
        
        for (const decoratorName of decorators) {
            const decorator = method.getDecorator(decoratorName);
            if (decorator) {
                operationType = decoratorName as GraphQLOperation['type'];
                const args = decorator.getArguments();
                operationName = args.length > 0 
                    ? args[0].getText().replace(/['"]/g, '') 
                    : method.getName() || 'anonymous';
                break;
            }
        }
        
        if (!operationType || !operationName) {
            return null;
        }
        
        const parameters = this.extractResolverParameters(method);
        const returnType = method.getReturnType().getText();
        
        return {
            name: operationName,
            type: operationType,
            arguments: parameters,
            returnType: this.simplifyReturnType(returnType),
            filePath
        };
    }

    private extractResolverParameters(method: MethodDeclaration): GraphQLOperation['arguments'] {
        const args: GraphQLOperation['arguments'] = [];
        const params = method.getParameters();
        
        for (const param of params) {
            const argsDecorator = param.getDecorator('Args');
            if (argsDecorator) {
                const paramName = param.getName();
                const tsType = param.getType().getText();
                const isRequired = !tsType.includes('undefined') && !tsType.includes('null');
                
                args.push({
                    name: paramName,
                    type: this.simplifyReturnType(tsType),
                    required: isRequired
                });
            }
        }
        
        return args;
    }

    private simplifyReturnType(type: string): string {
        // Remove Promise wrapper
        type = type.replace(/^Promise<(.+)>$/, '$1');
        // Remove common imports
        // Remove common imports
        type = type.replace(/import\(.+\)\./g, '');
        // Simplify arrays
        type = type.replace(/Array<(.+)>/, '[$1]');
        
        return type;
    }
}