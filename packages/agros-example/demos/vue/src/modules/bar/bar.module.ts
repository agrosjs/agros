import { Module } from '@agros/common';
import { BarComponent } from './bar.component';
import { BarService } from './bar.service';

@Module({
    components: [
        BarComponent,
    ],
    providers: [
        BarService,
        BarComponent,
    ],
    exports: [
        BarService,
        BarComponent,
    ],
})
export class BarModule {}
