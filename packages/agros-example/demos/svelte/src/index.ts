import './index.css';
import { AppModule } from '@/app.module';

export default {
    module: AppModule,
    container: document.getElementById('root'),
    RouterComponent: 'hash',
};
