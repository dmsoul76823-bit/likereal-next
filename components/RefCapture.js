"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase, getAffiliateCoupon } from "@/lib/supabase";

const KEY = "lr_ref";
const COUPON_KEY = "lr_ref_coupon";

// 儲存推薦碼（含到期時間）
function saveRef(code, days) {
  try {
    const payload = {
      code,
      exp: Date.now() + days * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    // 隱私模式可能不允許，忽略
  }
}

// 讀取尚未過期的推薦碼
export function getRef() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.exp || Date.now() > p.exp) {
      localStorage.removeItem(KEY);
      return null;
    }
    return p.code || null;
  } catch (e) {
    return null;
  }
}

// 夥伴綁定的折扣碼（購票時自動帶入）
export function getRefCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.exp || Date.now() > p.exp) {
      localStorage.removeItem(COUPON_KEY);
      return null;
    }
    return p.code || null;
  } catch (e) {
    return null;
  }
}

export function clearRef() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(COUPON_KEY);
  } catch (e) {}
}

// 掛在 layout，自動偵測網址上的 ?ref=
export default function RefCapture() {
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get("ref");
    if (!code) return;

    (async () => {
      // 確認代碼有效，並取得該夥伴的追蹤天數
      const { data } = await supabase
        .from("affiliates")
        .select("code, cookie_days")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (!data) return;

      saveRef(data.code, data.cookie_days || 30);

      // 若該夥伴有綁定折扣碼，一併記下（購票時自動帶入）
      try {
        const cp = await getAffiliateCoupon(data.code);
        if (cp?.ok && cp.code) {
          localStorage.setItem(
            COUPON_KEY,
            JSON.stringify({
              code: cp.code,
              exp: Date.now() + (data.cookie_days || 30) * 86400000,
            })
          );
        }
      } catch (e) {}

      // 記錄點擊
      try {
        await supabase.rpc("record_affiliate_click", {
          p_code: data.code,
          p_event_id: null,
        });
      } catch (e) {}
    })();
  }, [params]);

  return null;
}
