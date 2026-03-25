import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout'
import ProtectedRoute from '../components/auth/ProtectedRoute'
import RoleRoute from '../components/auth/RoleRoute'
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
import TemplatesPage from '../pages/TemplatesPage'
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
        {/* Dashboard - all roles */}
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />

        {/* Admin only */}
        <Route
          path="teachers"
          element={
            <RoleRoute roles={['admin']}>
              <TeachersPage />
            </RoleRoute>
          }
        />
        <Route
          path="students"
          element={
            <RoleRoute roles={['admin']}>
              <StudentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="subjects"
          element={
            <RoleRoute roles={['admin']}>
              <SubjectsPage />
            </RoleRoute>
          }
        />
        <Route
          path="facilities"
          element={
            <RoleRoute roles={['admin']}>
              <FacilitiesPage />
            </RoleRoute>
          }
        />
        <Route
          path="finances"
          element={
            <RoleRoute roles={['admin']}>
              <FinancesPage />
            </RoleRoute>
          }
        />

        {/* Admin + Teacher + Student */}
        <Route
          path="classes"
          element={
            <RoleRoute roles={['admin', 'teacher', 'student']}>
              <ClassesPage />
            </RoleRoute>
          }
        />
        <Route
          path="lessons"
          element={
            <RoleRoute roles={['admin', 'teacher', 'student']}>
              <LessonsPage />
            </RoleRoute>
          }
        />
        <Route
          path="assignments"
          element={
            <RoleRoute roles={['admin', 'teacher', 'student']}>
              <AssignmentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="schedules"
          element={
            <RoleRoute roles={['admin', 'teacher', 'student']}>
              <SchedulesPage />
            </RoleRoute>
          }
        />

        {/* Admin + Teacher */}
        <Route
          path="templates"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <TemplatesPage />
            </RoleRoute>
          }
        />

        {/* Profile - all roles */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
