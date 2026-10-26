import {basePath} from '@/lib/token';
export default function NotFound(){return <main className="lost-page"><p className="eyebrow">THE WRONG BANK</p><h1>Nothing stirs here.</h1><p>The sisters are waiting elsewhere.</p><a className="button" href={`${basePath}/`}>Return to the pond</a></main>;}
