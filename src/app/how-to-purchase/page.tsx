import type {Metadata} from 'next';
import {PurchasePage} from '@/components/PepheliaSupportingPages';
export const metadata:Metadata={title:'How to Purchase — Pephelia Twin',description:'A flexible Ethereum purchase guide for Pephelia Twin: wallet choices, mainnet funds, the official contract and swap guidance.'};
export default function Page(){return <PurchasePage/>;}
