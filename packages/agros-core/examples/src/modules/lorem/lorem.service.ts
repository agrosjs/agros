import { Injectable } from '../../../../lib';

@Injectable()
export class LoremService {
    public sayHello() {
        console.log('Greetings from LoremService');
    }
}
