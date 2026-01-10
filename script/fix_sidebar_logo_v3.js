const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../client/src/components/app-sidebar.tsx');
try {
    let content = fs.readFileSync(filePath, 'utf8');
    // Aggressive match for the div containing 'from-green-500' which is unique to the logo placeholder
    const regex = /<div[^>]*from-green-500[^>]*>[\s\S]*?<\/div>/;
    if (regex.test(content)) {
        const newContent = content.replace(regex, '<img src="/logo_s.svg" alt="App Logo" className="w-10 h-10 rounded-full object-contain" />');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log("Aggressive replacement success.");
    } else {
        console.log("Aggressive pattern failed.");
    }
} catch (e) { console.error(e); }
