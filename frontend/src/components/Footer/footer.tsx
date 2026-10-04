import {  Mail } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    name: "Privacy Policy",
    path: "/privacy",
  },
  {
    name: "Terms of Service",
    path: "/terms",
  },
  {
    name: "API Documentation",
    path: "/api-docs",
    external: true,
  },
  {
    name: "Contact Support",
    path: "/contact",
  },
];

export default function Footer() {
  return (
   <footer className="w-full border-t border-border bg-secondary py-8 transition-colors">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
    {/* Logo & Copyright */}
    <div className="text-center md:text-left">
      <h2 className="text-2xl font-bold text-primary">
        PriceWatch
      </h2>

      <p className="mt-1 text-sm text-body">
        © {new Date().getFullYear()} PriceWatch. All rights reserved.
      </p>
    </div>

    {/* Footer Navigation */}
    <nav aria-label="Footer navigation">
      <ul className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
        {navItems.map((item) => (
          <li key={item.name}>
            {item.external ? (
              <a
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-body transition-colors duration-200 hover:text-primary"
              >
                {item.name}
              </a>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `text-sm transition-colors duration-200 ${
                    isActive
                      ? "font-medium text-primary"
                      : "text-body hover:text-primary"
                  }`
                }
              >
                {item.name}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </nav>

    {/* Social / Contact Buttons */}
    <div className="flex items-center gap-3">
      <NavLink
        to="/contact"
        aria-label="Contact Support"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-body transition-colors duration-200 hover:bg-primary/10 hover:text-primary"
      >
        <Mail size={18} />
      </NavLink>
    </div>
  </div>
</footer>
  );
}