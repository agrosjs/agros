import { Module } from '../../../../lib';
import { BarModule } from '../bar/bar.module';
import { FooChildView } from './foo-child.view';
import { FooService } from './foo.service';
import { FooView } from './foo.view';

@Module({
    imports: [
        BarModule,
    ],
    providers: [
        FooService,
    ],
    views: [
        // import('./foo.view'),
        // import('./foo-child.view'),
        FooView,
        FooChildView,
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
