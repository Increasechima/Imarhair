"use client";

import type { ReactNode } from "react";
import { Accordion } from "radix-ui";
import { Plus } from "lucide-react";

// Style.md §6 Accordions: hairline dividers, one open at a time on the PDP.
export function ProductAccordion({ items }: { items: { id: string; title: string; content: ReactNode }[] }) {
  return (
    <Accordion.Root type="single" collapsible defaultValue={items[0]?.id} className="border-t border-line">
      {items.map((item) => (
        <Accordion.Item key={item.id} value={item.id} className="border-b border-line">
          <Accordion.Header>
            <Accordion.Trigger className="group text-label flex min-h-14 w-full items-center justify-between text-left">
              {item.title}
              <Plus
                className="size-4 transition-transform duration-(--duration-base) group-data-[state=open]:rotate-45"
                strokeWidth={1.5}
                aria-hidden
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="text-body pb-6 text-taupe">{item.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
