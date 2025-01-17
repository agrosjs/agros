import { Injectable } from '@agros/common';
import { BarService } from '../bar/bar.service';
import { BazService } from '../baz/baz.service';

@Injectable()
export class FooService {
    public constructor(
        protected readonly barService: BarService,
        protected readonly bazService: BazService,
    ) {}

    public logHello() {
        console.log('Hello, Agros is working');
        this.barService.sayHello();
        this.bazService.sayHello();
    }
}
