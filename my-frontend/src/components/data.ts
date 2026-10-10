"use client";
import { useEffect, useState, useCallback } from "react";
import { request, errorMessage } from "@/lib/api";
export function useData<T>(path: string | null, authenticated = true) {
  const [version, setVersion] = useState(0);
  const key = String(path) + ":" + version + ":" + authenticated;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let live = true;
    if (!path) return;
    request<T>(path, "GET", undefined, authenticated)
      .then((data) => {
        if (live) setState({ key, data, error: "" });
      })
      .catch((e) => {
        if (live) setState({ key, data: null, error: errorMessage(e) });
      });
    return () => {
      live = false;
    };
  }, [path, authenticated, key]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    loading: !!path && state.key !== key,
    reload,
  };
}
