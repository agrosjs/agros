import React from 'react';

export abstract class AbstractView {
    public abstract getComponent<Props>(): React.FC<Props> | React.Component<Props>;
}
