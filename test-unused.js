"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anotherUnusedExport = exports.unusedFunction = void 0;
// test-unused.ts
const unusedFunction = () => {
    console.log("This is never used");
};
exports.unusedFunction = unusedFunction;
// または到達不能コード  
function example() {
    return true;
    console.log("This is unreachable"); // これが検出されるはず
}
exports.anotherUnusedExport = "unused";
//# sourceMappingURL=test-unused.js.map