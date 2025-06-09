import * as vscode from 'vscode';

export class ProtobufFieldNumberer {
    
    public async numberFields() {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showErrorMessage('アクティブなエディタがありません');
            return;
        }
        
        const document = editor.document;
        
        // Check if the file is a .proto file
        if (!document.fileName.endsWith('.proto')) {
            vscode.window.showErrorMessage('.protoファイルを開いてください');
            return;
        }
        
        const text = document.getText();
        const lines = text.split('\n');
        
        // Find all message blocks
        const messageBlocks = this.findMessageBlocks(lines);
        
        if (messageBlocks.length === 0) {
            vscode.window.showInformationMessage('messageブロックが見つかりませんでした');
            return;
        }
        
        // Apply edits
        const success = await editor.edit(editBuilder => {
            for (const block of messageBlocks) {
                this.numberFieldsInBlock(lines, block, editBuilder, document);
            }
        });
        
        if (success) {
            vscode.window.showInformationMessage('フィールド番号を更新しました');
        } else {
            vscode.window.showErrorMessage('フィールド番号の更新に失敗しました');
        }
    }
    
    private findMessageBlocks(lines: string[]): Array<{start: number, end: number, depth: number}> {
        const blocks: Array<{start: number, end: number, depth: number}> = [];
        const stack: Array<{start: number, depth: number}> = [];
        let depth = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for message start
            if (line.match(/^message\s+\w+\s*{/)) {
                stack.push({ start: i, depth: depth });
                depth++;
            } else if (line.includes('{')) {
                // Other types of blocks (enum, oneof, etc.)
                depth++;
            }
            
            // Check for closing brace
            if (line.includes('}')) {
                depth--;
                // Check if this closes a message block
                if (stack.length > 0 && depth === stack[stack.length - 1].depth) {
                    const messageStart = stack.pop()!;
                    blocks.push({
                        start: messageStart.start,
                        end: i,
                        depth: messageStart.depth
                    });
                }
            }
        }
        
        // Sort blocks by start line to process them in order
        return blocks.sort((a, b) => a.start - b.start);
    }
    
    private numberFieldsInBlock(
        lines: string[], 
        block: {start: number, end: number, depth?: number}, 
        editBuilder: vscode.TextEditorEdit,
        document: vscode.TextDocument
    ) {
        let fieldNumber = 1;
        // Updated regex to handle various proto field formats
        // Matches: [indent][modifier]type name = number;
        const fieldRegex = /^(\s*)(optional\s+|required\s+|repeated\s+|oneof\s+)?(\w+(?:\.\w+)*)\s+(\w+)\s*=\s*(\d+)\s*;/;
        
        for (let i = block.start + 1; i < block.end; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('//')) {
                continue;
            }
            
            // Skip reserved fields
            if (trimmedLine.startsWith('reserved')) {
                continue;
            }
            
            // Skip nested message declarations
            if (trimmedLine.startsWith('message')) {
                continue;
            }
            
            const match = line.match(fieldRegex);
            
            if (match) {
                const indent = match[1];
                const modifier = match[2] || '';
                const type = match[3];
                const name = match[4];
                const existingNumber = match[5];
                
                // Create new line with sequential number
                const newLine = `${indent}${modifier}${type} ${name} = ${fieldNumber};`;
                
                // Replace the entire line
                const lineRange = new vscode.Range(
                    new vscode.Position(i, 0),
                    new vscode.Position(i, line.length)
                );
                
                editBuilder.replace(lineRange, newLine);
                fieldNumber++;
            }
        }
    }
}