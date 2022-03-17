import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import { RouterContainer } from '../../lib';
import { HashRouter as Router } from 'react-router-dom';
import { AppModule } from './app.module';

interface WrapperProps {
    RootModule: any;
}

const Wrapper: React.FC<WrapperProps> = ({
    RootModule,
}) => {
    return (
        <>
            It's working!
            <Router>
                <RouterContainer module={RootModule} />
            </Router>
        </>
    );
};

ReactDOM.render(
    <Wrapper RootModule={AppModule} />,
    document.getElementById('root'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
