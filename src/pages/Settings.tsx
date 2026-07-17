import { PageHeader } from '../shared/components/PageHeader'
import { Button } from '../shared/components/ui/button'

const sections = [
  {
    title: 'API Configuration',
    fields: [
      { label: 'API Endpoint', value: 'http://localhost:8000/api/v1' },
      { label: 'Default Project', value: 'MLPilot' },
    ],
  },
  {
    title: 'Resource Limits',
    fields: [
      { label: 'Max Memory', value: '32 GB' },
      { label: 'Max Runtime', value: '4 hours' },
      { label: 'Parallel Jobs', value: '3' },
    ],
  },
  {
    title: 'Notifications',
    fields: [
      { label: 'Email Alerts', value: 'Enabled' },
      { label: 'Webhook URL', value: 'https://hooks.mlpilot.io/events' },
    ],
  },
]

export default function Settings() {
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
          <Button variant="primary" size="lg" className="flex-1">Save Configuration</Button>
          <Button variant="primary" size="lg" className="flex-1 bg-secondary">Reset Defaults</Button>
        </div>
      </div>
    </div>
  )
}
