const fs = require('fs');
const path = require('path');

// Function to recursively search for "set" files
function findMatchingFiles(directory, matchingFiles) {
    // Read contents of the directory
    fs.readdirSync(directory).forEach((item) => {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            // If item is a directory, recursively search
            findMatchingFiles(itemPath, matchingFiles);
        } else if (stats.isFile() && item === 'set') {
            // If item is a file named "set", check its contents
            const fileContent = fs.readFileSync(itemPath, 'utf8').trim();
            if (fileContent === '"Starter Expansion"') {
                matchingFiles.push(itemPath);
            }
        }
    });
}

// Main function to find matching files
function main(directory) {
    const matchingFiles = [];

    // Check if the specified directory exists
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        console.error(`Error: Directory '${directory}' not found.`);
        return;
    }

    // Recursively search for "set" files
    findMatchingFiles(directory, matchingFiles);

    // Print the list of matching file paths
    if (matchingFiles.length > 0) {
        console.log('Matching files:');
        matchingFiles.forEach((filePath) => {
            console.log(filePath);
        });
    } else {
        console.log('No matching files found.');
    }
}

// Usage: node findMatchingFiles.js <directory>
if (process.argv.length !== 3) {
    console.error('Usage: node findMatchingFiles.js <directory>');
    process.exit(1);
}

const directory = process.argv[2];
main(directory);
