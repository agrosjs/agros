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
            provider: (parser, moduleInstance) => {
                return () => parser(import('./foo.view'), moduleInstance);
            },
            suspenseFallback: '/app/foo is loading...',
        },
        {
            path: '/app/foo/child',
            provider: (parser, moduleInstance) => {
                return () => parser(import('./foo-child.view'), moduleInstance);
            },
            suspenseFallback: '/app/child/foo is loading...',
        },
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
