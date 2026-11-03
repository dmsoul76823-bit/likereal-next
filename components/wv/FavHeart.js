"use client";
import { useFav } from "./FavContext";

/**
 * 卡片右上角的愛心。放在 <Link> 裡面，所以一定要吃掉點擊事件，
 * 不然按收藏會連帶跳頁。
 */
export default function FavHeart({ k, name, sub, img, go, className = "" }) {
  const { has, toggle, ready } = useFav();
  const on = ready && has(k);

  return (
    <button
      type="button"
      className={`fav${on ? " on" : ""}${className ? " " + className : ""}`}
      title={on ? "移除收藏" : "收藏"}
      aria-label={on ? "移除收藏" : "收藏"}
      aria-pressed={on}
      onClick={(ev) => toggle({ k, name, sub: sub || "", img: img || "", go: go || "/" }, ev)}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
