import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { 
    buildSchema, 
    GraphQLSchema, 
    GraphQLObjectType, 
    GraphQLInputObjectType, 
    GraphQLEnumType, 
    GraphQLInterfaceType,
    GraphQLUnionType,
    GraphQLScalarType,
    isObjectType,
    isInputObjectType,
    isEnumType,
    isInterfaceType,
    isUnionType,
    isScalarType,
    isNonNullType,
    isListType,
    GraphQLField,
    GraphQLInputField,
    GraphQLType
} from 'graphql';
import { simpleGit, SimpleGit } from 'simple-git';

export interface GraphQLDocsConfig {
    outputDir: string;
    autoCommit: boolean;
}

export class GraphQLDocsGenerator {
    private git: SimpleGit;
    private workspaceRoot: string;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.git = simpleGit(this.workspaceRoot);
    }

    async generateDocs(schemaPath: string): Promise<void> {
        try {
            console.log(`Generating GraphQL docs for: ${schemaPath}`);
            
            // スキーマファイルを読み込み
            const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
            const schema = buildSchema(schemaContent);
            
            // Markdownを生成
            const markdown = this.generateMarkdown(schema);
            
            // 出力先を決定
            const config = this.getConfig();
            const outputPath = await this.getOutputPath(config.outputDir);
            
            // ファイルを書き込み
            await this.writeMarkdownFile(outputPath, markdown);
            
            // 自動コミット（設定により）
            if (config.autoCommit) {
                await this.commitChanges(outputPath);
            }
            
            vscode.window.showInformationMessage(
                `GraphQLドキュメントを生成しました: ${outputPath}`
            );
            
        } catch (error) {
            console.error('GraphQL docs generation failed:', error);
            vscode.window.showErrorMessage(
                `GraphQLドキュメント生成に失敗しました: ${error}`
            );
        }
    }

    private generateMarkdown(schema: GraphQLSchema): string {
        const typeMap = schema.getTypeMap();
        const queryType = schema.getQueryType();
        const mutationType = schema.getMutationType();
        const subscriptionType = schema.getSubscriptionType();
        
        let markdown = '# GraphQL Schema Documentation\n\n';
        markdown += `Generated on: ${new Date().toISOString()}\n\n`;
        
        // 目次
        markdown += '## Table of Contents\n\n';
        markdown += '- [Queries](#queries)\n';
        markdown += '- [Mutations](#mutations)\n';
        markdown += '- [Subscriptions](#subscriptions)\n';
        markdown += '- [Types](#types)\n';
        markdown += '- [Input Types](#input-types)\n';
        markdown += '- [Enums](#enums)\n';
        markdown += '- [Interfaces](#interfaces)\n';
        markdown += '- [Unions](#unions)\n';
        markdown += '- [Scalars](#scalars)\n\n';
        
        // Queries
        if (queryType) {
            markdown += '## Queries\n\n';
            markdown += this.generateTypeDocumentation(queryType);
        }
        
        // Mutations
        if (mutationType) {
            markdown += '## Mutations\n\n';
            markdown += this.generateTypeDocumentation(mutationType);
        }
        
        // Subscriptions
        if (subscriptionType) {
            markdown += '## Subscriptions\n\n';
            markdown += this.generateTypeDocumentation(subscriptionType);
        }
        
        // Types
        const objectTypes = Object.values(typeMap).filter(type => 
            isObjectType(type) && !type.name.startsWith('__') && 
            type !== queryType && type !== mutationType && type !== subscriptionType
        );
        
        if (objectTypes.length > 0) {
            markdown += '## Types\n\n';
            objectTypes.forEach(type => {
                markdown += this.generateTypeDocumentation(type as GraphQLObjectType);
            });
        }
        
        // Input Types
        const inputTypes = Object.values(typeMap).filter(type => 
            isInputObjectType(type) && !type.name.startsWith('__')
        );
        
        if (inputTypes.length > 0) {
            markdown += '## Input Types\n\n';
            inputTypes.forEach(type => {
                markdown += this.generateInputTypeDocumentation(type as GraphQLInputObjectType);
            });
        }
        
        // Enums
        const enumTypes = Object.values(typeMap).filter(type => 
            isEnumType(type) && !type.name.startsWith('__')
        );
        
        if (enumTypes.length > 0) {
            markdown += '## Enums\n\n';
            enumTypes.forEach(type => {
                markdown += this.generateEnumDocumentation(type as GraphQLEnumType);
            });
        }
        
        // Interfaces
        const interfaceTypes = Object.values(typeMap).filter(type => 
            isInterfaceType(type) && !type.name.startsWith('__')
        );
        
        if (interfaceTypes.length > 0) {
            markdown += '## Interfaces\n\n';
            interfaceTypes.forEach(type => {
                markdown += this.generateInterfaceDocumentation(type as GraphQLInterfaceType);
            });
        }
        
        // Unions
        const unionTypes = Object.values(typeMap).filter(type => 
            isUnionType(type) && !type.name.startsWith('__')
        );
        
        if (unionTypes.length > 0) {
            markdown += '## Unions\n\n';
            unionTypes.forEach(type => {
                markdown += this.generateUnionDocumentation(type as GraphQLUnionType);
            });
        }
        
        // Scalars
        const scalarTypes = Object.values(typeMap).filter(type => 
            isScalarType(type) && !type.name.startsWith('__') && 
            !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(type.name)
        );
        
        if (scalarTypes.length > 0) {
            markdown += '## Scalars\n\n';
            scalarTypes.forEach(type => {
                markdown += this.generateScalarDocumentation(type as GraphQLScalarType);
            });
        }
        
        return markdown;
    }

    private generateTypeDocumentation(type: GraphQLObjectType | GraphQLInterfaceType): string {
        let doc = `### ${type.name}\n\n`;
        
        if (type.description) {
            doc += `${type.description}\n\n`;
        }
        
        const fields = type.getFields();
        if (Object.keys(fields).length > 0) {
            doc += '**Fields:**\n\n';
            Object.values(fields).forEach(field => {
                doc += this.generateFieldDocumentation(field);
            });
        }
        
        doc += '\n';
        return doc;
    }

    private generateInputTypeDocumentation(type: GraphQLInputObjectType): string {
        let doc = `### ${type.name}\n\n`;
        
        if (type.description) {
            doc += `${type.description}\n\n`;
        }
        
        const fields = type.getFields();
        if (Object.keys(fields).length > 0) {
            doc += '**Fields:**\n\n';
            Object.values(fields).forEach(field => {
                doc += this.generateInputFieldDocumentation(field);
            });
        }
        
        doc += '\n';
        return doc;
    }

    private generateEnumDocumentation(type: GraphQLEnumType): string {
        let doc = `### ${type.name}\n\n`;
        
        if (type.description) {
            doc += `${type.description}\n\n`;
        }
        
        const values = type.getValues();
        if (values.length > 0) {
            doc += '**Values:**\n\n';
            values.forEach(value => {
                doc += `- \`${value.name}\``;
                if (value.description) {
                    doc += ` - ${value.description}`;
                }
                doc += '\n';
            });
        }
        
        doc += '\n';
        return doc;
    }

    private generateInterfaceDocumentation(type: GraphQLInterfaceType): string {
        return this.generateTypeDocumentation(type);
    }

    private generateUnionDocumentation(type: GraphQLUnionType): string {
        let doc = `### ${type.name}\n\n`;
        
        if (type.description) {
            doc += `${type.description}\n\n`;
        }
        
        const types = type.getTypes();
        if (types.length > 0) {
            doc += '**Possible Types:**\n\n';
            types.forEach(unionType => {
                doc += `- [${unionType.name}](#${this.generateAnchor(unionType.name)})\n`;
            });
        }
        
        doc += '\n';
        return doc;
    }

    private generateScalarDocumentation(type: GraphQLScalarType): string {
        let doc = `### ${type.name}\n\n`;
        
        if (type.description) {
            doc += `${type.description}\n\n`;
        } else {
            doc += 'Custom scalar type.\n\n';
        }
        
        return doc;
    }

    private generateFieldDocumentation(field: GraphQLField<any, any>): string {
        let doc = `- \`${field.name}\`: ${this.getTypeString(field.type)}`;
        
        if (field.description) {
            doc += ` - ${field.description}`;
        }
        
        if (field.args && field.args.length > 0) {
            doc += '\n  - **Arguments:**\n';
            field.args.forEach(arg => {
                doc += `    - \`${arg.name}\`: ${this.getTypeString(arg.type)}`;
                if (arg.description) {
                    doc += ` - ${arg.description}`;
                }
                doc += '\n';
            });
        }
        
        doc += '\n';
        return doc;
    }

    private generateInputFieldDocumentation(field: GraphQLInputField): string {
        let doc = `- \`${field.name}\`: ${this.getTypeString(field.type)}`;
        
        if (field.description) {
            doc += ` - ${field.description}`;
        }
        
        doc += '\n';
        return doc;
    }

    private getTypeString(type: GraphQLType): string {
        if (isNonNullType(type)) {
            return `${this.getTypeString(type.ofType)}!`;
        }
        
        if (isListType(type)) {
            return `[${this.getTypeString(type.ofType)}]`;
        }
        
        // 相互リンク生成
        const typeName = type.name;
        if (this.shouldGenerateLink(typeName)) {
            return `[${typeName}](#${this.generateAnchor(typeName)})`;
        }
        
        return typeName;
    }

    private shouldGenerateLink(typeName: string): boolean {
        // 標準スカラータイプは除外
        const standardScalars = ['String', 'Int', 'Float', 'Boolean', 'ID'];
        return !standardScalars.includes(typeName) && !typeName.startsWith('__');
    }

    private generateAnchor(typeName: string): string {
        return typeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    private getConfig(): GraphQLDocsConfig {
        const config = vscode.workspace.getConfiguration('layered-gen.graphqlDocs');
        return {
            outputDir: config.get('outputDir', 'docs'),
            autoCommit: config.get('autoCommit', false)
        };
    }

    private async getOutputPath(outputDir: string): Promise<string> {
        const now = new Date();
        const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
        
        const outputDirPath = path.resolve(this.workspaceRoot, outputDir, dateString);
        
        // ディレクトリを作成
        if (!fs.existsSync(outputDirPath)) {
            fs.mkdirSync(outputDirPath, { recursive: true });
        }
        
        return path.join(outputDirPath, 'graphql-schema.md');
    }

    private async writeMarkdownFile(outputPath: string, markdown: string): Promise<void> {
        // 既存ファイルがある場合は上書き警告
        if (fs.existsSync(outputPath)) {
            const choice = await vscode.window.showWarningMessage(
                `ファイル ${outputPath} は既に存在します。上書きしますか？`,
                '上書き',
                'キャンセル'
            );
            
            if (choice !== '上書き') {
                throw new Error('ファイル書き込みがキャンセルされました');
            }
        }
        
        fs.writeFileSync(outputPath, markdown, 'utf-8');
    }

    private async commitChanges(outputPath: string): Promise<void> {
        try {
            const isGitRepo = await this.git.checkIsRepo();
            if (!isGitRepo) {
                console.log('Git repository not found, skipping auto-commit');
                return;
            }
            
            const relativePath = path.relative(this.workspaceRoot, outputPath);
            await this.git.add(relativePath);
            
            await this.git.commit(`docs: Update GraphQL schema documentation\n\nGenerated: ${relativePath}`);
            
            vscode.window.showInformationMessage('GraphQLドキュメントをGitにコミットしました');
            
        } catch (error) {
            console.error('Git commit failed:', error);
            vscode.window.showWarningMessage(`Gitコミットに失敗しました: ${error}`);
        }
    }

    async processFile(document: vscode.TextDocument): Promise<void> {
        if (document.fileName.endsWith('.graphql')) {
            console.log(`Processing GraphQL file: ${document.fileName}`);
            await this.generateDocs(document.fileName);
        }
    }
}