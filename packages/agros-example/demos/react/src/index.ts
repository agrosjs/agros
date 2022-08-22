import './index.css';
import { HashRouter } from '@agros/platform-react/lib/react-router-dom';
import { AppModule } from '@/app.module';

export default {
    module: AppModule,
    container: document.getElementById('root'),
    RouterComponent: HashRouter,
};
