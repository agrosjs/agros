import { Module } from '../../src';
import { SomeModule } from '../some/some.module';
import { WordService } from './word.service';
import { HelloService } from './hello.service';

@Module({
    imports: [
        SomeModule,
    ],
    providers: [
        WordService,
        HelloService,
    ],
})
export class HelloModule {}
