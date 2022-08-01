type CommandRunner = () => void | Promise<void>;

export interface CommandConfig {
    start: CommandRunner;
    build: CommandRunner;
    test?: CommandRunner;
    [commandName: string]: CommandRunner;
}
