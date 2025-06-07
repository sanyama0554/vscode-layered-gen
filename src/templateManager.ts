import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TemplateStructure {
    path: string;
    template: string;
}

export interface Template {
    name: string;
    structure: TemplateStructure[];
}

export class TemplateManager {
    private templates: Template[] = [];
    private fileTemplates: { [key: string]: string } = {};

    constructor() {
        this.loadConfiguration();
    }

    private loadConfiguration() {
        const config = vscode.workspace.getConfiguration('layered-gen');
        this.templates = config.get<Template[]>('templates') || [];
        this.fileTemplates = config.get<{ [key: string]: string }>('fileTemplates') || {};
    }

    public getTemplates(): Template[] {
        return this.templates;
    }

    public async generateFiles(targetPath: string, entityName: string, templateName?: string) {
        this.loadConfiguration(); // Reload configuration
        
        const template = templateName 
            ? this.templates.find(t => t.name === templateName)
            : this.templates[0];

        if (!template) {
            throw new Error('No template found');
        }

        const generatedFiles: string[] = [];

        for (const structure of template.structure) {
            const filePath = this.replacePlaceholders(structure.path, entityName);
            const fullPath = path.join(targetPath, filePath);
            const dirPath = path.dirname(fullPath);

            // Create directory if it doesn't exist
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            const content = this.replacePlaceholders(
                this.fileTemplates[structure.template] || '',
                entityName
            );

            fs.writeFileSync(fullPath, content);
            generatedFiles.push(fullPath);
        }

        return generatedFiles;
    }

    private replacePlaceholders(text: string, entityName: string): string {
        const pascalCase = this.toPascalCase(entityName);
        const camelCase = this.toCamelCase(entityName);
        
        return text
            .replace(/{Name}/g, pascalCase)
            .replace(/{name}/g, camelCase);
    }

    private toPascalCase(str: string): string {
        return str
            .split(/[-_\s]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    private toCamelCase(str: string): string {
        const pascal = this.toPascalCase(str);
        return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    }
}