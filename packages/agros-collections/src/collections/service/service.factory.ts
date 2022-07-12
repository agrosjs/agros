import { AbstractCollection } from '@agros/common';
import * as path from 'path';

export class ServiceCollectionFactory extends AbstractCollection implements AbstractCollection {
    public run<T = any>(props: T): void {
    }
}

export const test = () => {
    console.log(path.resolve('../files/fuck.txt'));
};
