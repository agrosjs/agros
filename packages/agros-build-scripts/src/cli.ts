import {
    eject,
    run,
} from './commands';
import figlet from 'figlet';

export const cli = async (command: string) => {
    process.stdout.write(figlet.textSync('agros'));
    process.stdout.write('\n\n');

    switch (command) {
        case 'eject': {
            eject();
            break;
        }
        default: {
            run(command);
            break;
        }
    }
};
