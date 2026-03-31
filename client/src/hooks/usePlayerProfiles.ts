import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGlobalContext } from '@/hooks/useGlobalContext'
import { getUserProfile, type UserProfileResponse } from '@/services/authService'

type ProfileMap = Record<string, UserProfileResponse>

function toProfileMap(entries: UserProfileResponse[]): ProfileMap {
  return Object.fromEntries(entries.map((entry) => [entry.id, entry]))
}

export function usePlayerProfiles(userIds: Array<string | null | undefined>) {
  const { user } = useGlobalContext()
  const [profilesById, setProfilesById] = useState<ProfileMap>({})

  const idsKey = useMemo(
    () => [...new Set(userIds.filter((value): value is string => Boolean(value)))].join(':'),
    [userIds],
  )
  const normalizedIds = useMemo(() => (idsKey ? idsKey.split(':') : []), [idsKey])
  const currentUserProfile = useMemo<UserProfileResponse | null>(() => {
    if (!user?.id) {
      return null
    }

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      signature: user.signature,
      elo: user.elo,
    }
  }, [user])

  const fetchProfilesMap = useCallback(async (): Promise<ProfileMap> => {
    if (normalizedIds.length === 0) {
      return {}
    }

    const seedProfiles = currentUserProfile ? [currentUserProfile] : []
    const fetchedProfiles = await Promise.all(
      normalizedIds.map(async (id) => {
        try {
          return await getUserProfile(id)
        } catch {
          return id === currentUserProfile?.id
            ? currentUserProfile
            : null
        }
      }),
    )

    return toProfileMap([
      ...seedProfiles,
      ...fetchedProfiles.filter((profile): profile is UserProfileResponse => profile !== null),
    ])
  }, [currentUserProfile, normalizedIds])

  useEffect(() => {
    let isCancelled = false

    const loadProfiles = async () => {
      const nextProfiles = await fetchProfilesMap()

      if (isCancelled) {
        return
      }

      setProfilesById(nextProfiles)
    }

    void loadProfiles()

    return () => {
      isCancelled = true
    }
  }, [
    fetchProfilesMap,
  ])

  const refreshProfiles = useCallback(async (): Promise<ProfileMap> => {
    const nextProfiles = await fetchProfilesMap()
    setProfilesById(nextProfiles)
    return nextProfiles
  }, [fetchProfilesMap])

  return useMemo(
    () => ({
      profilesById,
      refreshProfiles,
      getProfileById: (userId: string | null | undefined) =>
        (userId ? profilesById[userId] ?? null : null),
    }),
    [profilesById, refreshProfiles],
  )
}
