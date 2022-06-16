import Agros, { Component } from '../../../../lib';
import { LoremService } from './lorem.service';

@Component({
    factory: () => Agros.lazy(() => import('./Lorem')),
    declarations: [
        LoremService,
    ],
})
export class LoremComponent {}
