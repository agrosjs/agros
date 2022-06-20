import {
    eject,
} from './commands';
import _ from 'lodash';
import { Logger } from '@agros/logger';

export const cli = async (command: string) => {
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
