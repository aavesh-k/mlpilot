# MLPilot — Coding Standards

---

## Part 1: Python Style (Backend)

---

### 1.1 General Rules

| Rule | Standard |
|---|---|
| **Python version** | 3.12+ |
| **Formatter** | Ruff (line length = 120) |
| **Linter** | Ruff (rules: E, F, I, N, W, UP, B, SIM, ARG, ANN) |
| **Type checker** | pyright (strict mode) |
| **Import sorting** | Ruff — I rule (isort-compatible) |
| **No `Any`** | Exception only for truly dynamic data (JSON deserialisation at boundary) |
| **No wildcard imports** | `from module import *` is banned |
| **No mutable defaults** | `def foo(x=[])` is banned |

### 1.2 Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Modules / files | `snake_case` | `eda_engine.py`, `postgres_user_repo.py` |
| Classes | `PascalCase` | `class DatasetEntity:`, `PostgresUserRepository` |
| Functions / methods | `snake_case` | `def compute_stats():`, `async def save():` |
| Variables | `snake_case` | `dataset_id`, `column_stats` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE_MB`, `DEFAULT_PAGE_SIZE` |
| Private members | Leading underscore | `_validate_invariants()`, `_session` |
| Abstract methods | `@abstractmethod` prefix | — |
| Interfaces | Prefix `I` | `class IDatasetRepository(ABC):` |
| Type variables | Short PascalCase | `T`, `TEntity`, `TResponse` |
| Enums | PascalCase members | `class DatasetStatus(StrEnum): READY = "ready"` |

### 1.3 Folder Rules

| Rule | Detail |
|---|---|
| **One class per file** | Except small value objects or closely related enums |
| **File name matches class** | `dataset.py` contains `Dataset` entity |
| **`__init__.py` is minimal** | Re-export public API only; no side effects |
| **No circular imports** | Domain never imports application or infrastructure |
| **Max nesting level** | 3 levels deep (use early returns + guard clauses) |

### 1.4 Imports Order

```
# 1. Standard library
import uuid
from collections.abc import AsyncIterator

# 2. Third-party
from fastapi import APIRouter, Depends
from pydantic import BaseModel

# 3. First-party
from app.domain.entities.dataset import Dataset
from app.domain.interfaces.repositories.i_dataset_repo import IDatasetRepository

# 4. Intra-package (within same package group)
from .i_user_repo import IUserRepository
```

### 1.5 Error Handling

```python
# GOOD: Domain exceptions with meaning
class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(f"{entity} with id {entity_id} not found")
        self.entity = entity
        self.entity_id = entity_id

# GOOD: Use case returns Result type or raises domain exception
async def execute(self, dataset_id: UUID) -> DatasetDTO:
    dataset = await self._repo.get_by_id(dataset_id)
    if not dataset:
        raise NotFoundError("Dataset", str(dataset_id))
    return DatasetDTO.from_entity(dataset)

# BAD: Bare exceptions
try:
    ...
except:
    pass

# BAD: Catching and swallowing
try:
    ...
except Exception as e:
    print(e)

# BAD: Raising HTTP exceptions from domain layer
raise HTTPException(status_code=404)
```

### 1.6 Logging

```python
# GOOD: Structured logging with context
logger = structlog.get_logger()
logger.info("dataset.uploaded", dataset_id=str(dataset.id), file_size=dataset.file_size.bytes)

# GOOD: Log error with context, not just message
logger.error("eda.computation_failed", dataset_id=str(dataset_id), exc_info=True)

# BAD: print()
print(f"Uploaded dataset {dataset.id}")

# BAD: Log without context
logger.info("Dataset uploaded")
```

### 1.7 Type Hints

```python
# GOOD: Full type hints on all functions
async def list_by_user(
    self,
    user_id: UUID,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Dataset], int]:
    ...

# GOOD: Type alias for complex types
PageResult = tuple[list[Dataset], int]

