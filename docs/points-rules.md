# Wonder V 點數發放規則

> 2026-11-03 由 Aden 口頭確認。寫下來是因為這兩條規則決定 `release_at` 怎麼算，
> 而 `apply_order_points` 目前的算式還沒照這個做。

## 規則

| 訂單類型 | 點數解鎖時機 | 理由 |
|---|---|---|
| 票券 | **演出結束後** | 演出前會員都還可能退票。不要求入場（寬鬆版，2026-11-03 拍板）|
| 電商商品 | **購買後 10 天** | 涵蓋審閱期 + 運送期 |

點數一律先進 `members.pending_points`，時間到才由 `release_due_points()`
轉進 `members.points`。**不可以在結帳當下直接給可用點數。**

## 系統裡已經寫著的規則（/account 頁面文案，2026-11-03 發現）

原本頁面文案寫的是「活動結束 3 天後，且票券已核銷入場」。
2026-11-03 Aden 裁示採**寬鬆版**：

> **只看演出是否結束，不要求實際入場。** 沒到場的人一樣拿得到點數。

頁面文案已同步改掉（原文案等於對客人承諾了不同的規則）。
`release_due_points()` 實作時不可加入 `orders.used` 的條件。

等級規則（member_tiers 實際值）：
| 等級 | 累積門檻 | 每幾元 1 點 |
|---|---|---|
| 一般會員 | $0 | 50 |
| 銀卡會員 | $10,000 | 40 |
| 金卡會員 | $30,000 | 25 |

點數折抵上限為訂單金額的 30%，1 點 = 1 元。

## 現有機制（線上實況，2026-11-03 查證）

已經存在、可直接沿用：

- `members.pending_points` — 未解鎖點數
- `members.points` — 可用點數
- `point_logs.release_at` — 何時解鎖
- `point_logs.released` — 是否已解鎖
- `release_due_points()` — 寫 points / pending_points / released / total_spent
- `apply_order_points(p_order_id text, p_member_id uuid, p_points_used int…)`
  — 寫 points / pending_points，會用到 member_tiers.earn_per

## 待辦（這些還沒做）

1. **`orders` 無法判斷訂單類型，也查不到演出日期。**
   欄位只有 `id, name, email, phone, item, amt, pay, status, order_date,
   invoice, used, created_at` — 沒有 `event_id`，沒有類型欄位。
   要套上面兩條規則，得先補這個關聯。

2. **`apply_order_points` 的 `release_at` 算式要改**，依訂單類型分流。

3. **Wonder V 的購票流程根本沒呼叫 `apply_order_points`。**
   `buy_seats` / `change_seat` / `check_in` 完全沒碰 `members`，
   所以現在買票不會產生任何點數。這塊要重做。

4. **`release_due_points()` 需要排程**。確認有沒有 cron 在跑它，
   沒有的話要設（pg_cron 或 Vercel Cron）。

5. 退票時點數要回收 — `refund_requests` 已有 `member_id uuid`，
   但退票流程跟點數之間還沒接起來。
