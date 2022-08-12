import {
    Container,
    ContainerForwardedComponentProps,
} from '@agros/common/lib/types';
import React from './react';

export const forwardContainer = <Props>(
    render: (props: ContainerForwardedComponentProps<Props>) => React.ReactElement,
) => {
    return ({ $container, ...props }: Props & { $container: Container }) => {
        const componentProps = props as unknown as Props;
        return React.createElement(
            render,
            {
                container: $container,
                props: componentProps,
            },
        );
    };
};
