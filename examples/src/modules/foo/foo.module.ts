import { Module } from '../../../../lib';
import { FooNavigateView } from './foo-navigate.view';
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
        FooNavigateView,
    ],
})
export class FooModule {}
