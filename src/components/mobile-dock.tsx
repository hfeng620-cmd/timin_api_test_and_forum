"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NotificationBell } from "@/components/notification-bell";

const navItems = [
  { label: "首页", href: "/" },
  { label: "榜单", href: "/stations" },
  { label: "讨论", href: "/community" },
  { label: "模型", href: "/models" },
  { label: "指南", href: "/guides" },
];

export function MobileDock() {
  const pathname = usePathname();

  return (
    <>
      <nav
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-1 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur lg:hidden"
        data-selection-comments="off"
      >
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              className={`rounded-[16px] px-2 py-3.5 text-center text-xs font-bold transition ${
                active
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* Notification bell above the mobile dock, only on mobile */}
      <div
        className="fixed bottom-[84px] right-3 z-40 lg:hidden"
        data-selection-comments="off"
      >
        <NotificationBell dropdownAbove />
      </div>
    </>
  );
}
