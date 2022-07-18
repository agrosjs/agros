import { AppCollectionFactory } from './app.factory';

export const run = async () => {
    const factory = new AppCollectionFactory();
    await factory.generate({
        path: process.cwd(),
        skipInstall: false,
    });
};
