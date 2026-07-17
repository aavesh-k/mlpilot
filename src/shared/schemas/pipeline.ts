import { z } from 'zod'

export const encodingConfigSchema = z.object({
  strategy: z.enum(['auto', 'one_hot', 'target', 'frequency']).default('auto'),
  passthrough_columns: z.array(z.string()).optional(),
  scale_columns: z.array(z.string()).optional(),
})

export const scalingConfigSchema = z.object({
  strategy: z.enum(['auto', 'standard', 'minmax', 'robust']).default('auto'),
})

export const splitConfigSchema = z.object({
  test_size: z.number().min(0).max(1).default(0.2),
  random_seed: z.number().int().default(42),
  stratify: z.boolean().default(true),
})

export const featureSelectionConfigSchema = z.object({
  enabled: z.boolean().default(false),
  drop_near_zero_variance: z.boolean().default(false),
  variance_threshold: z.number().min(0).default(0.01),
  drop_high_correlation: z.boolean().default(false),
  correlation_threshold: z.number().min(0).max(1).default(0.95),
})

export const createPipelineSchema = z.object({
  dataset_id: z.string().min(1, 'Dataset is required'),
  target_column: z.string().min(1, 'Target column is required'),
  problem_type: z.enum(['classification', 'regression']).optional(),
  name: z.string().max(255).optional(),
  encoding: encodingConfigSchema.optional().default({ strategy: 'auto' }),
  scaling: scalingConfigSchema.optional().default({ strategy: 'auto' }),
  split: splitConfigSchema.optional().default({ test_size: 0.2, random_seed: 42, stratify: true }),
  feature_selection: featureSelectionConfigSchema.optional().default({ enabled: false, drop_near_zero_variance: false, variance_threshold: 0.01, drop_high_correlation: false, correlation_threshold: 0.95 }),
  use_smote: z.boolean().optional().default(false),
  use_class_weight: z.boolean().optional().default(false),
})

export type CreatePipelineFormData = z.infer<typeof createPipelineSchema>
