const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../client/src/components/app-sidebar.tsx');
try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log("Read success");
    fs.writeFileSync(path.join(__dirname, '../sidebar_dump.txt'), content);
} catch (e) {
    console.error("Failed to read", e);
}
