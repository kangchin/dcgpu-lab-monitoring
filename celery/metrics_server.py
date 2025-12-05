from prometheus_client import CollectorRegistry, multiprocess, generate_latest, CONTENT_TYPE_LATEST
from wsgiref.simple_server import make_server
import os


def metrics_app(environ, start_response):
    registry = CollectorRegistry()
    # Register multiprocess collector which reads files from PROMETHEUS_MULTIPROC_DIR
    multiprocess.MultiProcessCollector(registry)
    output = generate_latest(registry)
    start_response('200 OK', [('Content-Type', CONTENT_TYPE_LATEST)])
    return [output]


def run_server(host='0.0.0.0', port=9200):
    # Ensure PROMETHEUS_MULTIPROC_DIR is set
    mp_dir = os.environ.get('PROMETHEUS_MULTIPROC_DIR')
    if not mp_dir:
        raise RuntimeError('PROMETHEUS_MULTIPROC_DIR must be set')

    print(f"Starting metrics server on {host}:{port}, reading multiproc dir: {mp_dir}")
    httpd = make_server(host, port, metrics_app)
    httpd.serve_forever()


if __name__ == '__main__':
    port = int(os.environ.get('WORKER_METRICS_PORT', '9200'))
    run_server(port=port)
