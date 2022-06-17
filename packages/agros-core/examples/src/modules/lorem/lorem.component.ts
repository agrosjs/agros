import {
    Component,
    lazy,
} from '../../../../lib';
import { LoremService } from './lorem.service';

@Component({
    factory: () => lazy(() => import('./Lorem')),
    declarations: [
        LoremService,
    ],
})
export class LoremComponent {}
