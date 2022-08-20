/* eslint-disable @typescript-eslint/no-this-alias */
/* eslint-disable @typescript-eslint/no-invalid-this */
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
    const context = this;
    const callback = this.async();
    const resourceAbsolutePath: string = this.resourcePath;

    if (!resourceAbsolutePath) {
        return callback(null, source);
    }

    check(
        source,
        context,
        checkModule,
        checkService,
    ).then(() => {
        return transform(
            source,
            context,
            transformEntry,
            transformComponentDecorator,
            transformComponentFile,
        );
    }).then((newCode) => {
        if (!newCode) {
            return source;
        }
        return newCode;
    }).then((code) => {
        return callback(null, code);
    }).catch((e) => {
        callback(e, source);
    });
}
