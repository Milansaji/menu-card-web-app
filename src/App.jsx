import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Real Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Settings from './pages/admin/Settings';
import Orders from './pages/admin/Orders';
import QRGenerator from './pages/admin/QRGenerator';

// Customer Pages
import DigitalMenu from './pages/customer/DigitalMenu';
import Cart from './pages/customer/Cart';
import Checkout from './pages/customer/Checkout';

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Toaster position="top-center" />
          <Routes>
            {/* Customer Routes */}
            <Route element={<CustomerLayout />}>
              <Route path="/menu/:restaurantId" element={<DigitalMenu />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />

            {/* Admin Routes (Protected) */}
            <Route path="/admin" element={<PrivateRoute><AdminLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="settings" element={<Settings />} />
              <Route path="orders" element={<Orders />} />
              <Route path="qr" element={<QRGenerator />} />
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
