import { Factory } from '../src';
import { HelloModule } from './hello/hello.module';
import { HelloService } from './hello/hello.service';

const factory = new Factory();

const helloModule = factory.create(HelloModule);

helloModule.rootModule.get(HelloService).getHello();
