import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useProvider } from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

const Foo: React.FC = ({ $declarations, ...props }: any) => {
    const [Bar, setBar] = useState<React.FC>();

    useEffect(() => {
        if ($declarations.get(FooService)) {
            ($declarations.get(FooService) as FooService).logHello();
        }

        if ($declarations.get(BarService)) {
            ($declarations.get(BarService) as BarService).sayHello();
        }

        if ($declarations.get(BarComponent)) {
            console.log(BarComponent, $declarations.get(BarComponent));
            setBar($declarations.get(BarComponent) as React.FC);
        }
    }, [$declarations]);

    return (
        <>
            <div>Khamsa is working!</div>
            {Bar}
            <Outlet />
        </>
    );
};

export default Foo;
