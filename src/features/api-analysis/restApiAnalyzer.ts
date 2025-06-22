import { Project, SourceFile, Decorator, MethodDeclaration, ClassDeclaration, ts } from 'ts-morph';
import * as path from 'path';

export interface RestEndpoint {
    controllerPath: string;
    method: string;
    path: string;
    methodName: string;
    parameters: {
        name: string;
        type: 'path' | 'query' | 'body';
        tsType?: string;
    }[];
    filePath: string;
}

export class RestApiAnalyzer {
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

    async analyzeDirectory(directoryPath: string): Promise<RestEndpoint[]> {
        const endpoints: RestEndpoint[] = [];
        
        this.project.addSourceFilesAtPaths(`${directoryPath}/**/*.ts`);
        
        const sourceFiles = this.project.getSourceFiles();
        
        for (const sourceFile of sourceFiles) {
            const fileEndpoints = this.analyzeFile(sourceFile);
            endpoints.push(...fileEndpoints);
        }
        
        return endpoints;
    }

    private analyzeFile(sourceFile: SourceFile): RestEndpoint[] {
        const endpoints: RestEndpoint[] = [];
        const classes = sourceFile.getClasses();
        
        for (const classDecl of classes) {
            const controllerDecorator = classDecl.getDecorator('Controller');
            if (!controllerDecorator) {
                continue;
            }
            
            const controllerPath = this.extractControllerPath(controllerDecorator);
            const methods = classDecl.getMethods();
            
            for (const method of methods) {
                const endpoint = this.analyzeMethod(method, controllerPath, sourceFile.getFilePath());
                if (endpoint) {
                    endpoints.push(endpoint);
                }
            }
        }
        
        return endpoints;
    }

    private extractControllerPath(decorator: Decorator): string {
        const args = decorator.getArguments();
        if (args.length > 0) {
            const pathArg = args[0].getText().replace(/['"]/g, '');
            return pathArg.startsWith('/') ? pathArg : `/${pathArg}`;
        }
        return '';
    }

    private analyzeMethod(method: MethodDeclaration, controllerPath: string, filePath: string): RestEndpoint | null {
        const httpMethodDecorators = ['Get', 'Post', 'Put', 'Patch', 'Delete'];
        let httpMethod: string | null = null;
        let methodPath = '';
        
        for (const decoratorName of httpMethodDecorators) {
            const decorator = method.getDecorator(decoratorName);
            if (decorator) {
                httpMethod = decoratorName.toUpperCase();
                const args = decorator.getArguments();
                if (args.length > 0) {
                    methodPath = args[0].getText().replace(/['"]/g, '');
                }
                break;
            }
        }
        
        if (!httpMethod) {
            return null;
        }
        
        const parameters = this.extractParameters(method);
        
        return {
            controllerPath,
            method: httpMethod,
            path: methodPath,
            methodName: method.getName() || 'anonymous',
            parameters,
            filePath
        };
    }

    private extractParameters(method: MethodDeclaration): RestEndpoint['parameters'] {
        const parameters: RestEndpoint['parameters'] = [];
        const params = method.getParameters();
        
        for (const param of params) {
            const decorators = param.getDecorators();
            
            for (const decorator of decorators) {
                const name = decorator.getName();
                const paramName = param.getName();
                const tsType = param.getType().getText();
                
                if (name === 'Param') {
                    const args = decorator.getArguments();
                    const pathParamName = args.length > 0 ? args[0].getText().replace(/['"]/g, '') : paramName;
                    parameters.push({
                        name: pathParamName,
                        type: 'path',
                        tsType
                    });
                } else if (name === 'Query') {
                    const args = decorator.getArguments();
                    const queryParamName = args.length > 0 ? args[0].getText().replace(/['"]/g, '') : paramName;
                    parameters.push({
                        name: queryParamName,
                        type: 'query',
                        tsType
                    });
                } else if (name === 'Body') {
                    parameters.push({
                        name: paramName,
                        type: 'body',
                        tsType
                    });
                }
            }
        }
        
        return parameters;
    }
}