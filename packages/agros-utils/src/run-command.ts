import {
    spawn,
    SpawnOptions,
} from 'child_process';

export const runCommand = (command: string, args: string[] = [], options: SpawnOptions = {}): Promise<true | Error> => {
    try {
        return new Promise((resolve) => {
            const subProcess = spawn(command, args, options);
            subProcess.on('error', resolve);
            subProcess?.stdout?.on('error', resolve);
            subProcess.on('exit', (code) => resolve(
                code !== 0
                    ? new Error('Process exited with code ' + code)
                    : true,
            ));
        });
    } catch (e) {
        return Promise.resolve(e);
    }
};
