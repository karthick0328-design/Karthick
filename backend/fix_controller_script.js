
const fs = require('fs');
const path = 'e:/biology/backend/Controller/projectController.js';

try {
    let content = fs.readFileSync(path, 'utf8');
    // If utf8 failed to read correctly due to null bytes, it might be partial. 
    // But likely it just read it and has garbage at end.

    // Remove the garbage appended at the end (sequences of nulls or replacement chars)
    // We know the file ended with module.exports = { ... };
    // We want to find the last closing brace '};' of the module.exports object or file.

    // However, `content` might be corrupted if node treated nulls as valid chars.
    // Let's strip special chars from the end.

    const lastExportsIndex = content.lastIndexOf('module.exports');
    if (lastExportsIndex !== -1) {
        // Keep everything up to module.exports
        // But we want to preserve the keys inside module.exports that were there before
        // Data might be messy.

        // Safer bet: Truncate at the start of the appended garbage.
        // The append starts after the original file end.
        // Original file ends with "module.exports = { ... };"

        // Let's print the last 500 chars of the 'good' part to see where to cut.
        console.log("Found exports at:", lastExportsIndex);

        // We will just read the file, strip all null bytes, and save it back.
        // This handles the UTF-16 LE null interleaving issue if it was just appended.
        const cleanContent = content.replace(/\u0000/g, '');

        // Now we can append our new function properly and fix exports.
        // Check if new function is already there (garbled)
        if (cleanContent.includes('const sendMessageToHR')) {
            // It's there, maybe clean now?
        }

        fs.writeFileSync(path, cleanContent, 'utf8');
        console.log("Cleaned file.");
    } else {
        // Maybe read as binary and strip nulls?
        const buf = fs.readFileSync(path);
        const cleanBuf = Buffer.from(buf.filter(b => b !== 0));
        fs.writeFileSync(path, cleanBuf);
        console.log("Cleaned binary file.");
    }
} catch (e) {
    console.error(e);
}
