import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  FileText, 
  QrCode,
  LogOut, 
  Menu, 
  X,
  ChefHat,
  ChevronRight,
  User
} from 'lucide-react';

const AdminLayout = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Inventory', path: '/admin/products', icon: Package },
    { name: 'Kitchen', path: '/admin/orders', icon: ChefHat },
    { name: 'QR Menu', path: '/admin/qr', icon: QrCode },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-72' : 'w-24'
        } glass-dark border-r border-white/10 transition-all duration-500 ease-in-out flex flex-col z-50 fixed inset-y-0 lg:relative`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 animate-in fade-in duration-500">
              <div className="w-10 h-10 bg-linear-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <ChefHat className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <h1 className="font-black text-lg text-white leading-none tracking-tight uppercase">SUNRISE</h1>
                <span className="text-[10px] text-white/50 font-bold tracking-widest uppercase mt-1">Admin Portal</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all active:scale-90"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 mt-6 space-y-2 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${
                  isActive 
                    ? 'bg-linear-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-600/20' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                {isSidebarOpen && (
                  <div className="flex items-center justify-between flex-1 animate-in slide-in-from-left-4 duration-500">
                    <span className={`font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>{item.name}</span>
                    {isActive && <ChevronRight size={14} className="text-white/50" />}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/10 space-y-4">
          {isSidebarOpen && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl animate-in fade-in duration-500">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white/70">
                <User size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-white truncate uppercase tracking-widest">Admin User</span>
                <span className="text-[10px] text-white/40 truncate">{currentUser?.email}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-4 text-red-400 hover:bg-red-400/10 hover:text-red-300 rounded-2xl transition-all active:scale-95 group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-bold tracking-tight">Logout System</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto transition-all duration-500 ${isSidebarOpen ? 'lg:pl-0' : ''}`}>
        <div className="max-w-7xl mx-auto p-8 animate-in fade-in duration-700">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
