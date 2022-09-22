import { Injectable } from '@agros/common';

@Injectable()
export class BazService {
    public sayHello() {
        console.log('Hello, Agros global module is working');
    }
}
