// Renders plain text written in the admin: blank lines separate paragraphs,
// lines starting with "## " are headings and lines starting with "- " are
// list items. The text is always shown as text, never as HTML.
export default function RichText({ text, className = 'rich-text' }) {
  const blocks = String(text || '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
        const lines = block.split('\n');
        if (lines.every((line) => line.startsWith('- '))) {
          return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
        }
        return <p key={index}>{lines.map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</p>;
      })}
    </div>
  );
}
