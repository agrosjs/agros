import { Module } from '@agros/app';
import { LoremComponent } from './lorem.component';
import { LoremService } from './lorem.service';

@Module({
    components: [
        LoremComponent,
    ],
    providers: [
        LoremService,
    ],
    routes: [
        {
            path: 'lorem',
            useComponentClass: LoremComponent,
        },
    ],
})
export class LoremModule {}
