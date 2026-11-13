import { notFound } from "next/navigation";
import { getRunView } from "@/lib/runs";
import { ReportView } from "@/components/ReportView";

export const dynamic = "force-dynamic";

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="wrap section">
      <h1>{title}</h1>
      <p style={{ margin: "14px 0 22px" }}>{body}</p>
      <a className="btn" href="/#run">Start a new run</a>
    </div>
  );
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getRunView(id);
  if (found.kind === "missing") notFound();
  if (found.kind === "pending") return <Message title="This run is still working" body="Wait a minute and reload this page." />;
  if (found.kind === "failed") return <Message title="This run did not finish" body={found.message} />;
  return <ReportView run={found.run} />;
}
