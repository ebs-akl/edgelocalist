export default function Footer() {
  return (
    <footer className="border-t py-6 bg-background">
      <div className="container mx-auto px-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Edge Branding Solutions · Part of the EdgeDMS Platform
        </p>
        <p className="text-[11px] text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">
          EdgeDMS is an independent digital services provider and is not affiliated with, associated,
          authorized, endorsed by, or in any way officially connected with Cutco Corporation, or any
          of its subsidiaries or its affiliates.
        </p>
      </div>
    </footer>
  );
}
