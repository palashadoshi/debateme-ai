// Shows a link to your Ko-fi / Buy Me a Coffee page. Set the address in the
// NEXT_PUBLIC_DONATE_URL environment variable. Until you do, it shows
// "coming soon" instead of a link.
export default function TokensPanel() {
  const url = process.env.NEXT_PUBLIC_DONATE_URL;
  const hasLink = typeof url === "string" && url.startsWith("https://");

  return (
    <aside className="tokens" aria-label="Support DebateMe AI">
      <p className="tokens-text">
        DebateMe AI is free, and every grade uses a little AI. Chip in to keep
        it running for everyone.
      </p>
      {hasLink ? (
        <a
          className="tokens-btn"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy me some AI tokens
        </a>
      ) : (
        <span className="tokens-btn tokens-soon" aria-disabled="true">
          Buy me some AI tokens (coming soon)
        </span>
      )}
    </aside>
  );
}
