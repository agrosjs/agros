import { createContext } from 'react';
import { Type } from './types';

export const AppContext = createContext(new Map<Type, any>());
