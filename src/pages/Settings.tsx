import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../core/api/client'
import { PageHeader } from '../shared/components/PageHeader'
import { Button } from '../shared/components/ui/button'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'

const FIELD_META: Record<string, { label: string; type: string }> = {
  api_endpoint: { label: 'API Endpoint', type: 'text' },
  default_project: { label: 'Default Project', type: 'text' },
  max_memory_gb: { label: 'Max Memory (GB)', type: 'number' },
  max_runtime_minutes: { label: 'Max Runtime (minutes)', type: 'number' },
  parallel_jobs: { label: 'Parallel Jobs', type: 'number' },
  email_alerts: { label: 'Email Alerts', type: 'boolean' },
  webhook_url: { label: 'Webhook URL', type: 'text' },
}

export default function Settings() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<string>('')

  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/settings/')
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await apiClient.put('/settings/', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setEditing(null)
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const defaults = {
        api_endpoint: '/api/v1',
        default_project: 'MLPilot',
        max_memory_gb: 32,
        max_runtime_minutes: 240,
        parallel_jobs: 3,
        email_alerts: true,
        webhook_url: 'https://hooks.mlpilot.io/events',
      }
      const { data } = await apiClient.put('/settings/', defaults)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setEditing(null)
    },
  })

  const startEdit = (key: string, currentValue: unknown) => {
    setEditing(key)
    setDraft(String(currentValue ?? ''))
  }

  const commitEdit = (key: string) => {
    let parsed: unknown = draft
    const meta = FIELD_META[key]
    if (meta?.type === 'number') {
      parsed = Number(draft)
    } else if (meta?.type === 'boolean') {
      parsed = draft === 'true'
    }
    saveMutation.mutate({ [key]: parsed })
  }

  const cancelEdit = () => {
    setEditing(null)
    setDraft('')
  }

  const formatDisplay = (key: string, value: unknown): string => {
    if (key === 'max_memory_gb') return `${value} GB`
    if (key === 'max_runtime_minutes') return `${value} minutes`
    if (key === 'email_alerts') return value ? 'Enabled' : 'Disabled'
    return String(value ?? '')
  }

  if (isLoading) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl">
        <PageHeader title="Settings &" accent="Config" subtitle="System configuration and preferences." />
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl">
        <PageHeader title="Settings &" accent="Config" subtitle="System configuration and preferences." />
        <ErrorState message="Failed to load settings" onRetry={() => refetch()} />
      </div>
    )
  }

  if (!settings) return null

  const sections = [
    {
      title: 'API Configuration',
      keys: ['api_endpoint', 'default_project'],
    },
    {
      title: 'Resource Limits',
      keys: ['max_memory_gb', 'max_runtime_minutes', 'parallel_jobs'],
    },
    {
      title: 'Notifications',
      keys: ['email_alerts', 'webhook_url'],
    },
  ]

  return (
    <div className="p-8 lg:p-12 max-w-4xl">
      <PageHeader title="Settings &" accent="Config" subtitle="System configuration and preferences." />

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-surface border-2 border-primary p-8 neo-shadow">
            <h3 className="font-headline font-black text-xl uppercase mb-6">{section.title}</h3>
            <div className="space-y-4">
              {section.keys.map((key) => {
                const meta = FIELD_META[key]
                const value = settings[key]
                const isEditing = editing === key
                return (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-primary last:border-b-0">
                    <span className="font-headline font-bold text-xs uppercase text-on-surface-variant">{meta?.label ?? key}</span>
                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <>
                          {meta?.type === 'boolean' ? (
                            <select
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              className="border border-primary bg-surface px-2 py-1 text-sm font-body"
                            >
                              <option value="true">Enabled</option>
                              <option value="false">Disabled</option>
                            </select>
                          ) : (
                            <input
                              type={meta?.type ?? 'text'}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              className="border-2 border-primary bg-surface p-2 text-sm font-body w-40"
                              autoFocus
                            />
                          )}
                          <Button variant="primary" size="sm" onClick={() => commitEdit(key)} disabled={saveMutation.isPending}>
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span className="font-body text-sm">{formatDisplay(key, value)}</span>
                          <Button variant="ghost" size="sm" onClick={() => startEdit(key, value)}>Edit</Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending || editing !== null}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1 bg-secondary"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending || editing !== null}
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Defaults'}
          </Button>
        </div>
      </div>
    </div>
  )
}