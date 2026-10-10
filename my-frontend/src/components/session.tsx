'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { request, setToken, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';
import { Brand, Loading, Notice } from './ui';
const Context=createContext<{user:User|null; loading:boolean; login:(user:User,token:string)=>void; logout:()=>Promise<void>}>({user:null,loading:true,login:()=>{},logout:async()=>{}});
export function SessionProvider({children}:{children:ReactNode}) { const [user,setUser]=useState<User|null>(null);const [loading,setLoading]=useState(true);useEffect(()=>{let live=true;request<{user:User;accessToken:string}>('/auth/refresh','POST',undefined,false).then(d=>{if(live){setToken(d.accessToken);setUser(d.user);}}).catch(()=>{}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);return <Context value={{user,loading,login:(u,t)=>{setToken(t);setUser(u);},logout:async()=>{await request('/auth/logout','POST');setToken(null);setUser(null);}}}>{children}</Context>; }
export const useSession=()=>useContext(Context);
export function Guard({children,admin=false}:{children:ReactNode;admin?:boolean}) {const {user,loading}=useSession();if(loading)return <Loading/>;if(!user)return <main className="auth-required"><Brand/><h1>Your memories, safely kept.</h1><p>Sign in to access your workspace.</p><Link className="button" href="/login">Sign in</Link></main>;if((admin&&user.role!=='ADMIN')||(!admin&&user.role!=='HOST'))return <main className="auth-required"><h1>This workspace is for {admin?'administrators':'hosts'}.</h1><Link className="button" href={user.role==='ADMIN'?'/admin':'/dashboard'}>Open my workspace</Link></main>;return children;}
export function Logout() {const {logout}=useSession();const [error,setError]=useState('');return <><button className="text-button" onClick={()=>logout().catch(e=>setError(errorMessage(e)))}>Sign out</button><Notice error>{error}</Notice></>;}
