FROM python:3.10-slim-bullseye

WORKDIR /app

# Force HTTPS for Debian repos
RUN sed -i 's|http://|https://|g' /etc/apt/sources.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends ipmitool && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["celery", "-A", "celery_app", "worker", "-B", "--loglevel=INFO"]


RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --upgrade at-scale-python-api \
      --extra-index-url https://mkmartifactory.amd.com/artifactory/api/pypi/hw-orc3pypi-prod-local/simple \
      --trusted-host mkmartifactory.amd.com


COPY docker_patches/platform.py /tmp/platform.py

RUN python - <<'PY'
import importlib, pathlib, shutil

# Import the exact module we want to patch
mod = importlib.import_module("ats_models.pydantic.system.platform")
target = pathlib.Path(mod.__file__).resolve()

src = pathlib.Path("/tmp/platform.py").resolve()
print("Patching:", target)
print("Using   :", src)

# Backup original for debugging
bak = target.with_suffix(target.suffix + ".bak")
shutil.copy2(target, bak)

# Overwrite
shutil.copy2(src, target)

# Sanity check: import again & ensure it compiles
importlib.invalidate_caches()
importlib.reload(mod)

print("Patch OK. Backup at:", bak)
PY

# --------------------------------------------------------------------
# Patch ats_models.pydantic.system (__init__.py) to tolerate utilization_* = None
# --------------------------------------------------------------------

COPY docker_patches/system___init__.py /tmp/system___init__.py

RUN python - <<'PY'
import importlib, pathlib, shutil

# Import the exact module we want to patch
mod = importlib.import_module("ats_models.pydantic.system")
target = pathlib.Path(mod.__file__).resolve()

src = pathlib.Path("/tmp/system___init__.py").resolve()
print("Patching:", target)
print("Using   :", src)

# Backup original for debugging
bak = target.with_suffix(target.suffix + ".bak")
shutil.copy2(target, bak)

# Overwrite (whole file)
shutil.copy2(src, target)

# Sanity check: import again & ensure it compiles
importlib.invalidate_caches()
importlib.reload(mod)

# Extra sanity check: ensure the patched fields accept None
SystemState = getattr(mod, "SystemState")
_ = SystemState(
    id="x",
    date_create=__import__("datetime").datetime.utcnow(),
    disable_return_online_time=__import__("datetime").datetime.utcnow(),
    maas_ingressed=False,
    date_reimaged=__import__("datetime").datetime.utcnow(),
    date_last_job_complete=__import__("datetime").datetime.utcnow(),
    utilization_24hrs=None,
    utilization_7d=None,
)

print("Patch OK. Backup at:", bak)
PY


