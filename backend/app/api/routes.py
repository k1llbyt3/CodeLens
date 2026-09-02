# Defines the various API endpoints #

from fastapi import APIRouter
from app.models.schemas import CodeRequest, TraceResponse
from app.services import file_manager, runner

router = APIRouter()


@router.post("/trace", response_model=TraceResponse)
async def generate_trace(request: CodeRequest):
    file_path, class_name = file_manager.write_to_sandbox(request.code)

    compile_status = runner.compile_java(file_path)
    if not compile_status.get("success"):
        return TraceResponse(
            status="error",
            trace=[],
            error=compile_status.get("error") or "Compilation failed",
        )

    trace_result = runner.execute_jdi_tracer(class_name)

    if trace_result.get("error"):
        return TraceResponse(
            status="error",
            trace=[],
            error=trace_result.get("error"),
        )

    return TraceResponse(
        status="success", trace=trace_result.get("trace", [])
    )
