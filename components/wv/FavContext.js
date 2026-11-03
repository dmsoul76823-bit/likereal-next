"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const KEY = "WONDERV_FAV";
const FavCtx = createContext(null);

/**
 * 收藏只存在這台裝置（localStorage），跟舊站一樣。
 * 舊站用陣列索引當 key（prog:3），資料一變順序就錯位；
 * 這裡改存整個物件 { k, name, sub, img, go }，k 用 slug/id，
 * 抽屜就不需要回頭去查全域陣列。
 */
export function FavProvider({ children }) {
  const [list, setList] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(raw)) setList(raw.filter((x) => x && x.k));
    } catch {
      /* 無痕模式或被封鎖，當作沒有收藏 */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* 存不進去就算了，不要擋住畫面 */
    }
  }, [list, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const has = useCallback((k) => list.some((x) => x.k === k), [list]);

  const toggle = useCallback((item, ev) => {
    if (ev) {
      ev.stopPropagation();
      ev.preventDefault();
    }
    setList((cur) => {
      const i = cur.findIndex((x) => x.k === item.k);
      if (i >= 0) {
        setToast("已移除收藏");
        return cur.filter((x) => x.k !== item.k);
      }
      setToast("已加入收藏 ♥");
      return [...cur, item];
    });
  }, []);

  const remove = useCallback((k) => {
    setList((cur) => cur.filter((x) => x.k !== k));
    setToast("已移除收藏");
  }, []);

  const clear = useCallback(() => {
    setList([]);
    setToast("已清空收藏");
  }, []);

  return (
    <FavCtx.Provider
      value={{ list, ready, has, toggle, remove, clear, open, setOpen, count: list.length }}
    >
      {children}
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">
        {toast}
      </div>
    </FavCtx.Provider>
  );
}

export function useFav() {
  return (
    useContext(FavCtx) || {
      list: [],
      ready: false,
      has: () => false,
      toggle: () => {},
      remove: () => {},
      clear: () => {},
      open: false,
      setOpen: () => {},
      count: 0,
    }
  );
}
