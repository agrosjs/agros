import './index.css';
import { AppModule } from '@/app.module';
import VueRouter from '@agros/platform-vue/lib/vue-router';

export default [
    {
        module: AppModule,
        container: document.getElementById('root'),
        RouterComponent: VueRouter.createWebHashHistory(),
    },
];
