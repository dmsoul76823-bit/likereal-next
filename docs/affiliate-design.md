# Wonder V 分潤系統設計

> 2026-11-03。給 Aden 審閱用。**看過點頭之後才動資料庫。**

---

## 一、現況：零件齊全，但鏈條斷了

分潤需要的資料表**全部存在**，而且 schema 設計得相當完整：

| 資料表 | 筆數 | 用途 |
|---|---|---|
| `affiliates` | 0 | 夥伴（`code`、`dashboard_token`、`cookie_days`、`is_active`）|
| `affiliate_rules` | 0 | 分潤規則（`event_id`、`commission_type`、`commission_value`）|
| `affiliate_clicks` | 0 | 點擊紀錄 |
| `coupons` | 0 | 折扣碼（可綁 `affiliate_id`）|
| `coupon_redemptions` | 0 | 折扣碼使用紀錄 |

前端 `components/RefCapture.js` 也已經掛在根 layout 上，而且做得很完整：
驗證 `?ref=` 代碼 → 依 `cookie_days` 存進 localStorage → 一併記下夥伴綁定的
折扣碼 → 呼叫 `record_affiliate_click` 記錄點擊。

**問題只有一個，但是致命的：它存的推薦碼沒有任何人讀。**

原本消費 `getRef()` 的是 `app/events/[slug]/buy/BuyClient.js` —— 那是另一個
專案的購票頁，依賴不存在的 `tickets` 資料表，今天已經刪除。
Wonder V 真正的購票流程走 `buy_seats(p_event_id bigint, p_seats jsonb,
p_name, p_phone, p_email, p_invoice)`，**參數裡沒有推薦碼**。

所以：有人點了推廣連結 → 推薦碼存進瀏覽器 → 他買了票 → **訂單上沒有
任何痕跡記錄這筆生意是誰帶來的**。`orders` 的 12 個欄位裡沒有一個跟
推薦來源有關。

### 另外三個對不上的地方

1. **`affiliate_rules.event_id` 和 `coupons.event_id` 是 uuid，
   但線上 `events.id` 是 bigint。** 跟那些吃 uuid 的函式
   （`calc_commission`、`validate_coupon`）是同一個世代的產物，
   指向一個不存在的 events 資料表。

2. **後台完全沒有分潤管理介面。** 11 個分頁裡沒有這一項，
   所以連建立一個夥伴都做不到。

3. **`record_affiliate_click` 這支 RPC 我還沒確認存不存在**
   （先前盤點 21 支 RPC 時沒有把它列進去）。實作前會先查。

---

## 一之二、2026-11-04 Aden 的決定

**A3**（券碼優先、點擊補位）、**B3**（全站預設 + 個別加碼）、**C2**（分潤帳本），
並追加一項：**電商分潤以「產品 + 夥伴」計算**。

因為要同時支援節目與產品，規則的目標不能只用 `program_name`，改成兩欄：

```
target_type  'all' | 'program' | 'product'
target_key   null  | program_art.name | products.id
```

套用順序：**愈specific愈優先** —— 有該產品／節目的規則就用它，否則用 `all` 的預設值。
`coupons` 與 `affiliate_clicks` 的 `event_id` 一併改成同樣兩欄，
三張表的目標描述方式一致，後台與儀表板才好統一處理。

### 歸因路徑（查證後確認可行）

`passes.event_id` 是 **bigint**（對得上 `events.id`），而且有 `event_name` 欄位。
所以票券訂單的節目歸因走：

```
orders.id → passes.order_id → passes.event_name → program_art.name
```

**不需要在 orders 增加 event 欄位。**

### ⚠️ 電商分潤的前置相依

`/shop/[id]` 目前寫著「線上購物車與金流串接中，可於場域服務台現場購買」——
**商品無法線上購買，沒有購物車、沒有結帳、沒有商品訂單。**

所以「產品 + 夥伴」的規則可以現在就建好，但：

> **在電商結帳做出來之前，產品分潤永遠是 0。**
> 而電商結帳要等綠界金流。

這條鏈是：綠界金流 → 電商結帳 → 商品訂單 → 產品分潤。
schema 現在就一次做到位，之後電商上線不必再改。

---

## 二、原始的三個選項（已決定，保留供日後回顧）

### 決策 A：怎麼認定「這筆訂單是誰帶來的」

| 方案 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| **A1 券碼歸因** | 客人必須使用夥伴的折扣碼才算 | 證據明確、不會爭議、換裝置也有效 | 只算得到願意用碼的人，漏掉很多 |
| **A2 點擊歸因** | 存在瀏覽器的推薦碼，結帳時帶上 | 涵蓋面廣，客人不必做任何事 | 換裝置／清快取就失效；無痕模式完全無效 |
| **A3 兩者並用**（建議） | 有券碼用券碼，沒有就用存著的推薦碼 | 兼顧兩者 | 要定義優先順序 |

**我建議 A3**，規則是「券碼優先」—— 因為券碼是客人主動輸入的明確意圖，
而瀏覽器裡存的推薦碼可能是很久以前點到的。

> 這個選擇會直接影響夥伴的收入，建議先想清楚你要怎麼跟夥伴解釋。
> A2 和 A3 都有「客人換手機就算不到」的本質限制，這點最好寫進合作條款。

### 決策 B：分潤規則綁在什麼層級

| 方案 | 做法 | 適合 |
|---|---|---|
| **B1 全站單一費率** | 每個夥伴一個百分比，所有節目通用 | 最單純，適合剛起步 |
| **B2 只能綁節目** | 每個節目各自設費率 | 不同節目利潤差很大時 |
| **B3 全站預設 + 單節目加碼**（建議） | 夥伴有預設費率，特定節目可另外設 | 兩者兼顧 |

