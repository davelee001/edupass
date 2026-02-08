import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Key, Mail } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <GraduationCap className="h-16 w-16 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to EduPass
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Education credits on Stellar blockchain
          </p>
        </div>

        {/* Auth Method Toggle */}
        <div className="flex bg-white rounded-lg shadow-lg p-1">
          <button
            type="button"
            onClick={() => setAuthMethod('traditional')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              authMethod === 'traditional'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email/Password
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('sep10')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              authMethod === 'sep10'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="h-4 w-4" />
            SEP-10 Stellar Auth
          </button>
        </div>

        {/* Traditional Login Form */}
        {authMethod === 'traditional' && (
          <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleTraditionalSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
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
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center text-sm">
              <span className="text-gray-600">Don't have an account? </span>
              <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                Register
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
