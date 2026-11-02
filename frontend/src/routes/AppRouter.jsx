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
import EnrollmentRequestsPage from '../pages/EnrollmentRequestsPage'
import ClassDetailPage from '../pages/ClassDetailPage'
import StudentLearningPage from '../pages/StudentLearningPage'
import MyGradesPage from '../pages/MyGradesPage'
import MyAssignmentsPage from '../pages/MyAssignmentsPage'
import MyAssignmentDetailPage from '../pages/MyAssignmentDetailPage'
import SubmissionsPage from '../pages/SubmissionsPage'
import GradeBookPage from '../pages/GradeBookPage'
import QuestionBankPage from '../pages/QuestionBankPage'
import ProfilePage from '../pages/ProfilePage'
import ThemeSettingsPage from '../pages/ThemeSettingsPage'
import SocialFeedPage from '../pages/SocialFeedPage'
import SocialProfilePage from '../pages/SocialProfilePage'
import MessengerHubPage from '../pages/MessengerHubPage'
import SchoolAdminHubPage from '../pages/SchoolAdminHubPage'
import LessonBundlesPage from '../pages/LessonBundlesPage'
import ShopPage from '../pages/ShopPage'
import ShopPlayPage from '../pages/ShopPlayPage'
import HarvestContentPage from '../pages/HarvestContentPage'
import NotFoundPage from '../pages/NotFoundPage'
import LandingPage from '../pages/LandingPage'
import UserGuidePage from '../pages/UserGuidePage'
import BookingBoardPage from '../pages/BookingBoardPage'
import BookingBoardsPage from '../pages/BookingBoardsPage'
import BookingBoardDetailPage from '../pages/BookingBoardDetailPage'
import BookingRegistrantsPage from '../pages/BookingRegistrantsPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Trang đăng ký lịch học công khai — chỉ cần số điện thoại, không qua ProtectedRoute */}
      <Route path="/dk/:slug" element={<BookingBoardPage />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard - all roles */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="guide" element={<UserGuidePage />} />

        {/* Admin hub - one page to rule them all */}
        <Route
          path="admin-hub"
          element={
            <RoleRoute roles={['admin']}>
              <SchoolAdminHubPage />
            </RoleRoute>
          }
        />

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
          path="classes/:id"
          element={
            <RoleRoute roles={['admin', 'teacher', 'student']}>
              <ClassDetailPage />
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
        <Route
          path="lesson-bundles"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <LessonBundlesPage />
            </RoleRoute>
          }
        />
        <Route
          path="question-bank"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <QuestionBankPage />
            </RoleRoute>
          }
        />

        {/* Admin + Teacher - Enrollment requests */}
        <Route
          path="booking-boards"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <BookingBoardsPage />
            </RoleRoute>
          }
        />
        <Route
          path="booking-registrants"
          element={
            <RoleRoute roles={['admin']}>
              <BookingRegistrantsPage />
            </RoleRoute>
          }
        />
        <Route
          path="booking-boards/:id"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <BookingBoardDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="enrollment-requests"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <EnrollmentRequestsPage />
            </RoleRoute>
          }
        />

        {/* Student - Learning portal */}
        <Route
          path="learning"
          element={
            <RoleRoute roles={['student']}>
              <StudentLearningPage />
            </RoleRoute>
          }
        />
        <Route
          path="my-assignments"
          element={
            <RoleRoute roles={['student']}>
              <MyAssignmentsPage />
            </RoleRoute>
          }
        />
        <Route
          path="my-assignments/:assignmentId"
          element={
            <RoleRoute roles={['student']}>
              <MyAssignmentDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="my-grades"
          element={
            <RoleRoute roles={['student']}>
              <MyGradesPage />
            </RoleRoute>
          }
        />
        <Route
          path="shop"
          element={
            <RoleRoute roles={['student']}>
              <ShopPage />
            </RoleRoute>
          }
        />
        <Route
          path="shop/play/:slug"
          element={
            <RoleRoute roles={['student']}>
              <ShopPlayPage />
            </RoleRoute>
          }
        />
        <Route
          path="shop/harvest-content"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <HarvestContentPage />
            </RoleRoute>
          }
        />

        {/* Admin + Teacher - Submissions & Grading */}
        <Route
          path="submissions"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <SubmissionsPage />
            </RoleRoute>
          }
        />
        <Route
          path="gradebook"
          element={
            <RoleRoute roles={['admin', 'teacher']}>
              <GradeBookPage />
            </RoleRoute>
          }
        />

        {/* Profile & theme - all roles */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings/theme" element={<ThemeSettingsPage />} />
        <Route path="social" element={<SocialFeedPage />} />
        <Route path="social/u/:userId" element={<SocialProfilePage />} />
        <Route path="messenger" element={<MessengerHubPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
