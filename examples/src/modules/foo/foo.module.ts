import { Module } from '../../../../lib';
import { FooService } from './foo.service';

@Module({
    imports: [
        import('../bar/bar.module'),
    ],
    providers: [
        FooService,
    ],
    views: [
        import('./foo.view'),
        import('./foo-child.view'),
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
