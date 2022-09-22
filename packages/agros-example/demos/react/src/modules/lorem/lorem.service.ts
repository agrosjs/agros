import { Injectable } from '@agros/common';

@Injectable()
export class LoremService {
    public sayHello() {
        console.log('Greetings from LoremService');
    }
}
