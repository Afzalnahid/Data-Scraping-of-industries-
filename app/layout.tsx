import "./globals.css";

export const metadata = { title: "Social Autopilot" };

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/posts", label: "Posts" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <a href="/" className="logo">Social Autopilot</a>
            <nav>
              {NAV.map((n) => (
                <a key={n.href} href={n.href}>{n.label}</a>
              ))}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
