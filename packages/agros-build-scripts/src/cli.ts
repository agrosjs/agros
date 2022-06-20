import {
    eject,
} from './commands';
import _ from 'lodash';
import { Logger } from '@agros/logger';
import figlet from 'figlet';

export const cli = async (command: string) => {
    process.stdout.write(figlet.textSync('agros'));
    process.stdout.write('\n\n');
    const logger = new Logger();
    const commandMap = {
        eject,
    };
    const commandProcessor = commandMap[command];

    if (!_.isFunction(commandMap[command])) {
        logger.error('Command "' + command + '" is not supported');
        process.exit(1);
    }

    commandProcessor();
};
