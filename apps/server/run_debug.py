#!/usr/bin/env python3
"""
Debug runner for Cofr API
Run with: uv run python run_debug.py
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=5784,
        reload=True,
        log_level="debug",
    )
