const ITEMS = [
  {
    title: "Script stages",
    text: "Lay out your call in stages. The co-pilot tracks which one you're in as the conversation moves.",
  },
  {
    title: "Objection library",
    text: "Write down how you answer price, timing and competitor objections. Suggestions start from your answers.",
  },
  {
    title: "Product knowledge",
    text: "Import your documents so suggestions use your real pricing, features and limits.",
  },
  {
    title: "Tone and methodology",
    text: "Choose how it sounds and which sales method it follows.",
  },
  {
    title: "How often it speaks",
    text: "Set how frequently suggestions appear, so it helps without crowding you.",
  },
  {
    title: "Up to five languages",
    text: "Each co-pilot can handle several conversation languages and detects which one is being spoken.",
  },
];

export function PlaybookSection() {
  return (
    <section id="playbook" className="lz-section lz-tint" aria-labelledby="playbook-title">
      <div className="lz-wrap">
        <h2 id="playbook-title" className="lz-h2">
          Teach it how your team sells
        </h2>
        <p className="lz-copy" style={{ marginTop: "1.5rem" }}>
          A co-pilot is only as good as its playbook. Set yours up once, then use it on every call.
        </p>
        <div className="lz-grid lz-grid--three">
          {ITEMS.map((item) => (
            <div key={item.title}>
              <h3 className="lz-h3">{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
