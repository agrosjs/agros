import { Component } from '@agros/app';
import { LoremService } from './lorem.service';

@Component({
    file: './Lorem.vue',
    lazy: true,
    declarations: [
        LoremService,
    ],
})
export class LoremComponent {}
