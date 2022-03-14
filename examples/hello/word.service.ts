import { Injectable } from '../../src';

@Injectable()
export class WordService {
    public getName() {
        console.log('WordService: khamsa is working');
    }
}
