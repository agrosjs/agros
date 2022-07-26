import { FC } from 'react';
import {
    useEffect,
    useState,
} from '@agros/app';

const FooBoundary: FC = () => {
    const [remainedTime, setRemainedTime] = useState<number>(5000);

    useEffect(() => {
        const intervalId = setInterval(() => {
            if (remainedTime > 0) {
                setRemainedTime(remainedTime - 1000);
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [remainedTime]);

    useEffect(() => {
        if (remainedTime <= 0) {
            throw new Error('Error thrown');
        }
    }, [remainedTime]);

    return (<p className="foo-boundary test">Boundary test, throwing error, remains: {remainedTime}</p>);
};

export default FooBoundary;
