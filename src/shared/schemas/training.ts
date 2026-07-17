import { z } from 'zod'

const algorithms = [
  'random_forest',
  'svm',
  'logistic_regression',
  'xgboost',
  'knn',
  'linear_regression',
  'ridge',
  'lasso',
  'random_forest_regressor',
  'xgboost_regressor',
] as const

export const trainModelSchema = z.object({
  pipeline_id: z.string().min(1, 'Pipeline is required'),
  algorithms: z.array(z.enum(algorithms)).min(1, 'Select at least one algorithm'),
  cv_folds: z.number().int().min(2).max(10).optional().default(5),
  primary_metric: z.string().optional(),
  tuning_enabled: z.boolean().optional().default(true),
  name: z.string().max(255).optional(),
})

export type TrainModelFormData = z.infer<typeof trainModelSchema>

