import { FC } from 'react';
import {
    forwardContainer,
    useEffect,
    memo,
} from '../../../../lib';
import { LoremService } from './lorem.service';

const Lorem: FC = forwardContainer(({ container }) => {
    const loremService = container.get<LoremService>(LoremService);

    useEffect(() => {
        loremService.sayHello();
    }, []);

    return (
        <div>Welcome to Lorem page!</div>
    );
});

export default memo(Lorem);
