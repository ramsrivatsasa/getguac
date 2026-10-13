import { redirect } from 'next/navigation'
import { find10Enabled, find10BackendAllowed } from '../../lib/find-your-10/integration'
export default function AuthLayout({ children }) {
  if (find10Enabled() && !find10BackendAllowed()) redirect('/local-setup')
  return children
}
