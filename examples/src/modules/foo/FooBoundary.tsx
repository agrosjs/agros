import React, {
    FC,
    useEffect,
    useState,
} from 'react';

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

    return (<>Boundary test, throwing error, remains: {remainedTime}</>);
};

export default FooBoundary;
