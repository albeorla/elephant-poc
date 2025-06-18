import Link from "next/link";

import { TaskManager } from "~/app/_components/task/TaskManager";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ThemeToggle } from "~/components/theme-toggle";

import { DashboardLayout } from "~/app/_components/DashboardLayout";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <HydrateClient>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-end mb-8">
              <ThemeToggle />
            </div>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-6xl">
                TaskFlow
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Modern task management with seamless Todoist integration. 
                Organize your work, sync across platforms, and stay productive.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button asChild size="lg">
                  <Link href="/api/auth/signin">
                    Get started
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="mx-auto mt-16 max-w-4xl">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📝 Task Management
                    </CardTitle>
                    <CardDescription>
                      Create, organize, and track your tasks with an intuitive interface
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      🔄 Todoist Sync
                    </CardTitle>
                    <CardDescription>
                      Bidirectional synchronization with your Todoist account
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      📁 Projects & Sections
                    </CardTitle>
                    <CardDescription>
                      Organize tasks into projects and sections for better structure
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </HydrateClient>
    );
  }

  // Redirect authenticated users to inbox
  redirect("/inbox");
}
