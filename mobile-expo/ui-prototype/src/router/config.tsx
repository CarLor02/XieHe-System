import type { RouteObject } from "react-router-dom";
import { lazy } from 'react';

const Dashboard = lazy(() => import('../pages/dashboard/page'));
const Patients = lazy(() => import('../pages/patients/page'));
const PatientDetail = lazy(() => import('../pages/patients/detail/page'));
const PatientForm = lazy(() => import('../pages/patients/form/page'));
const Images = lazy(() => import('../pages/images/page'));
const ImageUpload = lazy(() => import('../pages/images/upload/page'));
const ImageDetail = lazy(() => import('../pages/images/detail/page'));
const AiMeasurement = lazy(() => import('../pages/ai-measurement/page'));
const Report = lazy(() => import('../pages/report/page'));
const Profile = lazy(() => import('../pages/profile/page'));
const ProfileInfo = lazy(() => import('../pages/profile/info/page'));
const ChangePassword = lazy(() => import('../pages/profile/password/page'));
const Organization = lazy(() => import('../pages/profile/organization/page'));
const Settings = lazy(() => import('../pages/profile/settings/page'));
const Messages = lazy(() => import('../pages/messages/page'));
const MessageDetail = lazy(() => import('../pages/messages/detail/page'));
const Login = lazy(() => import('../pages/login/page'));
const ImageAnnotation = lazy(() => import('../pages/image-annotation/page'));
const NotFound = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Dashboard />
  },
  {
    path: '/dashboard',
    element: <Dashboard />
  },
  {
    path: '/patients',
    element: <Patients />
  },
  {
    path: '/patients/detail/:id',
    element: <PatientDetail />
  },
  {
    path: '/patients/add',
    element: <PatientForm />
  },
  {
    path: '/patients/edit/:id',
    element: <PatientForm />
  },
  {
    path: '/images',
    element: <Images />
  },
  {
    path: '/images/upload',
    element: <ImageUpload />
  },
  {
    path: '/images/detail/:id',
    element: <ImageDetail />
  },
  {
    path: '/ai-measurement/:id',
    element: <AiMeasurement />
  },
  {
    path: '/report/:id',
    element: <Report />
  },
  {
    path: '/images/add',
    element: <ImageUpload />
  },
  {
    path: '/image-annotation',
    element: <ImageAnnotation />
  },
  {
    path: '/profile',
    element: <Profile />
  },
  {
    path: '/profile/info',
    element: <ProfileInfo />
  },
  {
    path: '/profile/password',
    element: <ChangePassword />
  },
  {
    path: '/profile/organization',
    element: <Organization />
  },
  {
    path: '/profile/settings',
    element: <Settings />
  },
  {
    path: '/messages',
    element: <Messages />
  },
  {
    path: '/messages/detail/:id',
    element: <MessageDetail />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '*',
    element: <NotFound />
  }
];

export default routes;
