import { Module } from '../../../../lib';
import { BarService } from './bar.service';

@Module({
    providers: [
        BarService,
    ],
})
export class BarModule {}
