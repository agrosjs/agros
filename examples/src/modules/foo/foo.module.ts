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
            id: 'app.foo',
            path: '/foo',
            parent: 'app',
            suspenseFallback: '/app/foo is loading...',
            provider: (parse) => () => parse(import('./foo.view')),
        },
        {
            id: 'app.foo.child',
            path: '/child',
            parent: 'app.foo',
            suspenseFallback: '/app/child/foo is loading...',
            provider: (parse) => () => parse(import('./foo-child.view')),
        },
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
