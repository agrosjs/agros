import React from '@agros/platform-react/lib/react';
import { getContainer } from '@agros/app';
import { Outlet } from '@agros/platform-react/lib/react-router-dom';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

const Foo: React.FC = () => {
    const container = getContainer(Foo);
    const Bar = container.get<React.FC<React.PropsWithChildren<{ used: string }>>>(BarComponent);
    const fooService = container.get<FooService>(FooService);
    const barService = container.get<BarService>(BarService);

    React.useEffect(() => {
        fooService.logHello();
        barService.sayHello();
    }, []);

    return (
        <>
            <div>Agros is working!</div>
            {Bar && <Bar used="foo.module.ts" />}
            <Outlet />
        </>
    );
};

export default Foo;
