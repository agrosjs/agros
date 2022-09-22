import {
    Global,
    Module,
} from '@agros/common';
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
