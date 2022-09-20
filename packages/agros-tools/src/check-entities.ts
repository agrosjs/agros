import { EntityDescriptor } from './types';

export const checkEntities = (entities: EntityDescriptor[]) => {
    if (entities.some((entity) => entity.modules.length > 1)) {
        throw new Error('A provider or component should only be declared by one module.');
    }
    return;
};
