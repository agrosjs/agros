import { Injectable } from '@agros/app';

@Injectable()
export class BazService {
    public sayHello() {
        console.log('Hello, Agros global module is working');
    }
}
