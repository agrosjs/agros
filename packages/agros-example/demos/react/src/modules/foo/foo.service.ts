import { Injectable } from '@agros/common';
import { BarService } from '../bar/bar.service';
import { BazService } from '../baz/baz.service';
import { Inject } from '@agros/common/lib/decorators/inject.decorator';

@Injectable()
export class FooService {
    @Inject('TEST')
    private readonly test: any;

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
