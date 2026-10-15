import { splitAccent } from "@/lib/accent";

/** A name with its last word in amethyst, as the reference screens set "The Time Room". */
export function AccentName({ name }: { name: string }) {
  const { lead, accent } = splitAccent(name);
  if (!accent) return <>{lead}</>;
  return (
    <>
      {lead} <span className="accent-word">{accent}</span>
    </>
  );
}
