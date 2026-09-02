@echo off
echo Compiling Tracer.java...

:: Compile Tracer.java with all debug symbols enabled
javac -g Tracer.java

if %ERRORLEVEL% EQU 0 (
    echo Tracer compiled successfully!
) else (
    echo Compilation failed with error code %ERRORLEVEL%
)
pause