"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useFav } from "./FavContext";

export default function FavDrawer() {
  const { list, open, setOpen, remove, clear } = useFav();

  // 抽屜開著時鎖住背景捲動，並讓 Esc 關閉
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, setOpen]);

  return (
    <>
      <div
        className={`backdrop${open ? " show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer${open ? " open" : ""}`}
        aria-label="我的收藏"
        aria-hidden={!open}
      >
        <div className="cart-head">
          <h3 className="serif">我的收藏</h3>
          <span className="x" role="button" tabIndex={0} onClick={() => setOpen(false)}>
            ✕
          </span>
        </div>

        <div className="cart-items">
          {list.length === 0 ? (
            <div className="cart-empty">還沒有收藏，點卡片上的 ♡ 加入</div>
          ) : (
            list.map((f) => (
              <div className="fav-row" key={f.k}>
                <div
                  className="ic"
                  style={f.img ? { backgroundImage: `url("${f.img}")` } : undefined}
                />
                <div className="t">
                  <b>{f.name}</b>
                  <span>{f.sub}</span>
                </div>
                <Link className="add" href={f.go} onClick={() => setOpen(false)}>
                  前往
                </Link>
                <span className="x" role="button" tabIndex={0} onClick={() => remove(f.k)}>
                  ✕
                </span>
              </div>
            ))
          )}
        </div>

        <div className="cart-foot">
          <div
            className="tot"
            style={{ justifyContent: "center", fontSize: "var(--fs-sm)", color: "var(--muted)", marginBottom: 12 }}
          >
            收藏只存在這台裝置
          </div>
          <button className="cart-btn" type="button" onClick={clear} disabled={!list.length}>
            清空收藏
          </button>
        </div>
      </aside>
    </>
  );
}
