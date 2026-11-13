import { examples } from "@/data/examples";
import { site } from "@/lib/site";
import { locateQuote } from "@/lib/highlight";
import { HeroDemo } from "@/components/HeroDemo";
import { RunForm } from "@/components/RunForm";

export const dynamic = "force-static";

export default function Home() {
  const first = examples[0];
  const heroReqs = first
    ? first.result.extraction.report.requirements
        .filter((r) => r.priority === "must" && r.evidence[0] && locateQuote(first.transcript, r.evidence[0].quote))
        .slice(0, 4)
        .map((r) => ({ id: r.id, statement: r.statement, quote: r.evidence[0].quote }))
    : [];

  return (
    <div className="wrap">
      <section className="hero">
        <div>
          <h1>{site.tagline}</h1>
          <p className="lead">
            Paste a customer call. You get the requirements with the customer's own words highlighted as proof,
            a proposed architecture, an effort and savings estimate as ranges, and a clickable demo.
          </p>
          <p style={{ marginTop: 22 }}><a className="btn" href="#run">Try it on a call</a></p>
        </div>
        {first && heroReqs.length > 0 ? (
          <HeroDemo transcript={first.transcript} requirements={heroReqs} />
        ) : null}
      </section>

      <section className="section" id="examples">
        <h2>Example runs</h2>
        <p className="muted">Real output, already generated. Open one to see the full report.</p>
        <ul className="examples">
          {examples.map((e) => (
            <li key={e.id}>
              <a href={`/runs/${e.id}`}>
                <h3>{e.title}</h3>
                <span className="muted small">{e.result.extraction.report.requirements.length} requirements, {e.result.design.data.components.length} components</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" id="run">
        <h2 style={{ marginBottom: 14 }}>Run it on a call</h2>
        <RunForm examples={examples.map((e) => ({ id: e.id, title: e.title, transcript: e.transcript }))} />
      </section>
    </div>
  );
}
