import { z } from 'zod'

const stepTypes = ['imputation', 'encoding', 'scaling', 'train_test_split'] as const

export const pipelineStepSchema = z.object({
  step_type: z.enum(stepTypes, { message: 'Invalid step type' }),
  config: z.record(z.unknown()).optional().default({}),
  columns: z.array(z.string()).optional(),
})

export const createPipelineSchema = z.object({
  dataset_id: z.string().min(1, 'Dataset is required'),
  name: z.string().min(1, 'Name is required').max(255).optional(),
  steps: z
    .array(pipelineStepSchema)
    .min(1, 'At least one step is required')
    .max(10, 'Maximum 10 steps allowed'),
  test_split_ratio: z.number().min(0).max(1).optional().default(0.2),
  random_seed: z.number().int().optional().default(42),
})

export type CreatePipelineFormData = z.infer<typeof createPipelineSchema>
