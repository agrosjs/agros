/* eslint-disable @typescript-eslint/no-invalid-this */
import generate from '@babel/generator';
import {
    check,
    transform,
} from './utils';
import {
    checkModule,
    checkService,
    transformEntry,
    transformComponentDecorator,
    transformComponentFile,
} from './aops';

export default function(source) {
    const resourceAbsolutePath = this.resourcePath;

    if (!resourceAbsolutePath) {
        return source;
    }

    check(
        source,
        this,
        checkModule,
        checkService,
    );

    const newAST = transform(
        source,
        this,
        transformEntry,
        transformComponentDecorator,
        transformComponentFile,
    );

    if (!newAST) {
        return source;
    }

    return generate(newAST).code;
}
