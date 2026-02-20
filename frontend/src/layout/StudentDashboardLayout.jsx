import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "../components/dashboard/StudentSidebar";
import StudentHeader from "../components/dashboard/StudentHeader";

export default function StudentDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // While actively taking an exam, hide the sidebar + header so the student
  // cannot click away to another page.
  const isExamActive = /\/student\/dashboard\/exams\/[^/]+\/take/.test(location.pathname);

  if (isExamActive) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
