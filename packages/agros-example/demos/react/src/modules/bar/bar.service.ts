import { Injectable } from '@agros/common';

@Injectable()
export class BarService {
    public sayHello() {
        console.log('Hello from bar service');
    }
}
