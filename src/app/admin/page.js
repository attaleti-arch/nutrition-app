'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [clients, setClients] = useState([])
  const [newName, setNewName] = useState('')
  const [newPass, setNewPass] = useState('')
  const [msg, setMsg] = useState('')

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('created_at')
    setClients(data || [])
  }

  useEffect(() => { if (auth) loadClients() }, [auth])

  const add
