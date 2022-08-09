import './index.css';
// import reportWebVitals from './reportWebVitals';
import VueRouter from '@agros/platform-vue/lib/vue-router';
import { AppModule } from '@/app.module';

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();

export default [
    {
        module: AppModule,
        container: document.getElementById('root'),
        RouterComponent: VueRouter.createWebHashHistory(),
    },
];
