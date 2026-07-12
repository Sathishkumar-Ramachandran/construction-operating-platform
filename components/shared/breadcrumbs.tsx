import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Breadcrumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-foreground" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="size-3.5" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
