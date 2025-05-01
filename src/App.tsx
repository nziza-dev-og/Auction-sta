import  { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const UserDashboard = lazy(() => import('./pages/user/Dashboard'));
const UserProfile = lazy(() => import('./pages/user/Profile'));
const UserBids = lazy(() => import('./pages/user/Bids'));
const BidHistory = lazy(() => import('./pages/user/BidHistory'));
const UserNotifications = lazy(() => import('./pages/user/Notifications'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const BidManagement = lazy(() => import('./pages/admin/BidManagement'));
const DeclarationManagement = lazy(() => import('./pages/admin/DeclarationManagement'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminStatistics = lazy(() => import('./pages/admin/Statistics'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));
const NotFound = lazy(() => import('./pages/NotFound'));

function PrivateRoute({ children, requireAdmin = false }: { children: JSX.Element, requireAdmin?: boolean }) {
  const { currentUser, userData } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && (!userData || !userData.isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/payment/:productId" element={
          <PrivateRoute>
            <PaymentPage />
          </PrivateRoute>
        } />
        <Route path="/payment/success/:productId" element={<PaymentSuccess />} />
        
        {/* User Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <UserDashboard />
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <UserProfile />
          </PrivateRoute>
        } />
        <Route path="/my-bids" element={
          <PrivateRoute>
            <UserBids />
          </PrivateRoute>
        } />
        <Route path="/bid-history" element={
          <PrivateRoute>
            <BidHistory />
          </PrivateRoute>
        } />
        <Route path="/notifications" element={
          <PrivateRoute>
            <UserNotifications />
          </PrivateRoute>
        } />
        
        {/* Admin Routes */}
        <Route path="/admin" element={
          <PrivateRoute requireAdmin>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/admin/bids" element={
          <PrivateRoute requireAdmin>
            <BidManagement />
          </PrivateRoute>
        } />
        <Route path="/admin/declarations" element={
          <PrivateRoute requireAdmin>
            <DeclarationManagement />
          </PrivateRoute>
        } />
        <Route path="/admin/settings" element={
          <PrivateRoute requireAdmin>
            <AdminSettings />
          </PrivateRoute>
        } />
        <Route path="/admin/statistics" element={
          <PrivateRoute requireAdmin>
            <AdminStatistics />
          </PrivateRoute>
        } />
        <Route path="/admin/products" element={
          <PrivateRoute requireAdmin>
            <AdminProducts />
          </PrivateRoute>
        } />
        <Route path="/admin/products/new" element={
          <PrivateRoute requireAdmin>
            <ProductForm />
          </PrivateRoute>
        } />
        <Route path="/admin/products/edit/:id" element={
          <PrivateRoute requireAdmin>
            <ProductForm />
          </PrivateRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <AppRoutes />
        </main>
        <footer className="bg-gray-800 text-white py-6">
          <div className="container mx-auto px-4">
            <p className="text-center">© {new Date().getFullYear()} BidMaster. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </AuthProvider>
  );
}

export default App;
 