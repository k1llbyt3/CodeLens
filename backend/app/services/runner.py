# Runner service for compiling and executing Java code with JDI tracer. #
import os
import subprocess, json


# compiles the program and returns the result of the compilation
def compile_java(file_path: str):
    result = subprocess.run(
        ["javac", "-g", file_path], capture_output=True, text=True
    )
    # checks if the compilation was successful or not and returns the result accordingly
    if result.returncode != 0:
        return {"success": False, "error": result.stderr or "Compilation error"}
    return {"success": True, "error": None}


# execute the jdi tracer and returns the result of the execution
def execute_jdi_tracer(class_name: str):
    result = subprocess.run(
        ["java", "-cp", "javatracer;sandbox", "Tracer", class_name],
        capture_output=True,
        text=True,
    )
    # checks if the execution was successful or not and returns the result accordingly
    if result.returncode != 0:
        return {"error": result.stderr or "Execution error", "trace": []}
    # returns the trace result as a list of TraceStep objects if the execution was successful
    try:
        trace_data = json.loads(result.stdout)
        return {"error": None, "trace": trace_data}
    except json.JSONDecodeError:
        return {
            "error": "Tracer failed to output valid JSON. Output was: "
            + result.stdout,
            "trace": [],
        }
