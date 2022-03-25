import {
    useState,
    useContext,
    useEffect,
} from 'react';
import { AppContext } from '../context';
import { Type } from '../types';

export const useProvider = <T>(type: Type): T => {
    const context = useContext(AppContext);
    const [providerInstance, setProviderInstance] = useState<T>(undefined);

    useEffect(() => {
        console.log(context);
        setProviderInstance(context.get(type) as T);
    }, [context]);

    return providerInstance;
};
