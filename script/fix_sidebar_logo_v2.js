const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../client/src/components/app-sidebar.tsx');

try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Construct regex to match the div with the specific long class string.
    // We allow for 'class' or 'className' and allow for arbitrary whitespace inside the tag.
    // We match content 'C' or any short content.
    const regex = /<div\s+(?:className|class)="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">[\s\S]*?<\/div>/;

    if (regex.test(content)) {
        const newContent = content.replace(regex, '<img src="/logo_s.svg" alt="App Logo" className="w-10 h-10 rounded-full object-contain" />');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log("Successfully replaced logo div with logo_s.svg img.");
    } else {
        console.log("Target div not found with strict regex.");
        // Flexible search for debugging
        if (content.indexOf("from-green-500") !== -1) {
            console.log("Found 'from-green-500', but full regex mismatch.");
        } else {
            console.log("'from-green-500' not found in file.");
        }
    }
} catch (e) {
    console.error("Error:", e);
}
