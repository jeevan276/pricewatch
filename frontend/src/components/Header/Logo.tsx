import { Link } from "react-router-dom";

interface LogoProps {
  onClick?: () => void;
}

export default function Logo({ onClick }: LogoProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2"
      aria-label="PriceWatch home"
    >
      {/* Logo Icon */}
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-sm">
        <img
          src="/pwlogo.PNG"
          alt="PriceWatch Logo"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Brand */}
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-heading">
          Price
          <span className="text-primary">Watch</ span>
        </span>

        <span className="hidden text-[10px] font-medium uppercase tracking-widest text-body sm:block">
          Track • Compare • Save
        </span>
      </div>
    </Link>
  );
}