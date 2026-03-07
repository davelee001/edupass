import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Key, Mail, Sparkles, Shield, Zap } from 'lucide-react';
import { login } from '../services/api';
import sep10Service from '../services/sep10Service';

function Login({ onLogin }) {
  const [authMethod, setAuthMethod] = useState('traditional'); // 'traditional' or 'sep10'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    secretKey: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTraditionalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email: formData.email, password: formData.password });
      onLogin(response.user, response.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSEP10Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await sep10Service.authenticateAndSetup(formData.secretKey);
      
      // Create user object from SEP-10 response
      const user = {
        id: result.userId,
        email: result.email,
        role: result.role,
        stellarPublicKey: result.account
      };
      
      onLogin(user, result.token);
    } catch (err) {
      setError(err.message || 'SEP-10 authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-bounce-subtle"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-bounce-subtle" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-bounce-subtle" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-slide-up">
        <div className="text-center">
          <div className="flex justify-center relative">
            <div className="relative">
              <GraduationCap className="h-20 w-20 text-primary-600 animate-bounce-subtle" />
              <Sparkles className="h-6 w-6 text-accent-400 absolute -top-2 -right-2 animate-bounce-subtle" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 bg-clip-text text-transparent">
            Welcome to EduPass
          </h2>
          <p className="mt-3 text-base text-gray-600 font-medium">
            Empowering education through blockchain
          </p>
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-1.5 text-success-500" />
              Secure
            </div>
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-1.5 text-accent-500" />
              Fast
            </div>
            <div className="flex items-center">
              <Sparkles className="h-4 w-4 mr-1.5 text-secondary-500" />
              Stellar
            </div>
          </div>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex bg-white/80 backdrop-blur-lg rounded-2xl shadow-medium p-1.5 border border-gray-200">
          <button
            type="button"
            onClick={() => setAuthMethod('traditional')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
              authMethod === 'traditional'
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-medium scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email/Password
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('sep10')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
              authMethod === 'sep10'
                ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-medium scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Key className="h-4 w-4" />
            SEP-10 Stellar
          </button>
        </div>

        {/* Traditional Login Form */}
        {authMethod === 'traditional' && (
          <form className="space-y-6 bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-medium border border-gray-200 animate-scale-in" onSubmit={handleTraditionalSubmit}>
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="input"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
                Register now
              </Link>
            </div>
          </form>
        )}

        {/* SEP-10 Login Form */}
        {authMethod === 'sep10' && (
          <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleSEP10Submit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="secretKey" className="label">Stellar Secret Key</label>
                <input
                  id="secretKey"
                  name="secretKey"
                  type="password"
                  required
                  className="input font-mono text-sm"
                  placeholder="S..."
                  value={formData.secretKey}
                  onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter your Stellar secret key for secure authentication
                </p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Authenticate with Stellar'}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-xs text-blue-800">
                <strong>SEP-10:</strong> Stellar authentication protocol that proves you control 
                a Stellar account without sharing your secret key with the server.
              </p>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Register
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;
