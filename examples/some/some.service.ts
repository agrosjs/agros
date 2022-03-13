import { Injectable } from '../../src';

@Injectable()
export class SomeService {
    public doSomething() {
        console.log('I am do something.');
    }
}
