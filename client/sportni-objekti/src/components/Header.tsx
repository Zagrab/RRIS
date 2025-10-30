import { Link } from 'react-router-dom'
import useAuth from '../lib/useAuth'

export default function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm">
      <Link to="/" className="text-xl font-semibold text-gray-800">RRIS</Link>
      <nav className="space-x-4 flex items-center">
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-800">Home</Link>
        {user ? (
          <>
            <Link to="/manage" className="text-sm text-gray-600 hover:text-gray-800">Upravljanje</Link>
            <a href="#" className="text-sm text-gray-600 hover:text-gray-800">Rezervacije</a>
          </>
        ) : (
          <Link to="/auth" className="text-sm text-gray-600 hover:text-gray-800">Prijava</Link>
        )}

        {user && (
          <div className="ml-4 flex items-center gap-3">
            <span className="text-sm text-gray-700">{user.email}</span>
            <button onClick={() => signOut()} className="text-sm text-red-600 hover:underline">Odjava</button>
          </div>
        )}
      </nav>
    </header>
  )
}
