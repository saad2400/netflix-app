import SessionRoom from "@/components/SessionRoom";

export default function SessionPage({
  params,
}: {
  params: { code: string };
}) {
  const code = params.code.toUpperCase();
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <SessionRoom code={code} />
    </main>
  );
}
