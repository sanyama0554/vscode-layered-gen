#!/usr/bin/env node

import { program } from 'commander';
import { DeadCodeAnalyzer, DeadCodeReport } from './deadCodeAnalyzer';
import * as path from 'path';
import * as fs from 'fs';

interface CliOptions {
    outputFormat: 'table' | 'json';
    maxAllowed?: number;
    output?: string;
}

class DeadCodeCli {
    private analyzer: DeadCodeAnalyzer;

    constructor() {
        const workspaceRoot = process.cwd();
        this.analyzer = new DeadCodeAnalyzer(workspaceRoot);
    }

    async run(options: CliOptions): Promise<void> {
        console.log('🔍 Analyzing dead code...\n');

        try {
            const report = await this.analyzer.analyze();
            
            if (options.outputFormat === 'json') {
                this.outputJson(report, options.output);
            } else {
                this.outputTable(report);
            }

            // Check threshold
            if (options.maxAllowed !== undefined && report.items.length > options.maxAllowed) {
                console.error(
                    `\n❌ Dead code count (${report.items.length}) exceeds maximum allowed (${options.maxAllowed})`
                );
                process.exit(1);
            }

            if (report.items.length === 0) {
                console.log('✅ No dead code found!');
            } else {
                console.log(`\n⚠️  Found ${report.items.length} dead code items`);
            }

        } catch (error) {
            console.error('❌ Analysis failed:', (error as Error).message);
            process.exit(1);
        }
    }

    private outputTable(report: DeadCodeReport): void {
        const typeLabels: Record<string, string> = {
            'unused-file': '📄 Unused File',
            'unused-export': '📦 Unused Export',
            'unreachable': '⚠️  Unreachable',
            'zero-coverage': '🧪 Zero Coverage',
            'orphan-module': '🔌 Orphan Module'
        };

        // Group by type
        const grouped = report.items.reduce((acc, item) => {
            if (!acc[item.type]) {
                acc[item.type] = [];
            }
            acc[item.type].push(item);
            return acc;
        }, {} as Record<string, typeof report.items>);

        // Output each group
        for (const [type, items] of Object.entries(grouped)) {
            console.log(`\n${typeLabels[type]} (${items.length}):`);
            console.log('─'.repeat(60));

            for (const item of items) {
                const location = item.line ? `:${item.line}` : '';
                const name = item.name ? ` → ${item.name}` : '';
                console.log(`  ${item.filePath}${location}${name}`);
                console.log(`    ${item.description}`);
            }
        }
    }

    private outputJson(report: DeadCodeReport, outputFile?: string): void {
        const json = JSON.stringify(report, null, 2);
        
        if (outputFile) {
            fs.writeFileSync(outputFile, json);
            console.log(`📝 Report saved to ${outputFile}`);
        } else {
            console.log(json);
        }
    }
}

// CLI entry point
if (require.main === module) {
    program
        .name('project-ext deadcode')
        .description('Analyze dead code in your project')
        .option('-f, --output-format <format>', 'Output format (table or json)', 'table')
        .option('-m, --max-allowed <number>', 'Maximum allowed dead code items', parseInt)
        .option('-o, --output <file>', 'Output file for JSON format')
        .action(async (options: CliOptions) => {
            const cli = new DeadCodeCli();
            await cli.run(options);
        });

    program.parse();
}

export { DeadCodeCli };