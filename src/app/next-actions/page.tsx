import { NextActionsList } from "~/app/_components/gtd/NextActionsList";
import { DashboardLayout } from "~/app/_components/DashboardLayout";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function NextActionsPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Next Actions</h1>
        <p className="mt-2 text-muted-foreground">
          Your actionable tasks organized by context and energy level
        </p>
      </div>
      <NextActionsList />
    </DashboardLayout>
  );
}