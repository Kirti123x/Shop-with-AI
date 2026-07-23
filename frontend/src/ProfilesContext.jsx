import React, { createContext, useContext, useEffect, useState } from 'react'

const ProfilesContext = createContext(null)
const STORAGE_KEY = 'stylehub_saved_profiles_v1'

// Saved measurement profiles - lets one browser/device keep a small set of
// named people (e.g. "Me", "Mom", "Rahul") each with their own 6 numbers,
// so "Visualise" can build an outline for whichever person is selected.
// Same privacy stance as MeasurementsContext: only these 6 numbers per
// person are ever kept, never a photo.

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } 
catch (_) {}
  return { profiles: [], selectedId: null }
}

function newId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `profile-${Date.now()}-${Math.random()}`
}

export function ProfilesProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const saveProfile = (name, measurements) => {
    const trimmed = (name || '').trim() || 'Unnamed'
    const id = newId()
    setState((s) => ({
      profiles: [...s.profiles, { id, name: trimmed, measurements, savedAt: new Date().toISOString() }],
      selectedId: id,
    }))
    return id
  }

  const deleteProfile = (id) => {
    setState((s) => {
      const profiles = s.profiles.filter((p) => p.id !== id)
      const selectedId = s.selectedId === id ? profiles[0]?.id || null : s.selectedId
      return { profiles, selectedId }
    })
  }

  const selectProfile = (id) => {
    setState((s) => ({ ...s, selectedId: id }))
  }

  const selectedProfile = state.profiles.find((p) => p.id === state.selectedId) || null

  return (
    <ProfilesContext.Provider
      value={{
        profiles: state.profiles,
        selectedId: state.selectedId,
        selectedProfile,
        saveProfile,
        deleteProfile,
        selectProfile,
      }}
    >
      {children}
    </ProfilesContext.Provider>
  )
}

export function useProfiles() {
  return useContext(ProfilesContext)
}
