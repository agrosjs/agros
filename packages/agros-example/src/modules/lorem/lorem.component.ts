import {
    Component,
    lazy,
} from '@agros/app';
import { LoremService } from './lorem.service';

@Component({
    factory: () => lazy(() => import('./Lorem')),
    declarations: [
        LoremService,
    ],
})
export class LoremComponent {}
