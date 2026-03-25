import { Link } from 'react-router-dom';
import { Heart, MessageSquare, User, LogOut, Search, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export function Navbar({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white group-hover:bg-sky-600 transition-colors">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-zinc-900">
              CUT <span className="text-sky-500">Connect</span>
            </span>
          </Link>

          <div className="flex items-center space-x-1 sm:space-x-4">
            {user ? (
              <>
                <Link to="/discover" className="p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all flex items-center space-x-2">
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Discover</span>
                </Link>
                <Link to="/subscription" className="p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="hidden sm:inline font-medium">Premium</span>
                </Link>
                <Link to="/chat" className="p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Chat</span>
                </Link>
                <Link to="/profile" className="p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-all flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Profile</span>
                </Link>
                <button 
                  onClick={onLogout}
                  className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
