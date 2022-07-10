import { updateImportedEntityToModule } from '../updaters';
import { getEntityDescriptorWithAlias } from '../utils';

updateImportedEntityToModule(
    getEntityDescriptorWithAlias('/Users/lenconda/workspace/agros/packages/agros-example/src/modules/foo/foo.module.ts'),
    getEntityDescriptorWithAlias('/Users/lenconda/workspace/agros/packages/agros-example/src/modules/lorem/lorem.module.ts'),
).then((res) => console.log(res));
