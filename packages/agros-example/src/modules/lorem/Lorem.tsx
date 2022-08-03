import React from '@agros/platform-react/lib/react';
import { LoremService } from './lorem.service';
import { forwardContainer } from '@agros/platform-react/lib/forward-container';

const Lorem: React.FC = forwardContainer(({ container }) => {
    const loremService = container.get<LoremService>(LoremService);

    React.useEffect(() => {
        loremService.sayHello();
    }, []);

    return (
        <div>Welcome to Lorem page!</div>
    );
});

export default React.memo(Lorem);
