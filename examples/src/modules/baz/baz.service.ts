import { Injectable } from '../../../../lib';

@Injectable()
export class BazService {
    public sayHello() {
        console.log('Hello, Khamsa global module is working');
    }
}
