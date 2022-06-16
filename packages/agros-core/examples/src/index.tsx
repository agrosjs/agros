import './index.css';
import reportWebVitals from './reportWebVitals';
import { bootstrap } from '../../lib';
import { AppModule } from './app.module';

bootstrap([
    {
        module: AppModule,
        container: document.getElementById('root'),
    },
]);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
