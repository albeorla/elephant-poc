import { InboxProcessor } from "~/app/_components/gtd/InboxProcessor";
import { DashboardLayout } from "~/app/_components/DashboardLayout";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function InboxPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Inbox Processing</h1>
        <p className="mt-2 text-muted-foreground">
          Process items one at a time using the GTD methodology
        </p>
      </div>
      <InboxProcessor />
    </DashboardLayout>
  );
}