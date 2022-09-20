import { Logger } from '@agros/tools/lib/logger';
import { Command } from 'commander';

export abstract class AbstractCommand {
    protected logger = new Logger();
    public abstract register(): Command;
}
