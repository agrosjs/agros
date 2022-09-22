import {
    Module,
    RouterModule,
} from '@agros/common';
import { LoremComponent } from './lorem.component';
import { LoremService } from './lorem.service';

@Module({
    imports: [
        RouterModule.forFeature({
            routes: [
                {
                    path: 'lorem',
                    useComponentClass: LoremComponent,
                },
            ],
        }),
    ],
    components: [
        LoremComponent,
    ],
    providers: [
        LoremService,
    ],
})
export class LoremModule {}
