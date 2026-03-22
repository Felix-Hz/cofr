"""Request logging middleware"""

import logging
import time

from fastapi import Request

logger = logging.getLogger(__name__)


async def log_requests(request: Request, call_next):
    """Log all requests with timing"""
    start_time = time.time()

    logger.info("→ %s %s", request.method, request.url.path)

    if request.method in ("POST", "OPTIONS"):
        body = await request.body()
        logger.debug("  Body: %s", body)

        # Reconstruct request so FastAPI can parse it
        async def receive():
            return {"type": "http.request", "body": body}

        request._receive = receive

    logger.debug("  Query: %s", dict(request.query_params))

    response = await call_next(request)

    duration = time.time() - start_time
    logger.info(
        "← %s %s %d (%.3fs)", request.method, request.url.path, response.status_code, duration
    )

    return response
