import ServiceCollectionFactory from './service/service.factory';
import ModuleCollectionFactory from './module/module.factory';
import ComponentCollectionFactory from './component/component.factory';
import { ApplicationCollectionFactory } from './application/application.factory';

export default {
    application: ApplicationCollectionFactory,
    service: ServiceCollectionFactory,
    module: ModuleCollectionFactory,
    component: ComponentCollectionFactory,
};
