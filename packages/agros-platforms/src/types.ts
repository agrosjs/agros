type CommandRunner = () => void | Promise<void>;

export interface CommandConfig {
    run: CommandRunner;
    build: CommandRunner;
    test?: CommandRunner;
    [commandName: string]: CommandRunner;
}
