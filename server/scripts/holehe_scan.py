#!/usr/bin/env python3
"""
Holehe JSON bridge for AwardX email intelligence.

Runs all holehe modules and prints structured JSON to stdout.
Stealth mode (default): skips password-recovery modules that may notify the target.
"""
from __future__ import annotations

import argparse
import json
import sys

import httpx
import trio
from holehe.core import get_functions, import_submodules, launch_module


async def scan(email: str, *, no_password_recovery: bool = True, timeout: float = 10.0) -> list[dict]:
    args = argparse.Namespace(nopasswordrecovery=no_password_recovery)
    modules = import_submodules("holehe.modules")
    websites = get_functions(modules, args)
    out: list[dict] = []
    client = httpx.AsyncClient(timeout=timeout)

    async with trio.open_nursery() as nursery:
        for website in websites:
            nursery.start_soon(launch_module, website, email, client, out)

    await client.aclose()
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Holehe scan bridge")
    parser.add_argument("email", help="Email address to scan")
    parser.add_argument(
        "--password-recovery",
        action="store_true",
        help="Include password-recovery modules (may notify target)",
    )
    parser.add_argument("--timeout", type=float, default=10.0, help="HTTP timeout per request")
    args = parser.parse_args()

    async def runner() -> list[dict]:
        return await scan(
            args.email,
            no_password_recovery=not args.password_recovery,
            timeout=args.timeout,
        )

    results = trio.run(runner)

    payload = {
        "email": args.email,
        "results": results,
        "stats": {
            "totalChecked": len(results),
            "totalFound": sum(1 for r in results if r.get("exists")),
            "rateLimited": sum(1 for r in results if r.get("rateLimit")),
            "errors": sum(1 for r in results if r.get("error")),
        },
    }
    print(json.dumps(payload, default=str))


if __name__ == "__main__":
    main()
