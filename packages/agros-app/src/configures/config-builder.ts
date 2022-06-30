import { OverrideFunc } from 'customize-cra';

export const configBuilder = (...configs: OverrideFunc[]): OverrideFunc[] => {
    return configs;
};
