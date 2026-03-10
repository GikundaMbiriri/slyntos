import React, { useState } from "react";
import { login, register } from "../services/authService";
import type { User } from "../types";
import SlyntosLogo from "./icons/SlyntosLogo";
import logo from '../assets/images/logo.jpeg'
import Loader from "./Loader";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        const user = await register(email, username, password);
        onAuthSuccess(user);
      } else {
        const user = await login(username, password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="w-full max-w-[280px] sm:max-w-xs bg-gray-900 rounded-[2.5rem] p-8 border border-gray-800 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-white rounded-xl mx-auto flex items-center justify-center mb-3 shadow-xl">
            <img src={logo} alt="Slyntos Logo" className="w-10 h-10 rounded-lg" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white italic">
            {isRegisterMode ? "Register" : "Sign In"}
          </h1>
          <p className="text-[8px] text-gray-500 mt-0.5 font-bold uppercase tracking-widest">
            Universal Assistant
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isRegisterMode && (
            <div className="space-y-0.5">
              <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest px-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-950 border-gray-800 border rounded-xl transition-all text-xs outline-none focus:border-gray-700 text-white"
                placeholder="Work email"
                required
              />
            </div>
          )}
          <div className="space-y-0.5">
            <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest px-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-950 border-gray-800 border rounded-xl transition-all text-xs outline-none focus:border-gray-700 text-white"
              placeholder="Username"
              required
            />
          </div>
          <div className="space-y-0.5">
            <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest px-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-950 border-gray-800 border rounded-xl transition-all text-xs outline-none focus:border-gray-700 text-white"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-[8px] font-bold text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-xs"
          >
            {isLoading ? <Loader /> : isRegisterMode ? "Register" : "Sign In"}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-500">
            {isRegisterMode ? "Have an account?" : "No account?"}{" "}
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="font-black text-white hover:underline uppercase tracking-tighter"
            >
              {isRegisterMode ? "Sign In" : "Register"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
