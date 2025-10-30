import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="p-6 text-center">
      <h2 className="text-3xl font-bold mb-2">404</h2>
      <p className="text-gray-600 mb-4">Stran ni bila najdena.</p>
      <Link to="/" className="text-blue-600 underline">Nazaj na domačo stran</Link>
    </div>
  )
}
