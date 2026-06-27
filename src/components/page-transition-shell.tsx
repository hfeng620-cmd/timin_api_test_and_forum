"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type PageTransitionShellProps = {
  children: React.ReactNode;
};

export function PageTransitionShell({ children }: PageTransitionShellProps) {
  const pathname = usePathname();
  const previousPathnameRef = useRef(pathname);
  const currentChildrenRef = useRef(children);
  const [exitingStage, setExitingStage] = useState<React.ReactNode | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) {
      previousPathnameRef.current = pathname;
      currentChildrenRef.current = children;
      return;
    }

    setExitingStage(currentChildrenRef.current);
    currentChildrenRef.current = children;
    previousPathnameRef.current = pathname;
    setIsTransitioning(true);

    const timer = window.setTimeout(() => {
      setIsTransitioning(false);
      setExitingStage(null);
    }, 760);

    return () => {
      window.clearTimeout(timer);
    };
  }, [children, pathname]);

  return (
    <div className={`route-shell ${isTransitioning ? "route-shell--transitioning" : ""}`}>
      <div aria-hidden="true" className="route-transition-veil" />
      {exitingStage ? (
        <div aria-hidden="true" className="route-stage route-stage--exit">
          {exitingStage}
        </div>
      ) : null}
      <div key={pathname} className="route-stage route-stage--enter">
        {children}
      </div>
    </div>
  );
}
