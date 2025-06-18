import { ProjectsList } from "~/app/_components/gtd/ProjectsList";
import { DashboardLayout } from "~/app/_components/DashboardLayout";
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

export default async function ProjectsPage() {
  const session = await auth();
  
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Projects & Areas</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your active projects, areas of responsibility, resources, and archives
        </p>
      </div>
      <ProjectsList />
    </DashboardLayout>
  );
}