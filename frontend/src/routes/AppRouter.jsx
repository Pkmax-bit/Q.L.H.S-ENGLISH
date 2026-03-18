import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import AdminRoute from '../components/auth/AdminRoute'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import TeachersPage from '../pages/TeachersPage'
import StudentsPage from '../pages/StudentsPage'
import SubjectsPage from '../pages/SubjectsPage'
import ClassesPage from '../pages/ClassesPage'
import LessonsPage from '../pages/LessonsPage'
import AssignmentsPage from '../pages/AssignmentsPage'
import SchedulesPage from '../pages/SchedulesPage'
import FacilitiesPage from '../pages/FacilitiesPage'
import FinancesPage from '../pages/FinancesPage'
import ProfilePage from '../pages/ProfilePage'
import NotFoundPage from '../pages/NotFoundPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="lessons" element={<LessonsPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="schedules" element={<SchedulesPage />} />
        <Route path="facilities" element={<FacilitiesPage />} />
        <Route
          path="finances"
          element={
            <AdminRoute>
              <FinancesPage />
            </AdminRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
