import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { AUTH_KEY, useAuth } from '../lib/queries'

export const Route = createFileRoute('/painel')({
  component: Panel,
})

function Panel() {
  const { t } = useTranslation()
  const { data: user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const logout = useMutation({
    mutationFn: () => fetchApi('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      queryClient.setQueryData(AUTH_KEY, null)
      void navigate({ to: '/entrar' })
    },
  })

  useEffect(() => {
    if (!isLoading && !user) void navigate({ to: '/entrar' })
  }, [isLoading, user, navigate])

  if (isLoading || !user) return <div className="p-8">{t('common.loading')}</div>

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">{t('panel.title')}</h1>
      <p>{t('panel.welcome', { name: user.name })}</p>
      <button
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className="mt-4 bg-[#111827] text-white px-4 py-2 rounded-xl"
      >
        {t('common.logout')}
      </button>
    </main>
  )
}
