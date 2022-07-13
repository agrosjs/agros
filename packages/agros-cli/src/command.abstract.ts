import { Command } from 'commander';

export abstract class AbstractCommand {
    public abstract register(): Command;
}
