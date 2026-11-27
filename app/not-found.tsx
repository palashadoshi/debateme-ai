import Link from "next/link";

export default function NotFound() {
  return (
    <main className="home">
      <div className="home-center">
        <h1 className="home-title small">Page not found</h1>
        <Link href="/" className="play-btn">
          Go home
        </Link>
      </div>
    </main>
  );
}
