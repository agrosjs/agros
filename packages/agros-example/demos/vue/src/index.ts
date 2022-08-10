import './index.css';
import { AppModule } from '@/app.module';
import * as VueRouter from 'vue-router';

export default [
    {
        module: AppModule,
        container: document.getElementById('root'),
        RouterComponent: VueRouter.createWebHashHistory(),
    },
];
