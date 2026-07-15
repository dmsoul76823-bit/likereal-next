"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase, getMember } from "@/lib/supabase";

const MemberContext = createContext(null);

export function MemberProvider({ children }) {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh(u) {
    if (!u) {
      setMember(null);
      return;
    }
    const m = await getMember(u.id);
    setMember(m);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      await refresh(u);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user || null;
      setUser(u);
      await refresh(u);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setMember(null);
  }

  return (
    <MemberContext.Provider
      value={{ user, member, loading, logout, refreshMember: () => refresh(user) }}
    >
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  return useContext(MemberContext);
}
