# Data Contract between the backend and the frontend for the code tracing feature. #
from pydantic import BaseModel
from typing import List, Dict, Any,Optional


# the incoming request from the frontend to the backend for code tracing
# the input is a java string
class CodeRequest(BaseModel):
    code: str
    language: Optional[str] = "java"


# the response for each step of the code tracing
class TraceStep(BaseModel):
    step: int
    line: int
    locals: Dict[str, Any]
    callStack: List[str]


# the outgoing response from the backend to the frontend for code tracing
# the output is a list of TraceStep objects, one for each step of the code tracing
class TraceResponse(BaseModel):
    status: str
    trace: List[TraceStep]
    error: Optional[str] = None
