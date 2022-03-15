import { Injectable } from '../../../../lib';
import { BarService } from '../bar/bar.service';

@Injectable()
export class FooService {
    public constructor(
        protected readonly barService: BarService,
    ) {}

    public logHello() {
        console.log('Hello, Khamsa is working');
        this.barService.sayHello();
    }
}
