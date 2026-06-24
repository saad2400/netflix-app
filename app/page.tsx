import HomeClient from "@/components/HomeClient";
import { REGIONS } from "@/lib/tmdb";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-netflix-red">
          For two
        </p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          What Should We Watch?
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-300">
          Two people, two sets of tastes, one perfect Netflix movie. Start a
          session, share the code, and we&apos;ll pick what you should watch
          together.
        </p>
      </div>

      <HomeClient regions={REGIONS} />

      <p className="mt-10 text-center text-xs text-neutral-500">
        Titles &amp; availability via TMDB (Netflix catalogue). Not affiliated
        with Netflix.
      </p>
    </main>
  );
}
