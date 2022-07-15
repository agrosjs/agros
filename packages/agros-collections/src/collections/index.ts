import ServiceCollectionFactory from './service/service.factory';
import ModuleCollectionFactory from './module/module.factory';
import ComponentCollectionFactory from './component/component.factory';

export default {
    service: ServiceCollectionFactory,
    module: ModuleCollectionFactory,
    component: ComponentCollectionFactory,
};
