import figlet from 'figlet';
import { ProjectConfigParser } from '@agros/config';
import { PlatformLoader } from '@agros/utils/lib/platform-loader';
import { Logger } from '@agros/logger';

export const cli = async (command: string) => {
    process.stdout.write(figlet.textSync('agros'));
    process.stdout.write('\n\n');

    const logger = new Logger();
    const configParser = new ProjectConfigParser();
    const platformName = configParser.getConfig<string>('platform');
    const platformLoader = new PlatformLoader(platformName);

    if (typeof platformLoader.runCommands !== 'function') {
        logger.error(`Unable to load platform '${platformName}'`);
        process.exit(2);
    }

    try {
        platformLoader.runCommands(command);
    } catch (e) {
        logger.error(e.message || e.toString());
        process.exit(3);
    }
};
