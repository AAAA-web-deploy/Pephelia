'use client';
import {useRef} from 'react';
import chapters from '@/content/chapters.json';
import {asset,token} from '@/lib/token';
import {sitePath} from '@/lib/pephelia-paths';
import styles from './PepheliaUpdates.module.css';
type Active='purchase'|'communication'|'home';
export default function PepheliaNavigation({active='home'}:{active?:Active}){
 const mobile=useRef<HTMLDetailsElement>(null);
 function close(){if(mobile.current)mobile.current.open=false;}
 const primary=[['The twins',sitePath('#twins')],['The atlas',sitePath('#journey')],['The token',sitePath('#token')],['How to Purchase',sitePath('how-to-purchase/'),'purchase'],['Communication',sitePath('communication/'),'communication']];
 return <><a className="skip-link" href="#main">Skip to content</a><header className={styles.navigation}>
  <a className={styles.brand} href={sitePath('#home')} aria-label={`${token.name} home`}><img src={asset('logo-96.png')} width="42" height="42" alt=""/><span>PEPHELIA <span>TWIN</span></span></a>
  <nav className={styles.desktopNav} aria-label="Main navigation">{primary.map(([label,href,key])=><a key={label} href={href} aria-current={key===active?'page':undefined}>{label}</a>)}<details className={styles.chapters}><summary>Chapters <span aria-hidden="true">⌄</span></summary><ol>{chapters.map(c=><li key={c.id}><a href={sitePath(`#${c.id}`)}><span>{c.number}</span>{c.title}</a></li>)}</ol></details></nav>
  <details className={styles.mobileMenu} ref={mobile}><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">{primary.map(([label,href,key])=><a key={label} href={href} onClick={close} aria-current={key===active?'page':undefined}>{label}<span aria-hidden="true">↗</span></a>)}<details className={styles.mobileChapters}><summary>The ten chapters</summary><ol>{chapters.map(c=><li key={c.id}><a onClick={close} href={sitePath(`#${c.id}`)}>{c.number} · {c.title}</a></li>)}</ol></details></nav></details>
 </header></>;
}
