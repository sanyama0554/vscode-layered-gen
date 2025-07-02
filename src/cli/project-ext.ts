#!/usr/bin/env node

import { program } from 'commander';
import { DeadCodeCli } from '../features/dead-code/deadCodeCli';

program
    .name('project-ext')
    .description('VSCode Layered Generator CLI tools')
    .version('0.0.1');

program
    .command('deadcode')
    .description('Analyze dead code in your project')
    .option('-f, --output-format <format>', 'Output format (table or json)', 'table')
    .option('-m, --max-allowed <number>', 'Maximum allowed dead code items', parseInt)
    .option('-o, --output <file>', 'Output file for JSON format')
    .action(async (options: any) => {
        const cli = new DeadCodeCli();
        await cli.run(options);
    });

program.parse();