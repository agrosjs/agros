import { Configuration } from 'webpack';

export type BuilderConfig = Configuration;
export type ConfigGenerator = (config: BuilderConfig) => BuilderConfig | undefined;

export const defineBuilderConfig = (configGenerator: ConfigGenerator) => configGenerator;
