const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../client/src/components/app-sidebar.tsx');
try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Regex to match the specific div and its content (non-greedy until </div>)
    const regex = /<div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600[^"]*">[\s\S]*?<\/div>/;

    if (regex.test(content)) {
        const newContent = content.replace(regex, '<img src="/logo_s.svg" alt="Club Logo" className="w-10 h-10 rounded-full object-contain" />');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log("Successfully replaced logo.");
    } else {
        console.log("Target pattern not found.");
        // Log a snippet to see what's there (debug)
        const snippetMatch = content.match(/from-green-500/);
        if (snippetMatch) {
            console.log("Found snippet:", content.substring(snippetMatch.index - 50, snippetMatch.index + 100));
        }
    }
} catch (e) {
    console.error("Error processing file:", e);
}
