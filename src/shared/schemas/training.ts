import { z } from 'zod'

const algorithms = ['random_forest', 'svm', 'logistic_regression', 'xgboost'] as const

export const trainModelSchema = z.object({
  dataset_id: z.string().min(1, 'Dataset is required'),
  algorithm: z.enum(algorithms, { message: 'Invalid algorithm' }),
  pipeline_id: z.string().optional(),
  target_column: z.string().optional(),
  test_size: z.number().min(0).max(1).optional().default(0.2),
  random_seed: z.number().int().optional().default(42),
  hyperparameters: z.record(z.unknown()).optional(),
  name: z.string().max(255).optional(),
})

export type TrainModelFormData = z.infer<typeof trainModelSchema>
