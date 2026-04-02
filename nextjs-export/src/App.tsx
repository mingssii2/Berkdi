/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import Layout from './Layout';
import { Toaster } from './components/ui/sonner';

// Placeholder components for routes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewClaim from './pages/NewClaim';
import ClaimsList from './pages/ClaimsList';
import ClaimDetail from './pages/ClaimDetail';
import ApprovalsList from './pages/ApprovalsList';
import ReviewClaim from './pages/ReviewClaim';
import AccountingDashboard from './pages/AccountingDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MyProjects from './pages/MyProjects';
import ProjectSettings from './pages/ProjectSettings';
import Settings from './pages/Settings';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="claims/new" element={<NewClaim />} />
          <Route path="claims" element={<ClaimsList />} />
          <Route path="claims/:id" element={<ClaimDetail />} />
          <Route path="approvals" element={<ApprovalsList />} />
          <Route path="approvals/:id/review" element={<ReviewClaim />} />
          <Route path="my-projects" element={<MyProjects />} />
          <Route path="my-projects/:id" element={<ProjectSettings />} />
          <Route path="accounting" element={<AccountingDashboard />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-center" />
    </Router>
  );
}
