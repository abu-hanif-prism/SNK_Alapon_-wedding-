'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
export function Brand() { return <Link className="brand" href="/"><span className="brand-mark">S.</span><span>SNAPNKEEP<small>THE WEDDING TIME</small></span></Link>; }
export function Heading({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode }) { return <header className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{children && <p>{children}</p>}</div>{action}</header>; }
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) { return children ? <div className={`notice ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>{children}</div> : null; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className="empty"><span className="empty-symbol">✧</span><h2>{title}</h2><div>{children}</div></div>; }
export function Loading() { return <div className="loading" role="status"><span className="spinner"/> Gathering your memories…</div>; }
export function Badge({ children }: { children: ReactNode }) { return <span className="badge">{children}</span>; }
export function Action({ children, onClick, className = 'button', disabled = false }: { children: ReactNode; onClick: () => Promise<unknown>; className?: string; disabled?: boolean }) { const [busy,setBusy]=useState(false); const [error,setError]=useState(''); return <><button className={className} disabled={disabled||busy} onClick={async()=>{setBusy(true);setError('');try{await onClick();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>{busy?'Please wait…':children}</button><Notice error>{error}</Notice></>; }
export function Pager({ page, total, limit, setPage }: { page:number; total:number; limit:number; setPage:(n:number)=>void }) { return <div className="pager"><button className="button secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} · {total} results</span><button className="button secondary" disabled={page*limit>=total} onClick={()=>setPage(page+1)}>Next</button></div>; }
