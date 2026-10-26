'use client';
import {useRef,useState,type ReactNode} from 'react';
import chapters from '@/content/chapters.json';
import {asset,token,tokenLinks} from '@/lib/token';
import {sitePath} from '@/lib/pephelia-paths';
import styles from './PepheliaUpdates.module.css';
type Active='purchase'|'communication'|'home';
const links=tokenLinks();
function CopyIcon(){return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="6" y="6" width="11" height="11" rx="1" stroke="currentColor"/><path d="M3 13H2V2h11v1" stroke="currentColor"/></svg>;}
function XIcon(){return <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17.5 3h3.1l-6.8 7.8L22 21h-6.2l-4.8-6.3L5.7 21H2.6l7.3-8.3L2 3h6.3l4.4 5.8L17.5 3Zm-1.1 16.2h1.7L7.7 4.7H5.9l10.5 14.5Z"/></svg>;}
function TelegramIcon(){return <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.5 4.3 18.3 19.4c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.2 9.5-8.6c.4-.4-.1-.6-.6-.2L6.2 13.1 1.2 11.5c-1.1-.3-1.1-1.1.2-1.6L20 3.1c.9-.3 1.7.2 1.5 1.2Z"/></svg>;}
function IconControl({href,label,track,children}:{href?:string|null;label:string;track?:'open-x'|'open-telegram'|'copy-ca';children:ReactNode}){const shared={className:styles.iconButton,'aria-label':label,'data-track':href||track==='copy-ca'?track:undefined};if(href)return <a {...shared} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;return <button type="button" {...shared}>{children}</button>;}
function SiteIcons(){const[note,setNote]=useState('');async function copyContract(){if(!links.contract){setNote('Contract address not announced yet.');return;}try{await navigator.clipboard.writeText(links.contract);setNote('Contract address copied.');}catch{setNote('Clipboard access is unavailable.');}}
 return <div className={styles.socials}><button type="button" className={styles.iconButton} aria-label="Copy contract address" data-track={links.contract?'copy-ca':undefined} onClick={()=>void copyContract()}><CopyIcon/></button><IconControl href={links.x} label="X" track="open-x"><XIcon/></IconControl><IconControl href={links.telegram} label="Telegram" track="open-telegram"><TelegramIcon/></IconControl><p className={styles.iconNote} role="status">{note}</p></div>;}
export default function PepheliaNavigation({active='home'}:{active?:Active}){
 const mobile=useRef<HTMLDetailsElement>(null);
 function close(){if(mobile.current)mobile.current.open=false;}
 const primary=[['The twins',sitePath('#twins')],['The atlas',sitePath('#journey')],['The token',sitePath('#token')],['How to Purchase',sitePath('how-to-purchase/'),'purchase'],['Communication',sitePath('communication/'),'communication']];
 return <><a className="skip-link" href="#main">Skip to content</a><header className={styles.navigation}>
  <a className={styles.brand} href={sitePath('#home')} aria-label={`${token.name} home`}><img src={asset('logo-96.png')} width="42" height="42" alt=""/><span>PEPHELIA <span>TWIN</span></span></a>
  <nav className={styles.desktopNav} aria-label="Main navigation">{primary.map(([label,href,key])=><a key={label} href={href} aria-current={key===active?'page':undefined}>{label}</a>)}<details className={styles.chapters}><summary>Chapters <span aria-hidden="true">⌄</span></summary><ol>{chapters.map(c=><li key={c.id}><a href={sitePath(`#${c.id}`)}><span>{c.number}</span>{c.title}</a></li>)}</ol></details></nav>
  <div className={styles.headerEnd}><SiteIcons/><details className={styles.mobileMenu} ref={mobile}><summary>Menu <span aria-hidden="true">☰</span></summary><nav aria-label="Mobile navigation">{primary.map(([label,href,key])=><a key={label} href={href} onClick={close} aria-current={key===active?'page':undefined}>{label}<span aria-hidden="true">↗</span></a>)}<details className={styles.mobileChapters}><summary>The ten chapters</summary><ol>{chapters.map(c=><li key={c.id}><a onClick={close} href={sitePath(`#${c.id}`)}>{c.number} · {c.title}</a></li>)}</ol></details></nav></details></div>
 </header></>;
}
