import {
    Global,
    Module,
} from '../../../../lib';
import { BazService } from './baz.service';

@Module({
    providers: [
        BazService,
    ],
})
@Global()
export class BazModule {}
