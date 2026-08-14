import { notFound } from 'next/navigation'
import RegisterPage from '../register/page'

export default function RegisterTestPage() {
  if (process.env.ENABLE_REGISTER_TEST !== '1') notFound()
  return <RegisterPage testBypassCaptcha />
}
