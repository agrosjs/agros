import { Injectable } from '@agros/app';

@Injectable()
export class BarService {
    public sayHello() {
        console.log('Hello from bar service');
    }
}
