import settings from '@/content/token.json';
import {resolveTokenLinks} from './token-config';
export const token=settings;
export const basePath=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\/$/,'');
export const asset=(name:string)=>`${basePath}/assets/${name}`;
export const tokenLinks=(config:typeof settings=settings)=>resolveTokenLinks(config);