# GOOD: Optional with explicit None
def get_by_id(self, dataset_id: UUID) -> Dataset | None: ...

# BAD: No type hints
def list_by_user(user_id, page=1, per_page=20):
    ...

# BAD: Overusing Any
def process(data: Any) -> Any: ...
```

### 1.8 Async Pattern

```python
# GOOD: Async repository methods
async def save(self, dataset: Dataset) -> Dataset: ...

# GOOD: Async use cases
async def execute(self, user_id: UUID, file: UploadFile) -> DatasetDTO: ...

# GOOD: Proper session management
async with self._session.begin():
    self._session.add(orm_model)
    await self._session.flush()
```

### 1.9 Example: Good Code

```python
"""EDA computation engine."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

import numpy as np
import pandas as pd
import structlog

from app.domain.entities.dataset_column import DatasetColumn
from app.domain.interfaces.i_eda_engine import IEDAEngine

logger = structlog.get_logger()


class EDAEngine(IEDAEngine):
    """Computes column statistics and correlation matrix for a dataset."""

    CORRELATION_THRESHOLD = 0.85
    MISSING_RATIO_WARNING = 0.05

    async def compute_stats(
        self,
        dataset_id: uuid.UUID,
        df: pd.DataFrame,
    ) -> list[DatasetColumn]:
        columns: list[DatasetColumn] = []

        for ordinal, (col_name, series) in enumerate(df.items(), start=1):
            dtype = str(series.dtype)
            is_numeric = np.issubdtype(series.dtype, np.number)

            stats = self._compute_numeric_stats(series) if is_numeric else {}

            columns.append(DatasetColumn(
                dataset_id=dataset_id,
                name=col_name,
                ordinal_position=ordinal,
                dtype=dtype,
                is_numeric=is_numeric,
                is_categorical=series.dtype == "object",
                missing_count=int(series.isna().sum()),
                unique_count=int(series.nunique()),
                **stats,
            ))

        logger.info(
            "eda.stats_computed",
            dataset_id=str(dataset_id),
            column_count=len(columns),
        )
        return columns

    def _compute_numeric_stats(self, series: pd.Series) -> dict:
        desc = series.describe(percentiles=[0.25, 0.5, 0.75])
        return {
            "mean": float(desc.get("mean", 0)),
            "std": float(desc.get("std", 0)),
            "min": float(desc.get("min", 0)),
            "max": float(desc.get("max", 0)),
            "p25": float(desc.get("25%", 0)),
            "p50": float(desc.get("50%", 0)),
            "p75": float(desc.get("75%", 0)),
            "skewness": float(series.skew()),
            "kurtosis": float(series.kurtosis()),
        }
```

### 1.10 Example: Bad Code

```python
# BAD: No type hints, no docstring, mutable default, bare except, print logging
import pandas as pd
from fastapi import HTTPException

def process_data(df, config={}):
    try:
        result = df.describe()
        print(f"Processed {len(df)} rows")
        return result
    except:
        raise HTTPException(500, "Something went wrong")
```

---

## Part 2: TypeScript Style (Frontend)

---

### 2.1 General Rules

| Rule | Standard |
|---|---|
| **TypeScript version** | 5.x (strict mode) |
| **Formatter** | Prettier (printWidth = 100, singleQuote, trailingComma = all) |
| **Linter** | ESLint (extends: recommended, react-hooks, @typescript-eslint) |
| **`noUncheckedIndexedAccess`** | `true` |
| **`strictNullChecks`** | `true` |
| **No `any`** | Use `unknown` + type guard instead |
| **No `// @ts-ignore`** | Use `// @ts-expect-error` with reason |
| **No `console.log` in production** | ESLint rule: `no-console` |

### 2.2 Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files (components) | `PascalCase.tsx` | `DatasetTable.tsx`, `UploadDropzone.tsx` |
| Files (hooks) | `camelCase.ts` | `useDatasets.ts`, `useTrainingJob.ts` |
| Files (utils, api) | `camelCase.ts` | `format.ts`, `datasets.api.ts` |
| Components | `PascalCase` | `function DatasetTable()`, `const UploadDropzone` |
| Hooks | `camelCase` prefixed `use` | `useAuth`, `useDebounce` |
| Functions | `camelCase` | `formatFileSize()`, `normalizeError()` |
| Variables | `camelCase` | `datasetId`, `columnStats` |
| Types / Interfaces | `PascalCase` | `interface DatasetSummary`, `type PaginatedResponse<T>` |
| Enums | `PascalCase` | `enum JobStatus { Running = "running" }` |
| Constants | `UPPER_SNAKE_CASE` | `POLL_INTERVAL_MS`, `MAX_FILE_SIZE_BYTES` |
| CSS classes | Tailwind utility classes | Never custom class names unless necessary |

### 2.3 TypeScript Rules

```typescript
// GOOD: Explicit return types on functions
function formatFileSize(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

// GOOD: Discriminated unions for complex state
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'success'; data: T }

// GOOD: Generic constraints
function getPaginated<T>(items: T[], page: number, perPage: number): { items: T[]; total: number } {
  ...
}

// BAD: any
function process(data: any) { ... }

// BAD: Mutating props
function Component({ items }: { items: string[] }) {
  items.push('new') // mutation!
}
```

### 2.4 React Component Rules

```typescript
// GOOD: Props interface defined and exported
export interface DatasetTableProps {
  datasets: DatasetSummary[]
  isLoading: boolean
  onPageChange: (page: number) => void
}

// GOOD: Early return for loading/error/empty
function DatasetTable({ datasets, isLoading, onPageChange }: DatasetTableProps) {
  if (isLoading) return <SkeletonTable rows={5} cols={4} />
  if (!datasets.length) return <EmptyState icon="database" title="No datasets" />

  return (
    <Table>
      {datasets.map((d) => (
        <TableRow key={d.id}>
          <TableCell>{d.name}</TableCell>
        </TableRow>
      ))}
    </Table>
  )
}

// BAD: Props not typed
function DatasetTable(props) { ... }

// BAD: No loading/empty state
function DatasetTable({ datasets }) {
  return <Table>...</Table> // crashes if datasets is undefined
}
```

### 2.5 React Query Pattern

```typescript
// GOOD: Typed query hooks
function useDataset(datasetId: string) {
  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => datasetsApi.getById(datasetId),
    enabled: !!datasetId,
    staleTime: 30_000,
  })
}

// GOOD: Typed mutation hooks
function useUploadDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => datasetsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      toast.success('Dataset uploaded')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}

// BAD: No error handling
function useDataset(id: string) {
  return useQuery({ queryKey: ['dataset', id], queryFn: () => api.get(`/datasets/${id}`) })
}
```

### 2.6 State Management

```typescript
// GOOD: Zustand store with typed interface
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'mlpilot-ui' },
  ),
)

// BAD: Catch-all store
const store = create(() => ({}))
```

### 2.7 Folder Rules

| Rule | Detail |
|---|---|
| **One component per file** | Exception: tightly coupled sub-components in same file |
| **Component file = PascalCase** | `UploadDropzone.tsx` not `upload_dropzone.tsx` |
| **Hook file = camelCase with `use` prefix** | `useDebounce.ts` |
| **API file = camelCase with `.api` suffix** | `datasets.api.ts` |
| **Page file = `*Page.tsx` suffix** | `DatasetUploadPage.tsx` |
| **No barrel exports in modules** | Explicit imports per file |

### 2.8 Example: Good Component

```typescript
export interface UploadDropzoneProps {
  onUpload: (file: File) => void
  isUploading: boolean
  accept: string[]
}

export function UploadDropzone({ onUpload, isUploading, accept }: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) onUpload(file)
    },
    [onUpload],
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 p-12 text-center transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-dashed border-primary'
      }`}
    >
      <span className="material-symbols-outlined text-6xl text-on-surface-variant">cloud_upload</span>
      <p className="font-headline font-black text-xl uppercase mt-4">Drop Files Here</p>
      <p className="text-on-surface-variant text-sm mt-2">or click to browse</p>
    </div>
  )
}
```

---

## Part 3: Testing Standards

---

### 3.1 Backend (pytest)

| Rule | Detail |
|---|---|
| **Test file name** | `test_<module>.py` — mirrors source path |
| **Test function name** | `test_<scenario>_<expected>` |
| **One assertion per test** | Except state-based assertions on the same object |
| **Fixtures in `conftest.py`** | Per-directory `conftest.py` for shared fixtures |
| **Factories for entities** | `EntityFactory` classes in `tests/helpers/factories.py` |
| **Mock repositories** | `InMemory*Repo` classes in `tests/helpers/mocks.py` |
| **No real network in unit tests** | All external calls mocked |
| **Integration tests use testcontainers** | PostgreSQL spun up per test session |

```python
# GOOD
async def test_upload_dataset_persists_file_and_record(
    upload_use_case: UploadDatasetUseCase,
    sample_csv: BytesIO,
    user: User,
):
    result = await upload_use_case.execute(user.id, sample_csv, "test.csv")
    assert result.name == "test.csv"
    assert result.status == DatasetStatus.UPLOADING
    assert result.file_size_bytes > 0

# BAD: Multiple unrelated assertions
async def test_dataset():
    result = await upload(...)
    assert result.name == "test.csv"
    datasets = await list_datasets(...)
    assert len(datasets) == 1
```

### 3.2 Frontend (Vitest + React Testing Library)

| Rule | Detail |
|---|---|
| **Test file location** | Co-located with component: `Component.tsx` + `Component.test.tsx` |
| **Test function name** | `should <expected behaviour>` |
| **Query by role/text** | Prefer `getByRole`, `getByText` over `getByTestId` |
| **Test behaviour, not implementation** | Don't test internal state; test rendered output |
| **User events** | Use `@testing-library/user-event`, not `fireEvent` |
| **Mock API calls** | MSW (Mock Service Worker) for all HTTP requests |

```typescript
// GOOD
describe('DatasetTable', () => {
  it('should render dataset names in rows', () => {
    render(<DatasetTable datasets={mockDatasets} isLoading={false} onPageChange={vi.fn()} />)
    expect(screen.getByText('training_data_v3.csv')).toBeInTheDocument()
    expect(screen.getByText('test_samples.parquet')).toBeInTheDocument()
  })

  it('should show empty state when no datasets', () => {
    render(<DatasetTable datasets={[]} isLoading={false} onPageChange={vi.fn()} />)
    expect(screen.getByText('No datasets')).toBeInTheDocument()
  })

  it('should show skeleton when loading', () => {
    const { container } = render(<DatasetTable datasets={[]} isLoading={true} onPageChange={vi.fn()} />)
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })
})

// BAD: testing implementation
it('should set loading state', () => {
  const { result } = renderHook(() => useDatasets())
  expect(result.current.isLoading).toBe(true)
})
```

---

## Part 4: Security Standards

| Rule | Detail |
|---|---|
| **Passwords** | bcrypt with cost 12. Never logged, never returned in API responses. |
| **JWT secrets** | Min 256-bit random key. Stored in environment variable, not in code. |
| **SQL injection** | Use SQLAlchemy ORM or parameterised queries. Never string interpolation in SQL. |
| **XSS** | React escapes by default. Never use `dangerouslySetInnerHTML`. |
| **CORS** | Explicit whitelist of origins. No `Access-Control-Allow-Origin: *` in production. |
| **File upload** | Validate MIME type + extension server-side. Store outside web root. No direct URL access. |
| **Rate limiting** | Auth endpoints: 5 req/min. Training endpoints: 10 req/min. |
| **Input validation** | Pydantic for API. Zod for frontend forms. Never trust client data. |
| **Dependency scanning** | `pip-audit` + `npm audit` in CI pipeline. |
| **Environment variables** | `.env` never committed. `.env.example` documents required vars. |

---

## Part 5: Performance Standards

| Rule | Detail |
|---|---|
| **Database queries** | N+1 queries banned. Use SQLAlchemy `joinedload` or `selectinload`. |
| **Pagination** | Every list endpoint paginated. Default 20, max 100. |
| **EDA caching** | EDA results cached in `dataset_columns` table. Cache invalidation on dataset update. |
| **File reading** | Memory-mapped reading (`mmap`) for large files. Streaming for uploads. |
| **Asset optimisation** | Vite handles bundling and code splitting. shadcn components are tree-shakeable. |
| **Lazy loading** | Route-based code splitting via `React.lazy`. |
| **Image optimisation** | Correlation matrix rendered as CSS grid, not canvas or image. |
| **Bundle size** | Keep under 300KB gzipped. Monitor with `vite-plugin-visualizer`. |
| **Query stale time** | Set appropriate `staleTime` per query type. Lists: 30s. Detail: 5min. Job status: 0. |

---

## Part 6: Documentation Standards

| Element | Required | Location |
|---|---|---|
| **README** | Architecture overview, setup instructions, stack, license | `README.md` |
| **PRD** | Product requirements, user stories, acceptance criteria | `PRD.md` |
| **Architecture** | Clean Architecture layers, ERD, API design | `ARCHITECTURE.md` |
| **UX** | Screen flows, states, interactions | `UX.md` |
| **API** | Endpoint documentation, examples, status codes | `API.md` |
| **Milestones** | Build plan, dependencies, complexity | `MILESTONES.md` |
| **Git workflow** | Branch strategy, commit conventions | `GIT_WORKFLOW.md` |
| **Coding standards** | Style guides for all languages | `CODING_STANDARDS.md` |
| **AGENTS.md** | AI-assisted development instructions | `AGENTS.md` |
| **CHANGELOG** | Per-version release notes | `CHANGELOG.md` |
| **Docstrings (Python)** | All public functions and classes | In source |
| **JSDoc (TS)** | Complex functions and hooks | In source |

### Docstring Format (Python)

```python
def compute_stats(
    dataset_id: uuid.UUID,
    df: pd.DataFrame,
) -> list[DatasetColumn]:
    """Compute column-level statistics for a DataFrame.

    Calculates dtype, missing count/ratio, unique count, and
    numeric stats (mean, std, quartiles, skew, kurtosis).

    Args:
        dataset_id: UUID of the parent dataset.
        df: The DataFrame to analyse.

    Returns:
        List of DatasetColumn entities with computed stats.

    Raises:
        ValueError: If the DataFrame is empty.
    """
```

---

## 7. Summary: Good vs Bad

| Aspect | Good | Bad |
|---|---|---|
| Python imports | `from app.domain import Dataset` | `from ..domain import *` |
| Python error handling | Raise typed domain exception | `raise HTTPException(404)` |
| Python logging | `logger.info("event", key=val)` | `print("event")` |
| Python types | `def f(x: int) -> str:` | `def f(x):` |
| TypeScript types | `interface Props { items: T[] }` | `interface Props { items: any }` |
| React components | Early return for states | One return, crashes on null |
| React Query | `useQuery({ queryKey, queryFn })` | Custom fetch + useState |
| State management | Zustand typed store | Global `useState` soup |
| File naming | `DatasetTable.tsx` | `datasetTable.tsx` |
| CSS | Tailwind utility classes | Custom CSS classes |
| Git commits | `feat(datasets): add upload` | `fixed stuff` |
| PR descriptions | Template with checklist | "Done" |
