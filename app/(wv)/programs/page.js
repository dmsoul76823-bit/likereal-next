import { getPrograms } from "@/lib/wv";
import ProgramCard from "@/components/wv/ProgramCard";

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: "/programs" },
  title: "沉浸節目總覽",
  description:
    "Wonder V 沉浸式場域所有演出節目：360° 全息舞台、裸視 3D 體驗與場域限定演出，查看完整節目與場次。",
  openGraph: {
    title: "沉浸節目總覽｜Wonder V",
    description: "Wonder V 沉浸式場域所有演出節目與場次。",
    type: "website",
  },
};

export default async function ProgramsPage() {
  const programs = await getPrograms();
  const withSessions = programs.filter((p) => p.sessionCount > 0);
  const comingSoon = programs.filter((p) => p.sessionCount === 0);

  return (
    <div className="wrap" style={{ padding: "40px 0 0" }}>
      <div className="sec-head">
        <div>
          <span className="tag">ALL PROGRAMS</span>
          <h2>沉浸節目總覽</h2>
        </div>
        <span style={{ color: "var(--muted)", fontSize: "var(--fs-sm)" }}>
          共 {programs.length} 個節目
        </span>
      </div>

      <div className="hg hg-3">
        {withSessions.map((p) => (
          <ProgramCard key={p.name} program={p} />
        ))}
      </div>

      {comingSoon.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 56 }}>
            <div>
              <span className="tag">COMING SOON</span>
              <h2>籌備中</h2>
            </div>
          </div>
          <div className="hg hg-3">
            {comingSoon.map((p) => (
              <ProgramCard key={p.name} program={p} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
