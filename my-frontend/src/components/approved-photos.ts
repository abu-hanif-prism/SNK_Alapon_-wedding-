"use client";
import { useEffect, useState } from "react";
import { request, errorMessage } from "@/lib/api";
import type { Photo, PageData } from "@/lib/types";
// Editors need the whole approved library, including photographs beyond the first API page.
export function useApprovedPhotos(eventId: string) {
  const [data, setData] = useState<{ items: Photo[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const items: Photo[] = [];
      for (let page = 1; active; page++) {
        const result = await request<PageData<Photo>>(
          "/events/" +
            eventId +
            "/photos?approval=APPROVED&limit=200&page=" +
            page,
        );
        items.push(...result.items);
        if (items.length >= result.total || result.items.length === 0) break;
      }
      if (active) setData({ items });
    }
    load().catch((e) => {
      if (active) setError(errorMessage(e));
    });
    return () => {
      active = false;
    };
  }, [eventId]);
  return { data, error };
}
