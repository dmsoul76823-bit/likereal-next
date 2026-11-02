import Link from "next/link";

export default function PlanCard({ plan, mode = "link" }) {
  return (
    <div className={`plan ${plan.feat ? "feat" : ""}`}>
      <h3 className="serif">{plan.n}</h3>
      <div className="amt">
        NT${plan.amt.toLocaleString()}
        <small>{plan.unit}</small>
      </div>
      <div className="bonus">{plan.bonus}</div>
      <ul>
        {plan.li.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>

      {mode === "link" ? (
        <Link
          href="/vip"
          className={`btn ${plan.feat ? "btn-brand" : "btn-ghost"}`}
          style={{ width: "100%", textAlign: "center" }}
        >
          查看方案
        </Link>
      ) : (
        <button
          className="btn btn-ghost"
          style={{ width: "100%", opacity: 0.6, cursor: "not-allowed" }}
          disabled
        >
          金流串接中
        </button>
      )}
    </div>
  );
}
