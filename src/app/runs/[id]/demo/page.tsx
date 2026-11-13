import { notFound } from "next/navigation";
import { getRunView } from "@/lib/runs";
import { DemoRenderer } from "@/components/DemoRenderer";

export const dynamic = "force-dynamic";

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getRunView(id);
  if (found.kind !== "ready") notFound();
  const { run } = found;
  return (
    <div className="wrap section">
      <p><a href={`/runs/${run.id}`}>Back to the report</a></p>
      <h1 style={{ margin: "10px 0 8px" }}>Demo prototype</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        A clickable mock-up generated from the requirements. It shows the idea to the customer. It is not working software.
      </p>
      <DemoRenderer spec={run.result.demo.data} />
    </div>
  );
}
