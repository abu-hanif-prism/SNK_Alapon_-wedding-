'use client';
import {useEffect,useState,useCallback} from 'react';
import {request,errorMessage} from '@/lib/api';
export function useData<T>(path:string|null,authenticated=true){const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);const reload=useCallback(()=>setVersion(v=>v+1),[]);useEffect(()=>{let live=true;if(!path)return;setLoading(true);setError('');request<T>(path,'GET',undefined,authenticated).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(errorMessage(e));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[path,authenticated,version]);return{data,error,loading,reload};}

