import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, LogOut, Home, History, Users, School, Sparkles } from 'lucide-react';

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
    <nav className="bg-white border-b border-gray-200 shadow-soft sticky top-0 z-50 backdrop-blur-lg bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18">
          <div className="flex items-center">
            <div className="flex items-center space-x-3 animate-slide-up">
              <div className="relative">
                <GraduationCap className="h-10 w-10 text-primary-600" />
                <Sparkles className="h-4 w-4 text-accent-400 absolute -top-1 -right-1 animate-bounce-subtle" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  EduPass
                </span>
                <div className="text-xs text-gray-500 font-medium">Education Credits</div>
              </div>
            </div>
            
            <div className="ml-12 flex space-x-2">
              {getDashboardLinks().map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-medium scale-105'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:scale-105'
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
            <div className="text-right animate-slide-down">
              <div className="font-semibold text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500 capitalize inline-flex items-center">
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                  user.role === 'issuer' ? 'bg-primary-500' :
                  user.role === 'beneficiary' ? 'bg-secondary-500' :
                  'bg-success-500'
                }`}></span>
                {user.role}
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-300 border-2 border-transparent hover:border-red-200"
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
