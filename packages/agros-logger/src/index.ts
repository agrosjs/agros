/* eslint-disable no-useless-concat */
import * as readline from 'readline';
import {
    dots,
    Spinner,
} from 'cli-spinners';
import _ from 'lodash';

export class Logger {
    public info(message: string) {
        process.stdout.write(message + '\n');
    }

    public warning(message: string) {
        process.stdout.write('\x1b[33m' + 'Warning: ' + message + '\x1b[0m\n');
    }

    public success(message: string) {
        process.stdout.write('\x1b[32m' + message + '\x1b[0m\n');
    }

    public error(message: string, error?: Error) {
        process.stdout.write('\x1b[31m' + 'Error: ' + message + '\x1b[0m\n');
        if (error) {
            process.stdout.write('\x1b[31m' + error?.message + '\x1b[0m\n');
            process.stdout.write('\x1b[31m' + error?.stack + '\x1b[0m\n');
        }
    }

    public loadingLog(message: string) {
        if (!message || !_.isString(message)) {
            return;
        }

        const icons = {
            success: '✔',
            warning: '⚠',
            error: '✖',
        };

        const colors = {
            success: '\x1b[32m',
            warning: '\x1b[33m',
            error: '\x1b[31m',
        };

        const intervalId = this.spinLog(dots, message);

        const handleLogEnd = (status: 'success' | 'warning' | 'error', endText: string = message) => {
            clearInterval(intervalId);
            this.updateLog(colors[status] + icons[status] + '\x1b[0m' + ' ' + endText);
            process.stdout.write('\n');
        };

        return handleLogEnd;
    }

    private updateLog(message: string) {
        if (!message || !_.isString(message)) {
            return;
        }

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(message);
    }

    private spinLog(spinner: Spinner, message) {
        let i = 0;

        const {
            frames,
            interval,
        } = spinner;

        const intervalId = setInterval(() => {
            this.updateLog('\x1b[36m' + frames[i = ++i % frames.length] + '\x1b[0m' + ' ' + message);
        }, interval);

        return intervalId;
    }
}
