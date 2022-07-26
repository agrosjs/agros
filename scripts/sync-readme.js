const path = require('path');
const fs = require('fs');

const readmeContent = fs.readFileSync(
    path.resolve(__dirname, '../README.md'),
    {
        encoding: 'utf-8',
    },
);
const packagesDir = path.resolve(__dirname, '../packages');

fs.readdirSync(packagesDir).forEach((dir) => {
    const dirname = path.resolve(packagesDir, dir);

    if (!fs.statSync(dirname).isDirectory()) {
        return;
    }

    fs.writeFileSync(
        path.resolve(dirname, 'README.md'),
        readmeContent,
        {
            encoding: 'utf-8',
        },
    );
});
