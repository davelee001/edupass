import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import IssuerDashboard from './pages/IssuerDashboard';
import BeneficiaryDashboard from './pages/BeneficiaryDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import Navigation from './components/Navigation';
import { getCurrentUser } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to load user:', error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && <Navigation user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/register" 
            element={!user ? <Register onRegister={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          
          <Route
            path="/dashboard"
            element={
              user ? (
                user.role === 'issuer' ? <IssuerDashboard user={user} /> :
                user.role === 'beneficiary' ? <BeneficiaryDashboard user={user} /> :
                user.role === 'school' ? <SchoolDashboard user={user} /> :
                <Navigate to="/login" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
