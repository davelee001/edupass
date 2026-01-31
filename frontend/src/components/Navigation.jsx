import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, Home, History, Users, School } from 'lucide-react';

function Navigation({ user, onLogout }) {
  const location = useLocation();

  const getDashboardLinks = () => {
    switch (user.role) {
      case 'issuer':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: Home },
          { to: '/beneficiaries', label: 'Beneficiaries', icon: Users }
        ];
      case 'beneficiary':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: Home },
          { to: '/schools', label: 'Schools', icon: School },
          { to: '/history', label: 'History', icon: History }
        ];
      case 'school':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: Home },
          { to: '/redemptions', label: 'Redemptions', icon: History }
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">EduPass</span>
            
            <div className="ml-10 flex space-x-4">
              {getDashboardLinks().map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === link.to
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-gray-500 capitalize">{user.role}</div>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
