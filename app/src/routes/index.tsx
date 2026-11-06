import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Routes as RoutePaths } from "@/routes/routes";
import ProtectedRoute from "@/routes/protected-route";
import SignIn from "@/pages/auth/pages/sign-in";
import SignUp from "@/pages/auth/pages/sign-up";
import AuthLayout from "@/pages/auth/layout";
import AppLayout from "@/pages/app/layout";
import AdminLayout from "@/pages/admin/layout";
import { RoleTypes } from "@/features/user/interfaces/user.interface";
import { DetailSkeleton } from "@/components/ui/page-skeletons";
import { RequirePermission } from "@/components/providers/require-permission";
import {
  Permissions,
  type Permission,
} from "@/features/organisations/interfaces/organisations.interfaces";

const AdminHealthPage = lazy(() => import("@/pages/admin/pages/health"));
const AdminConfigPage = lazy(() => import("@/pages/admin/pages/config"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const NewCallPage = lazy(() => import("@/pages/calls/pages/new"));
const LiveCallPage = lazy(() => import("@/pages/calls/pages/live"));
const LibraryPage = lazy(() => import("@/pages/library"));
const CallDetailPage = lazy(() => import("@/pages/library/pages/detail"));
const AssistantAgentsPage = lazy(() => import("@/pages/assistant-agents"));
const AssistantAgentEditorPage = lazy(
  () => import("@/pages/assistant-agents/pages/editor"),
);
const PracticePage = lazy(() => import("@/pages/practice"));
const PracticeAgentEditorPage = lazy(
  () => import("@/pages/practice/pages/agent-editor"),
);
const PracticeStartPage = lazy(() => import("@/pages/practice/pages/start"));
const PracticeSessionPage = lazy(
  () => import("@/pages/practice/pages/session"),
);
const SettingsPage = lazy(() => import("@/pages/settings"));
const UsagePage = lazy(() => import("@/pages/settings/pages/usage"));
const BillingPage = lazy(() => import("@/pages/settings/pages/billing"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const AdminSubscriptionsPage = lazy(() => import("@/pages/admin/pages/subscriptions"));
const AdminSubscriptionDetailPage = lazy(() => import("@/pages/admin/pages/subscriptions/pages/detail"));
const PrivacyPage = lazy(() => import("@/pages/settings/pages/privacy"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const OrganisationPage = lazy(() => import("@/pages/organisation"));
const InvitePage = lazy(() => import("@/pages/invite"));
const LandingPage = lazy(() => import("@/pages/landing"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const CohortPage = lazy(() => import("@/pages/coaching/cohort"));
const CoachReportsPage = lazy(() => import("@/pages/coaching/reports"));
const AssignmentsPage = lazy(() => import("@/pages/assignments"));
const AssignmentDetailPage = lazy(() => import("@/pages/assignments/pages/detail"));
const StudentPage = lazy(() => import("@/pages/students"));

const guarded = (permission: Permission, element: React.ReactNode) =>
  page(
    <RequirePermission permission={permission}>{element}</RequirePermission>,
  );
const page = (element: React.ReactNode) => (
  <Suspense fallback={<DetailSkeleton />}>{element}</Suspense>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/auth"
        element={
          <ProtectedRoute loggedIn={false}>
            <AuthLayout />
          </ProtectedRoute>
        }
      >
        <Route path="sign-up" element={<SignUp />} />
        <Route path="sign-in" element={<SignIn />} />
        <Route
          index
          element={<Navigate to={RoutePaths.auth.sign_in} replace />}
        />
      </Route>

      <Route path={RoutePaths.invite.pattern} element={page(<InvitePage />)} />

      <Route
        element={
          <ProtectedRoute loggedIn={true}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path={RoutePaths.dashboard} element={page(<DashboardPage />)} />
        <Route
          path={RoutePaths.calls.new}
          element={guarded(Permissions.CALLS_CREATE, <NewCallPage />)}
        />
        <Route
          path={RoutePaths.calls.live_pattern}
          element={guarded(Permissions.CALLS_CREATE, <LiveCallPage />)}
        />
        <Route path={RoutePaths.library.root} element={page(<LibraryPage />)} />
        <Route
          path={RoutePaths.library.detail_pattern}
          element={page(<CallDetailPage />)}
        />
        <Route
          path={RoutePaths.assistant_agents.root}
          element={guarded(Permissions.AGENTS_VIEW, <AssistantAgentsPage />)}
        />
        <Route
          path={RoutePaths.assistant_agents.new}
          element={guarded(
            Permissions.AGENTS_MANAGE,
            <AssistantAgentEditorPage />,
          )}
        />
        <Route
          path={RoutePaths.assistant_agents.detail_pattern}
          element={guarded(
            Permissions.AGENTS_MANAGE,
            <AssistantAgentEditorPage />,
          )}
        />
        <Route
          path={RoutePaths.practice.root}
          element={guarded(Permissions.CALLS_CREATE, <PracticePage />)}
        />
        <Route
          path={RoutePaths.practice.agents_new}
          element={guarded(
            Permissions.PROSPECTS_MANAGE,
            <PracticeAgentEditorPage />,
          )}
        />
        <Route
          path={RoutePaths.practice.agent_pattern}
          element={guarded(
            Permissions.PROSPECTS_MANAGE,
            <PracticeAgentEditorPage />,
          )}
        />
        <Route
          path={RoutePaths.practice.start_pattern}
          element={guarded(Permissions.CALLS_CREATE, <PracticeStartPage />)}
        />
        <Route
          path={RoutePaths.practice.session_pattern}
          element={guarded(Permissions.CALLS_CREATE, <PracticeSessionPage />)}
        />
        <Route
          path={RoutePaths.organisation.root}
          element={page(<OrganisationPage />)}
        />
        <Route
          path={RoutePaths.settings.root}
          element={page(<SettingsPage />)}
        />
        <Route path={RoutePaths.settings.usage} element={page(<UsagePage />)} />
        <Route path={RoutePaths.settings.billing} element={page(<BillingPage />)} />
        <Route path={RoutePaths.pricing} element={page(<PricingPage />)} />
        <Route
          path={RoutePaths.settings.privacy}
          element={page(<PrivacyPage />)}
        />
        <Route
          path={RoutePaths.notifications}
          element={page(<NotificationsPage />)}
        />
        <Route
          path={RoutePaths.coaching.cohort}
          element={guarded(Permissions.COACHING_VIEW, <CohortPage />)}
        />
        <Route
          path={RoutePaths.coaching.reports}
          element={guarded(Permissions.COACHING_VIEW, <CoachReportsPage />)}
        />
        <Route
          path={RoutePaths.coaching.assignments}
          element={guarded(Permissions.COACHING_VIEW, <AssignmentsPage />)}
        />
        <Route
          path={RoutePaths.coaching.assignment_pattern}
          element={guarded(Permissions.COACHING_VIEW, <AssignmentDetailPage />)}
        />
        <Route
          path={RoutePaths.coaching.student_pattern}
          element={guarded(Permissions.COACHING_VIEW, <StudentPage />)}
        />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            loggedIn={true}
            requiredRoles={[RoleTypes.ADMIN, RoleTypes.SUPER_ADMIN]}
          >
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="health" element={page(<AdminHealthPage />)} />
        <Route path={RoutePaths.admin.subscriptions} element={page(<AdminSubscriptionsPage />)} />
        <Route path={RoutePaths.admin.subscription_pattern} element={page(<AdminSubscriptionDetailPage />)} />
        <Route path="config" element={page(<AdminConfigPage />)} />
        <Route
          index
          element={<Navigate to={RoutePaths.admin.health} replace />}
        />
      </Route>

      <Route
        path={RoutePaths.root}
        element={page(<LandingPage />)}
      />
      <Route path="*" element={page(<NotFoundPage />)} />
    </Routes>
  );
}
