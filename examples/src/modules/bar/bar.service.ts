import { Injectable } from '../../../../lib';

@Injectable()
export class BarService {
    public sayHello() {
        console.log('Hello from bar service');
    }
}
