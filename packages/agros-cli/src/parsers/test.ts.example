import { bootstrap as testBootstrap, test } from '@agros/core';
import { HashRouter } from '@agros/core/lib/router';
import reportWebVitals from '@/report-web-vitals';
import { AppModule } from '@/app.module';
import '@/index.less';

testBootstrap([
    {
        module: AppModule,
        RouterComponent: HashRouter,
        container: document.getElementById('root'),
    },
]);

test();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
