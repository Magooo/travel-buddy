@echo off
echo Starting Travel Document Processor...
echo.

echo [1/2] Processing Documents (PDFs/Emails)...
python ingest_docs_v2.py
if %ERRORLEVEL% NEQ 0 (
    echo Error in processing documents.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Ingesting to Cloud (Supabase)...
python ingest_to_supabase.py
if %ERRORLEVEL% NEQ 0 (
    echo Error in ingestion to Supabase.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo SUCCESS! Your trip data has been updated.
echo Refresh your web app to see the changes.
pause
