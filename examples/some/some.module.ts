import { Module } from '../../src';
import { SomeService } from './some.service';

@Module({
    providers: [
        SomeService,
    ],
})
export class SomeModule {}
