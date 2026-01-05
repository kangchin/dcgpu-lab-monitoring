#!/usr/bin/env python3
"""
Prometheus metrics aggregation server for Celery multiprocess workers.
Reads metrics from all worker processes and exposes them on a single HTTP endpoint.
"""
import os
import time
import logging
from prometheus_client import CollectorRegistry, multiprocess, generate_latest
from wsgiref.simple_server import make_server, WSGIServer
from socketserver import ThreadingMixIn

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    """Threaded WSGI server to handle multiple concurrent scrapes."""
    daemon_threads = True

def metrics_app(environ, start_response):
    """WSGI application that serves Prometheus metrics and health check."""
    path = environ.get('PATH_INFO', '/')
    
    # Health check endpoint
    if path in ['/health', '/healthz']:
        logger.debug("Health check requested")
        status = '200 OK'
        headers = [('Content-Type', 'text/plain')]
        start_response(status, headers)
        return [b'healthy']
    
    # Metrics endpoint
    try:
        start_time = time.time()
        
        logger.debug("Starting metrics aggregation")
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        
        data = generate_latest(registry)
        duration = time.time() - start_time
        
        logger.info(f"Metrics generated: {len(data)} bytes in {duration:.3f}s")
        
        status = '200 OK'
        headers = [
            ('Content-Type', 'text/plain; version=0.0.4; charset=utf-8'),
            ('Content-Length', str(len(data)))
        ]
        start_response(status, headers)
        return [data]
    
    except Exception as e:
        logger.error(f"Error generating metrics: {e}", exc_info=True)
        status = '500 Internal Server Error'
        headers = [('Content-Type', 'text/plain')]
        start_response(status, headers)
        return [f'Error: {str(e)}'.encode('utf-8')]

def run_metrics_server():
    """Run the metrics server."""
    port = int(os.environ.get('WORKER_METRICS_PORT', 9200))
    metrics_dir = os.environ.get('PROMETHEUS_MULTIPROC_DIR')
    
    logger.info("=" * 60)
    logger.info("Starting Prometheus Metrics Aggregation Server")
    logger.info("=" * 60)
    logger.info(f"Port: {port}")
    logger.info(f"Metrics directory: {metrics_dir}")
    
    # Verify metrics directory exists
    if not metrics_dir:
        logger.error("PROMETHEUS_MULTIPROC_DIR not set!")
        return
    
    if not os.path.exists(metrics_dir):
        logger.warning(f"Metrics directory does not exist: {metrics_dir}")
        logger.info("Waiting for workers to create metrics files...")
    else:
        # Count existing metric files
        try:
            db_files = [f for f in os.listdir(metrics_dir) if f.endswith('.db')]
            logger.info(f"Found {len(db_files)} existing metric files")
        except Exception as e:
            logger.warning(f"Could not list metrics directory: {e}")
    
    logger.info(f"Endpoints available:")
    logger.info(f"  - Metrics: http://0.0.0.0:{port}/metrics")
    logger.info(f"  - Health:  http://0.0.0.0:{port}/health")
    logger.info("=" * 60)
    
    server = make_server('0.0.0.0', port, metrics_app, ThreadingWSGIServer)
    logger.info(f"Server ready to accept connections")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("\nShutting down metrics server...")
        server.shutdown()
        logger.info("Server stopped")

if __name__ == '__main__':
    run_metrics_server()
