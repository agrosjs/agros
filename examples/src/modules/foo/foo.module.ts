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
        import('./foo.view'),
        import('./foo-child.view'),
    ],
    exports: [
        FooService,
    ],
})
export class FooModule {}
