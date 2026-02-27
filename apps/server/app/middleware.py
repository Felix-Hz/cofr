"""Logging middleware for debugging"""

import time

from fastapi import Request


async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    start_time = time.time()

    print("\n" + "=" * 60)
    print(f"→ {request.method} {request.url.path}")

    if request.method == "POST" or request.method == "OPTIONS":
        body = await request.body()
        print(f"  Body: {body}")

        # Reconstruct request so FastAPI can parse it
        async def receive():
            return {"type": "http.request", "body": body}

        request._receive = receive

    print(f"  Query: {dict(request.query_params)}")
    print(f"  Origin: {request.headers.get('origin', 'N/A')}")
    print(f"  Headers: {dict(request.headers)}")

    response = await call_next(request)

    duration = time.time() - start_time
    print(f"← Response Code: {response.status_code} ({duration:.3f}s)")
    print("=" * 60 + "\n")

    return response
