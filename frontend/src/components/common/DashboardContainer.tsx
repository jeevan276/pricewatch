import type { ReactNode } from "react";

interface DashboardContainerProps {
  children: ReactNode;
  className?: string;
}

export default function DashboardContainer({
  children,
  className = "",
}: DashboardContainerProps) {
  return (
    <div
      className={[
        "w-full",
        "px-4 py-6",
        "sm:px-6 sm:py-8",
        "lg:px-8 lg:py-10",
        className,
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-7xl">
        {children}
      </div>
    </div>
  );
}