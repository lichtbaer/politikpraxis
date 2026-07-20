"""Rate-Limiting (slowapi).

key_func nutzt client_ip (X-Real-IP von nginx), damit Limits hinter dem
Reverse-Proxy pro echtem Client greifen — nicht pro nginx-Container-IP.
"""

from slowapi import Limiter

from app.dependencies import client_ip

limiter = Limiter(key_func=client_ip)
