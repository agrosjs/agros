import {
    FunctionComponent,
    useEffect,
} from 'react';
import {
    AbstractComponent,
    View,
} from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';
import { Outlet } from 'react-router-dom';

@View({
    path: '/foo',
})
export class FooView extends AbstractComponent implements AbstractComponent {
    public constructor(
        protected readonly fooService: FooService,
        protected readonly barComponentService: BarComponent,
        protected readonly barService: BarService,
    ) {
        super();
    }

    protected generateComponent(): FunctionComponent<any> {
        const BarComponent = this.barComponentService.getComponent();

        return () => {
            useEffect(() => {
                this.fooService.logHello();
                this.barService.sayHello();
            }, []);

            return (
                <>
                    <div>Khamsa is working!</div>
                    <BarComponent />
                    <Outlet />
                </>
            );
        };
    }
}
