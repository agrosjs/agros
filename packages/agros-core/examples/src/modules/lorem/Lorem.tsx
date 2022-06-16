import Agros, { forwardContainer } from '../../../../lib';
import { LoremService } from './lorem.service';

const Lorem: Agros.FC = forwardContainer(({ container }) => {
    const loremService = container.get<LoremService>(LoremService);

    Agros.useEffect(() => {
        loremService.sayHello();
    }, []);

    return (
        <div>Welcome to Lorem page!</div>
    );
});

export default Agros.memo(Lorem);
