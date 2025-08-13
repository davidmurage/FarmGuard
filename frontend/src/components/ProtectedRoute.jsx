import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAuth, subscribe } from '../lib/authStore'

export default function ProtectedRoute({ children }) {
  const [auth, setAuth] = useState(getAuth())
  useEffect(() => subscribe(setAuth), [])
  if (!auth.token) return <Navigate to="/login" replace />
  return children
}
