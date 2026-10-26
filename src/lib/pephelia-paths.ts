import {basePath} from '@/lib/token';
/** Root-relative links that also work from nested GitHub Pages routes. */
export function sitePath(path=''):string{return `${basePath}/${path.replace(/^\/+/, '')}`;}
