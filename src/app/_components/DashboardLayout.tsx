import { Navigation } from "./Navigation";
import { QuickCapture } from "./gtd/QuickCapture";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Navigation />
      <main className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="animate-in fade-in duration-500">
          {children}
        </div>
      </main>
      <QuickCapture />
    </div>
  );
}