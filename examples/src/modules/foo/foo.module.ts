import { Module } from '../../../../lib';
import { BarModule } from '../bar/bar.module';
import { FooService } from './foo.service';

@Module({
    imports: [
        BarModule,
    ],
    providers: [
        FooService,
    ],
    views: [
        {
            path: '/app/foo',
            provider: (parse) => () => parse(import('./foo.view')),
            suspenseFallback: '/app/foo is loading...',
        },
        {
            path: '/app/foo/child',
            provider: (parse) => () => parse(import('./foo-child.view')),
            suspenseFallback: '/app/child/foo is loading...',
        },
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
