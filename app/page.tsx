import HomeActions from "@/components/HomeActions";
import TokensPanel from "@/components/TokensPanel";

export default function Home() {
  return (
    <main className="home">
      <div className="home-center">
        <h1 className="home-title">DebateMe AI</h1>
        <HomeActions />
      </div>
      <TokensPanel />
    </main>
  );
}
