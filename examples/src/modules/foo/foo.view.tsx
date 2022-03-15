import React, {
    FunctionComponent,
    PropsWithChildren,
    useEffect,
} from 'react';
import {
    AbstractView,
    Injectable,
    View,
} from '../../../../lib';
import { FooService } from './foo.service';

type FooComponentWithServicesProps = PropsWithChildren<{
    fooService: FooService;
}>;

@View({
    pathname: '/foo',
})
@Injectable()
export class FooView extends AbstractView implements AbstractView {
    public constructor(
        protected readonly fooService: FooService,
    ) {
        super();
    }

    protected withServices<C = any, N = any>(FooComponent: React.FunctionComponent<C>): React.FunctionComponent<C & N> {
        return (props) => {
            return <FooComponent {...props} fooService={this.fooService} />;
        };
    }

    protected generateView(): FunctionComponent<FooComponentWithServicesProps> {
        return (props: FooComponentWithServicesProps) => {
            useEffect(() => {
                props.fooService.logHello();
            }, []);

            return <div>Khamsa is working!</div>;
        };
    }
}
