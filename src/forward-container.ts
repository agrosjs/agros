import {
    createElement,
    ReactElement,
} from 'react';
import {
    Container,
    ContainerForwardedComponentProps,
} from './types';

export const forwardContainer = <Props>(
    render: (props: ContainerForwardedComponentProps<Props>) => ReactElement,
) => {
    return ({ $container, ...props }: Props & { $container: Container }) => {
        const componentProps = props as unknown as Props;
        return createElement(
            render,
            {
                container: $container,
                props: componentProps,
            },
        );
    };
};
