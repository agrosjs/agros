import { AppCollectionFactory } from './app.factory';
import { Command } from 'commander';

export const run = async () => {
    const program = new Command('@agros/create-app');
    const factory = new AppCollectionFactory();

    program
        .description('Create a Agros.js project')
        .option('-p, --path [string]', 'Target path of the project')
        .option('-S, --skip-install', 'Skip dependencies installation', false)
        .action(async (...data) => {
            const [options] = data;
            await factory.generate({
                path: process.cwd(),
                skipInstall: false,
                ...options,
            });
        });

    program.parse(process.argv);
};
