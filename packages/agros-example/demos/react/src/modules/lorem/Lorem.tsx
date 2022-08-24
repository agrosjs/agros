import { getContainer } from '@agros/app';
import React from '@agros/platform-react/lib/react';
import { LoremService } from './lorem.service';

const Lorem: React.FC = () => {
    const container = getContainer();
    const loremService = container.get<LoremService>(LoremService);

    React.useEffect(() => {
        loremService.sayHello();
    }, []);

    return (
        <div>Welcome to Lorem page!</div>
    );
};

export default React.memo(Lorem);
