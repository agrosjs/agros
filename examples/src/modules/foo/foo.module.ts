import { Module } from '../../../../lib';
import { FooChildView } from './foo-child.view';
import { FooNavigateView } from './foo-navigate.view';
import { FooService } from './foo.service';
import { FooView } from './foo.view';

@Module({
    imports: [
        import('../bar/bar.module'),
    ],
    providers: [
        FooService,
    ],
    views: [
        FooView,
        FooChildView,
        FooNavigateView,
    ],
})
export class FooModule {}
