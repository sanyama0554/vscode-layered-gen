// test-unused.ts
export const unusedFunction = () => {
    console.log("This is never used");
};

// または到達不能コード  
function example() {
    return true;
    console.log("This is unreachable"); // これが検出されるはず
}

export const anotherUnusedExport = "unused";