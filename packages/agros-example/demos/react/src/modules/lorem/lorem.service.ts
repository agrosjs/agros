import {
    Inject,
    Injectable,
    ROUTES,
} from '@agros/common';

@Injectable()
export class LoremService {
    public constructor(@Inject(ROUTES) routes: any[]) {
        console.log('Routes by injector:', routes);
    }

    public sayHello() {
        console.log('Greetings from LoremService');
    }
}
