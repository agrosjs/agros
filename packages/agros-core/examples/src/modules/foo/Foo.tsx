import React, {
    FC,
    PropsWithChildren,
    useEffect,
} from 'react';
import { Outlet } from 'react-router-dom';
import { getContainer } from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

const Foo: FC = () => {
    const container = getContainer(Foo);
    const Bar = container.get<FC<PropsWithChildren<{ used: string }>>>(BarComponent);
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
            <Outlet />
        </>
    );
};

export default Foo;
