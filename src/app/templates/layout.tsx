export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  // The root layout already renders the global navigation and containers.
  // Keep the templates route layout minimal to avoid duplicate sidebars.
  return <>{children}</>;
}


 