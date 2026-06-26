"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PageTransitionShellProps = {
  children: React.ReactNode;
};

export function PageTransitionShell({ children }: PageTransitionShellProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const [exitingStage, setExitingStage] = useState<React.ReactNode | null>(null);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      previousPathnameRef.current = pathname;
      setDisplayChildren(children);
      return;
    }

    setExitingStage(displayChildren);
    setDisplayChildren(children);
    previousPathnameRef.current = pathname;
    setIsTransitioning(true);

    const timer = window.setTimeout(() => {
      setIsTransitioning(false);
      setExitingStage(null);
    }, 760);

    return () => {
      window.clearTimeout(timer);
    };
  }, [children, displayChildren, pathname]);

  return (
    <div className={`route-shell ${isTransitioning ? "route-shell--transitioning" : ""}`}>
      <div aria-hidden="true" className="route-transition-veil" />
      {exitingStage ? (
        <div aria-hidden="true" className="route-stage route-stage--exit">
          {exitingStage}
        </div>
      ) : null}
      <div key={pathname} className="route-stage page-enter route-stage--enter">
        {displayChildren}
      </div>
    </div>
  );
}
