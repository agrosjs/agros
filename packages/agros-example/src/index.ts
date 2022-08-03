import './index.css';
import reportWebVitals from './reportWebVitals';
import { HashRouter } from '@agros/platform-react/lib/react-router-dom';
import { AppModule } from '@/app.module';

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

export default [
    {
        module: AppModule,
        container: document.getElementById('root'),
        RouterComponent: HashRouter,
    },
];
