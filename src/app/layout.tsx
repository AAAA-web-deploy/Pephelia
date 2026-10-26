import type {Metadata,Viewport} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import VisitorTracker from '@/components/VisitorTracker';
import {asset,token} from '@/lib/token';
const display=localFont({src:[{path:'./fonts/cinzel-medium.woff',weight:'500',style:'normal'},{path:'./fonts/cinzel-bold.woff',weight:'700',style:'normal'}],display:'swap',variable:'--font-display'});
const reading=localFont({src:[{path:'./fonts/cormorant-regular.woff',weight:'400',style:'normal'},{path:'./fonts/cormorant-italic.woff',weight:'400',style:'italic'}],display:'swap',variable:'--font-reading'});
export const metadata:Metadata={title:`${token.name} — Same blood. Opposite sides.`,description:'Two sisters born together. Blue sees a floor. Red sees a ceiling. Enter the dark world of Pephelia Twin and follow the Candle War.',icons:{icon:asset('favicon.png'),apple:asset('apple-touch-icon.png')},openGraph:{title:`${token.name} — Same blood. Opposite sides.`,description:'One token. Two sisters. An argument older than the last candle.',type:'website'},robots:{index:true,follow:true}};
export const viewport:Viewport={themeColor:'#08090c',colorScheme:'dark'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body className={`${display.variable} ${reading.variable}`}><VisitorTracker />{children}</body></html>;}
