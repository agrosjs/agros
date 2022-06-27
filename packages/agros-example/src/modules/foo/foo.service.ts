import { Injectable } from '@agros/app';
import { BarService } from '../bar/bar.service';
import { BazService } from '../baz/baz.service';

@Injectable()
export class FooService {
    public constructor(
        protected readonly barService: BarService,
        protected readonly bazService: BazService,
    ) {}

    public logHello() {
        console.log('Hello, Khamsa is working');
        this.barService.sayHello();
        this.bazService.sayHello();
    }
}
