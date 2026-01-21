#!/usr/bin/env python3
"""
UDP -> HTTP bridge for SV sniffer JSON packets.
Listens UDP on SV_UDP_HOST:SV_UDP_PORT and forwards incoming JSON to BACKEND_URL (POST /api/sv by default).

Configurable via environment variables or .env file:
- SV_UDP_HOST (default 0.0.0.0)
- SV_UDP_PORT (default 5000)
- BACKEND_URL (default http://backend:4000/api/sv)
- LOG_LEVEL
"""
import os
import socket
import json
import time
import requests
import backoff
from dotenv import load_dotenv
import logging

load_dotenv()

SV_UDP_HOST = os.getenv('SV_UDP_HOST', '0.0.0.0')
SV_UDP_PORT = int(os.getenv('SV_UDP_PORT', '5000'))
BACKEND_URL = os.getenv('BACKEND_URL', 'http://backend:4000/api/sv')
BUFFER_SIZE = int(os.getenv('BUFFER_SIZE', '65536'))

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(level=getattr(logging, LOG_LEVEL.upper(), logging.INFO), format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('sv-bridge')

# Use a requests session for connection pooling
session = requests.Session()

@backoff.on_exception(backoff.expo, requests.RequestException, max_tries=5, factor=1)
def post_payload(payload: dict):
    """Post JSON payload to backend with retries."""
    headers = {'Content-Type': 'application/json'}
    r = session.post(BACKEND_URL, json=payload, headers=headers, timeout=5)
    r.raise_for_status()
    return r


def handle_packet(data: bytes, addr):
    """Try to parse data as JSON and forward a *normalized* payload.

    The normalized payload will contain only a timestamp (`timestamp_ms`) and
    `values` (either a list or a dict depending on svID). We branch based on
    `svID` to handle different formats. For `OPAL_RT_SIM_01` we expect three
    values in order: voltage, current, power.
    """
    text = None
    try:
        text = data.decode('utf-8', errors='ignore').strip('\x00\n\r ')
        # if empty skip
        if not text:
            logger.debug('Empty packet from %s', addr)
            return
        # Try to parse
        payload = json.loads(text)
    except json.JSONDecodeError:
        # Not valid JSON: wrap raw text (we keep legacy behavior)
        logger.warning('Received non-JSON packet from %s; wrapping into JSON', addr)
        payload = {'raw': text, 'from': addr[0], 'port': addr[1], 'received_at': int(time.time()*1000)}
    except Exception as e:
        logger.exception('Failed to handle packet from %s: %s', addr, e)
        return

    # Normalize payload: keep only timestamp and values, branch by svID
    sv_id = payload.get('svID') if isinstance(payload, dict) else None
    # Prefer explicit timestamp field if present, fallback to received_at or now
    timestamp_ms = None
    if isinstance(payload, dict):
        timestamp_ms = payload.get('timestamp_ms') or payload.get('received_at') or int(time.time()*1000)
    else:
        timestamp_ms = int(time.time()*1000)

    normalized = None

    # Case 1: OPAL_RT_SIM_01 -> expects [voltage, current, power]
    if sv_id == '4000':
        vals = payload.get('values') if isinstance(payload, dict) else None
        if isinstance(vals, (list, tuple)) and len(vals) >= 3:
            normalized = {
                'timestamp_ms': timestamp_ms,
                'values': {
                    'voltage': vals[0],
                    'current': vals[1],
                    'power': vals[2],
                }
            }
        else:
            logger.warning('SV %s payload does not contain expected 3 values; forwarding raw values', sv_id)
            normalized = {'timestamp_ms': timestamp_ms, 'values': vals}

    # Case 2: placeholder for another svID
    elif sv_id == 'OPAL_RT_OTHER_01':
        # TODO: implement parsing for OPAL_RT_OTHER_01
        # Example skeleton: map payload['values'] -> {'x': ..., 'y': ...}
        vals = payload.get('values') if isinstance(payload, dict) else None
        normalized = {'timestamp_ms': timestamp_ms, 'values': vals}  # placeholder

    # Case 3: placeholder for a third svID
    elif sv_id == 'OPAL_RT_OTHER_02':
        # TODO: implement parsing for OPAL_RT_OTHER_02
        vals = payload.get('values') if isinstance(payload, dict) else None
        normalized = {'timestamp_ms': timestamp_ms, 'values': vals}  # placeholder

    else:
        # Unknown svID: default to timestamp + values if available
        vals = payload.get('values') if isinstance(payload, dict) else None
        normalized = {'timestamp_ms': timestamp_ms, 'values': vals}

    logger.info('Forwarding normalized payload from %s to %s: %s', addr, BACKEND_URL, normalized)
    try:
        post_payload(normalized)
        logger.debug('Forwarded successfully')
    except Exception as e:
        logger.exception('Failed to post payload to backend: %s', e)


def run_udp_server():
    logger.info('Starting UDP server on %s:%d', SV_UDP_HOST, SV_UDP_PORT)
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    # Allow reuse
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind((SV_UDP_HOST, SV_UDP_PORT))
    except Exception as e:
        logger.exception('Failed to bind UDP socket: %s', e)
        raise

    try:
        while True:
            data, addr = sock.recvfrom(BUFFER_SIZE)
            logger.debug('Packet received from %s: %d bytes', addr, len(data))
            handle_packet(data, addr)
    except KeyboardInterrupt:
        logger.info('Shutting down UDP server (KeyboardInterrupt)')
    except Exception as e:
        logger.exception('UDP server error: %s', e)
    finally:
        sock.close()


if __name__ == '__main__':
    logger.info('SV UDP -> HTTP bridge starting')
    logger.info('Configuration: host=%s port=%s backend=%s', SV_UDP_HOST, SV_UDP_PORT, BACKEND_URL)
    run_udp_server()
