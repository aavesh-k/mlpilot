import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../core/api/client'
import { PageHeader } from '../shared/components/PageHeader'
import { Button } from '../shared/components/ui/button'
import { ErrorState } from '../shared/components/ErrorState'
import { LoadingSpinner } from '../shared/components/LoadingSpinner'

export default function Settings() {
  const queryClient = useQueryClient()

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
    },
  })

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
      fields: [
        { label: 'API Endpoint', key: 'api_endpoint', value: settings.api_endpoint },
        { label: 'Default Project', key: 'default_project', value: settings.default_project },
      ],
    },
    {
      title: 'Resource Limits',
      fields: [
        { label: 'Max Memory', key: 'max_memory_gb', value: `${settings.max_memory_gb} GB` },
        { label: 'Max Runtime', key: 'max_runtime_minutes', value: `${settings.max_runtime_minutes} minutes` },
        { label: 'Parallel Jobs', key: 'parallel_jobs', value: String(settings.parallel_jobs) },
      ],
    },
    {
      title: 'Notifications',
      fields: [
        { label: 'Email Alerts', key: 'email_alerts', value: settings.email_alerts ? 'Enabled' : 'Disabled' },
        { label: 'Webhook URL', key: 'webhook_url', value: settings.webhook_url },
      ],
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
              {section.fields.map((f) => (
                <div key={f.label} className="flex items-center justify-between py-3 border-b border-primary last:border-b-0">
                  <span className="font-headline font-bold text-xs uppercase text-on-surface-variant">{f.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm">{f.value}</span>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1 bg-secondary"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? 'Resetting...' : 'Reset Defaults'}
          </Button>
        </div>
      </div>
    </div>
  )
}