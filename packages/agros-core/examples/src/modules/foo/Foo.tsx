import Agros, {
    getContainer,
    router,
} from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

const { useEffect } = Agros;

const Foo: Agros.FC = () => {
    const container = getContainer(Foo);
    const Bar = container.get<Agros.FC<Agros.PropsWithChildren<{ used: string }>>>(BarComponent);
    const fooService = container.get<FooService>(FooService);
    const barService = container.get<BarService>(BarService);

    useEffect(() => {
        fooService.logHello();
        barService.sayHello();
    }, []);

    return (
        <>
            <div>Khamsa is working!</div>
            {Bar && <Bar used="foo.module.ts" />}
            <router.Outlet />
        </>
    );
};

export default Foo;