**我建議 B3。** `affiliate_rules.event_id` 改成可以為 null：
null 代表「這個夥伴的全站預設費率」，有值代表「這個節目的特別費率」。

### 決策 C：分潤金額存哪裡

| 方案 | 做法 | 優點 | 缺點 |
|---|---|---|---|
| **C1 存在 orders 上** | `orders` 加 `ref_code`、`affiliate_id`、`commission` 欄位 | 簡單，查詢快 | 退票、調整、結算狀態不好追 |
| **C2 另開分潤帳本**（建議） | `orders` 只存歸因，另開 `affiliate_commissions` 記每一筆分潤與狀態 | 退票能沖銷、結算有紀錄、查得到歷史 | 多一張表 |

**我建議 C2。** 理由跟點數那套一樣 —— 你已經說過票券可能退，
分潤也會跟著退。帳本型設計才查得出「這筆錢為什麼變了」。
後台會員分頁那個「直接改錢包不留紀錄」的問題，就是反面教材。

---

## 三、如果照建議（A3 + B3 + C2）要改什麼

### 3.1 資料庫

**改既有的**（全部 0 筆資料，不用搬遷）：

```
affiliate_rules.event_id (uuid)  →  program_name (text, 可為 null)
    null       = 此夥伴的全站預設費率
    有值       = 該節目的特別費率，對應 program_art.name

coupons.event_id (uuid)          →  program_name (text, 可為 null)
```

**orders 加兩個歸因欄位**：

```
ref_code      text        推薦碼（來自券碼或 localStorage）
attributed_by text        'coupon' 或 'click'，記錄是怎麼算到的
```

**新增分潤帳本**：

```
affiliate_commissions
  id            uuid
  affiliate_id  uuid    → affiliates
  order_id      text    → orders
  base_amount   integer 計算基準（訂單金額）
  amount        numeric 分潤金額
  status        text    pending / approved / paid / reversed
  note          text
  created_at    timestamptz
  settled_at    timestamptz
```

### 3.2 資料庫函式

| 函式 | 要做的事 | 風險 |
|---|---|---|
| `buy_seats` | **加一個 `p_ref text` 參數**，寫入 `orders.ref_code`，並產生 `affiliate_commissions` 一筆 | ⚠️ **高** — 這是線上實際在用的結帳函式 |
| `calc_commission` | 參數從 `p_event_id uuid` 改成 `p_program_name text` | 低（目前沒人呼叫）|
| `validate_coupon` | 同上 | 低 |
| `get_affiliate_dashboard` | 改讀 `affiliate_commissions` 與 `affiliate_clicks` | 低 |
| `record_affiliate_click` | 先確認存不存在 | — |

> **`buy_seats` 是整個計畫裡唯一的高風險項目。** 它是線上實際在跑的
> 結帳函式，改壞了就是不能賣票。做法上會用「新增一個有預設值的參數」
> 而不是改簽章，讓舊的呼叫方式仍然有效；並且先在一筆測試訂單上驗證過，
> 才讓前端開始傳 `p_ref`。

### 3.3 後台：新增「分潤管理」分頁

- **夥伴清單** —— 建立／停用、產生 `code` 與 `dashboard_token`、設定 `cookie_days`
- **分潤規則** —— 每個夥伴的全站預設費率，加上個別節目的特別費率
- **成效** —— 點擊、成交、銷售額、分潤金額
- **結算** —— 把 `pending` 標成 `approved` / `paid`，退票時 `reversed`

同時要在 `lib/admin.js` 的 `ALL_PERMS` 加上 `affiliate` 權限
（現在是 11 項），`NAV` 加一個分頁。

### 3.4 前台

- 購票流程把 `getRef()` 的值傳進 `buy_seats`
- `/partner` 儀表板的節目連結（路徑已改成 `/programs/`，等 RPC 回傳節目名稱就會正常）

---

## 四、建議的實作順序

| 階段 | 內容 | 可驗證的成果 |
|---|---|---|
| 1 | 資料庫 schema（改 2 張表、加 1 張表） | 後台能建夥伴、設規則 |
| 2 | 後台分潤分頁 | 你可以自己建一個測試夥伴 |
| 3 | `buy_seats` 加 `p_ref`＋前端傳值 | 用測試訂單驗證歸因成立 |
| 4 | `get_affiliate_dashboard` 改寫 | `/partner` 顯示真實數字 |
| 5 | 結算流程與退票沖銷 | 完整可營運 |

階段 1、2 做完就能看到東西，階段 3 是風險點，建議單獨驗證。

---

## 五、要提醒的事

**這不是「修 bug」，是建一個功能。** 以工作量來說，大致等同於
今天整天做的事情的總和。而上線前真正擋路的是另外三項：
**綠界金流、票券寄信、條款／隱私權頁**。

分潤目前 0 筆資料、0 個夥伴，不擋上線。如果你的優先順序是「先能賣票收錢」，
這份設計可以先放著，等金流做完再回來。要繼續做也沒問題 —— 現在 0 筆資料
確實是改 schema 最便宜的時機。

**實作前還要確認的小事：**
1. `record_affiliate_click` RPC 是否存在、簽章為何
2. `affiliate_clicks`（4 欄）、`coupon_redemptions`（7 欄）的實際欄位
3. `passes`（18 欄）怎麼接訂單與節目 —— 可能可以用來做節目層級的歸因
