const fs = require('fs');
const path = require('path');

// Function to rename files based on specified condition
function renameFiles(directory, initialMigrationNumber, offset) {
    // Read contents of the directory
    fs.readdirSync(directory).forEach((item) => {
        const itemPath = path.join(directory, item);
        const stats = fs.statSync(itemPath);

        if (stats.isFile()) {
            // Check if the file name starts with a number
            const fileName = path.parse(item).name; // Extract file name without extension
            const match = fileName.match(/^\d+/); // Match the leading number
            if (match) {
                const number = parseInt(match[0], 10); // Convert matched number to integer
                if (number >= initialMigrationNumber) {
                    // Calculate new number by subtracting offset
                    const newNumber = number + offset;

                    // Construct new file name with updated number
                    const newFileName = `${fileName.replace(number, newNumber)}${path.parse(item).ext}`;

                    // Rename the file
                    const newPath = path.join(directory, newFileName);
                    fs.renameSync(itemPath, newPath);
                    console.log(`Renamed '${item}' to '${newFileName}'`);
                }
            }
        } else if (stats.isDirectory()) {
            // Recursively process subdirectories
            renameFiles(itemPath, initialMigrationNumber, offset);
        }
    });
}

// Main function to rename files in the specified directory
function main(directory, initialMigrationNumber, offset) {
    // Check if the specified directory exists
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        console.error(`Error: Directory '${directory}' not found.`);
        return;
    }

    // Rename files based on the specified condition
    renameFiles(directory, initialMigrationNumber, offset);
}

// Usage: node renameFiles.js <directory> <initialMigrationNumber> <offset>
if (process.argv.length !== 5) {
    console.error('Usage: node renameFiles.js <directory> <initialMigrationNumber> <offset>');
    process.exit(1);
}

const directory = process.argv[2];
const initialMigrationNumber = parseInt(process.argv[3], 10);
const offset = parseInt(process.argv[4], 10);

main(directory, initialMigrationNumber, offset);
