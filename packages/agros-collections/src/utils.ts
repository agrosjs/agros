import {
    EntityDescriptor,
    updateImportedEntityToModule,
    UpdateItem,
} from '@agros/common';

export const updateCorrespondingTargetModule = async (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
) => {
    const result = [] as UpdateItem[][];

    if (sourceDescriptor.modules[0]) {
        const sourceModuleDescriptor = sourceDescriptor.modules[0];
        const sourceModuleUpdates = await updateImportedEntityToModule(
            sourceDescriptor,
            sourceModuleDescriptor,
        );
        result[0] = sourceModuleUpdates;

        if (targetDescriptor.modules[0]) {
            const targetModuleDescriptor = targetDescriptor.modules[0];
            const targetModuleUpdates = await updateImportedEntityToModule(
                sourceModuleDescriptor,
                targetModuleDescriptor,
            );
            result[1] = targetModuleUpdates;
        }
    }

    return result;
};
