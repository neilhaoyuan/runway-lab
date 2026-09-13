import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  void compact;
  return (
    <Link href="/" className="group grid h-8 w-8 place-items-center" aria-label="Home">
      <span className="relative block h-7 w-7" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-[2px] w-7 -translate-y-1/2 -rotate-45 bg-acid transition-transform group-hover:-rotate-[40deg]" />
      </span>
    </Link>
  );
}
