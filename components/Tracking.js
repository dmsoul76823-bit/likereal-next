"use client";
import { useEffect } from "react";
import Script from "next/script";

// ══════════ 事件發送工具 ══════════
// 在任何 client component 呼叫，例如：
//   track("ViewContent", { content_name: "介質之間", value: 680, currency: "TWD" })
export function track(event, params = {}) {
  if (typeof window === "undefined") return;

  // Meta Pixel
  if (window.fbq) {
    const STANDARD = [
      "PageView",
      "ViewContent",
      "AddToCart",
      "InitiateCheckout",
      "Purchase",
      "CompleteRegistration",
      "Lead",
    ];
    if (STANDARD.includes(event)) {
      window.fbq("track", event, params);
    } else {
      window.fbq("trackCustom", event, params);
    }
  }

  // LINE Tag
  if (window._lt) {
    const LINE_MAP = {
      ViewContent: "ViewContent",
      InitiateCheckout: "AddToCart",
      Purchase: "Conversion",
      CompleteRegistration: "Conversion",
    };
    const lineEvent = LINE_MAP[event];
    if (lineEvent && window.__lineTagId) {
      window._lt(
        "send",
        "cv",
        { type: lineEvent },
        [window.__lineTagId]
      );
    }
  }
}

// ══════════ 追蹤腳本注入 ══════════
export default function Tracking({ metaPixelId, lineTagId }) {
  useEffect(() => {
    if (lineTagId) window.__lineTagId = lineTagId;
  }, [lineTagId]);

  return (
    <>
      {metaPixelId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      )}

      {lineTagId && (
        <Script id="line-tag" strategy="afterInteractive">
          {`
            (function(g,d,o){
              g._ltq=g._ltq||[];g._lt=g._lt||function(){g._ltq.push(arguments)};
              var h=location.protocol==='https:'?'https://d.line-scdn.net':'http://d.line-cdn.net';
              var s=d.createElement('script');s.async=1;
              s.src=o||h+'/n/line_tag/public/release/v1/lt.js';
              var t=d.getElementsByTagName('script')[0];t.parentNode.insertBefore(s,t);
            })(window, document);
            _lt('init', { customerType: 'lap', tagId: '${lineTagId}' });
            _lt('send', 'pv', ['${lineTagId}']);
          `}
        </Script>
      )}
    </>
  );
}
