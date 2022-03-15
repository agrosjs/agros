import { Module } from '../../../../lib';
import { BarComponent } from './bar.component';
import { BarService } from './bar.service';

@Module({
    providers: [
        BarService,
        BarComponent,
    ],
})
export class BarModule {}
