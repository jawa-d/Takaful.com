"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { hasFirebaseConfig } from "@/lib/firebase";
import { subscribeRequestsFromFirestore } from "@/lib/firebase-requests";

export const useHydrate = () => {
  const hydrateMock = useAppStore((s) => s.hydrateMock);
  const setRequests = useAppStore((s) => s.setRequests);
  useEffect(() => {
    if (hasFirebaseConfig()) {
      const unsub = subscribeRequestsFromFirestore((requests) => {
        // Firebase is the source of truth when configured.
        setRequests(requests);
      });
      return () => unsub();
    }

    // Fallback only when Firebase env is not configured.
    hydrateMock();
  }, [hydrateMock, setRequests]);
};

