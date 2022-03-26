import React, { PropsWithChildren, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { InjectedComponentProps } from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

const Foo: React.FC<InjectedComponentProps> = ({ declarations }) => {
    const Bar = declarations.get<React.FC<PropsWithChildren<{ used: string }>>>(BarComponent);
    const fooService = declarations.get<FooService>(FooService);
    const barService = declarations.get<BarService>(BarService);

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
