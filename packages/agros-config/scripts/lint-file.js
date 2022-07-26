const fs = require('fs');
const path = require('path');
const { cosmiconfigSync } = require('cosmiconfig');

const sourceESLintFilePath = cosmiconfigSync('eslint').search().filepath;
const targetESLintFilePath = path.resolve(__dirname, '../.eslintrc.js');

fs.copyFileSync(sourceESLintFilePath, targetESLintFilePath);
