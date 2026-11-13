export default function NotFound() {
  return (
    <div className="wrap section">
      <h1>That page does not exist</h1>
      <p style={{ margin: "14px 0 22px" }}>The link may be wrong, or the run may have been removed.</p>
      <a className="btn" href="/">Go to the home page</a>
    </div>
  );
}
