from fastapi import APIRouter

from app.api.v1.endpoints.datasets import router as datasets_router
from app.api.v1.endpoints.eda import router as eda_router
from app.api.v1.endpoints.pipelines import router as pipelines_router
from app.api.v1.endpoints.training import router as training_router

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(datasets_router, prefix="/datasets", tags=["Datasets"])
api_v1_router.include_router(eda_router, prefix="/datasets", tags=["EDA"])
api_v1_router.include_router(pipelines_router, prefix="/pipelines", tags=["Pipelines"])
api_v1_router.include_router(training_router, prefix="/training", tags=["Training"])
