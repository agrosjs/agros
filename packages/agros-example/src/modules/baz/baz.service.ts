import { Injectable } from '@agros/app';

@Injectable()
export class BazService {
    public sayHello() {
        console.log('Hello, Khamsa global module is working');
    }
}
