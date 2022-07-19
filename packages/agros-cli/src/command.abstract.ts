import { Command } from 'commander';
import { getCollections } from './utils';

export abstract class AbstractCommand {
    protected collections = getCollections();
    public abstract register(): Command;
}
