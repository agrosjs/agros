import {
    Inject,
    Injectable,
    ROUTES,
} from '@agros/common';

@Injectable()
export class LoremService {
    @Inject(ROUTES)
    private selfRoutes: any[];

    public constructor(@Inject(ROUTES) routes: any[]) {
        console.log('Routes by parameter injector:', routes);
    }

    public sayHello() {
        console.log('Routes by self declared injector from sayHello:', this.selfRoutes);
        console.log('Greetings from LoremService');
    }
}
