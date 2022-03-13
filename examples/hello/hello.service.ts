import { Injectable } from '../../src';
import { WordService } from './word.service';
import { SomeService } from '../some/some.service';

@Injectable()
export class HelloService {
    public constructor(
      private readonly someService: SomeService,
      private readonly wordService: WordService) {
    }

    public getHello() {
        console.log('hello world!');
        this.wordService.getName();
        this.someService.doSomething();
    }
}
