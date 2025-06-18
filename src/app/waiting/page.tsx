import { WaitingForList } from "~/app/_components/gtd/WaitingForList";
import { DashboardLayout } from "~/app/_components/DashboardLayout";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function WaitingForPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <DashboardLayout>
      <h1 className="mb-8 text-3xl font-bold">Waiting For</h1>
      <WaitingForList />
    </DashboardLayout>
  );
}