import {
    Global,
    Module,
} from '@agros/app';
import { BazService } from './baz.service';

@Module({
    providers: [
        BazService,
    ],
    exports: [
        BazService,
    ],
})
@Global()
export class BazModule {}
