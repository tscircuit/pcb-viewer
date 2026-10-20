# syntax=docker/dockerfile:1
# Build from the repository root:
# docker build -f services/return-current/container/Dockerfile .
FROM benvial/palace@sha256:f0f3a3cbbdf1ee2d8f856ddbe1f5bf4628a92ee8ab87d1e27dc33402ad9c8dda AS python-build
USER root
ARG DEBIAN_FRONTEND=noninteractive
ARG PYTHON_VERSION=3.12.10
ARG PYTHON_SHA256=07ab697474595e06f06647417d3c7fa97ded07afc1a7e4454c5639919b46eaea

# The Palace base uses Ubuntu 22.04/Python 3.10. Build a newer interpreter on
# that same ABI; copying a Debian-built Python can require newer glibc symbols.
# An optional build secret extends normal CA trust without entering image layers.
RUN --mount=type=secret,id=proxy_ca \
    set -eu; \
    cat /etc/ssl/certs/ca-certificates.crt > /tmp/build-ca.pem; \
    if [ -f /run/secrets/proxy_ca ]; then cat /run/secrets/proxy_ca >> /tmp/build-ca.pem; fi; \
    apt-get -o Acquire::https::CaInfo=/tmp/build-ca.pem update; \
    apt-get -o Acquire::https::CaInfo=/tmp/build-ca.pem install -y --no-install-recommends \
      build-essential ca-certificates curl xz-utils libssl-dev zlib1g-dev \
      libbz2-dev libreadline-dev libsqlite3-dev libffi-dev liblzma-dev; \
    curl --fail --location --cacert /tmp/build-ca.pem \
      "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz" \
      --output /tmp/python.tar.xz; \
    echo "${PYTHON_SHA256}  /tmp/python.tar.xz" | sha256sum --check -; \
    mkdir /tmp/python-src; tar -xJf /tmp/python.tar.xz -C /tmp/python-src --strip-components=1; \
    cd /tmp/python-src; \
    ./configure --prefix=/opt/return-current-python --with-ensurepip=install; \
    make -j4; make install; \
    rm -rf /tmp/python-src /tmp/python.tar.xz /tmp/build-ca.pem /var/lib/apt/lists/*

FROM oven/bun:1.3.5@sha256:e90cdbaf9ccdb3d4bd693aa335c3310a6004286a880f62f79b18f9b1312a8ec3 AS bun-runtime

FROM benvial/palace@sha256:f0f3a3cbbdf1ee2d8f856ddbe1f5bf4628a92ee8ab87d1e27dc33402ad9c8dda
USER root
ARG DEBIAN_FRONTEND=noninteractive
WORKDIR /app
# Keep final installation in one layer: the managed builder uses Docker VFS,
# where separate COPY/RUN layers duplicate every large native dependency.
RUN --mount=type=secret,id=proxy_ca \
    --mount=from=python-build,source=/opt/return-current-python,target=/mnt/python \
    --mount=from=bun-runtime,source=/usr/local/bin/bun,target=/mnt/bun \
    --mount=type=bind,source=services/return-current/container,target=/mnt/container \
    --mount=type=bind,source=scripts/return-current,target=/mnt/runner \
    set -eu; \
    cat /etc/ssl/certs/ca-certificates.crt > /tmp/build-ca.pem; \
    if [ -f /run/secrets/proxy_ca ]; then cat /run/secrets/proxy_ca >> /tmp/build-ca.pem; fi; \
    apt-get -o Acquire::https::CaInfo=/tmp/build-ca.pem update; \
    apt-get -o Acquire::https::CaInfo=/tmp/build-ca.pem install -y --no-install-recommends \
      ca-certificates libgl1 libglu1-mesa libxrender1 libxcursor1 libxft2 libxinerama1 \
      libsm6 libice6 libbz2-1.0 libreadline8 libsqlite3-0 \
      libffi8 liblzma5 libssl3 zlib1g; \
    cp -a /mnt/python /opt/return-current-python; \
    cp /mnt/bun /usr/local/bin/bun; chmod 755 /usr/local/bin/bun; \
    mkdir -p /app/scripts/return-current /app/services/return-current/container; \
    cp /mnt/container/package.json /mnt/container/bun.lock /app/; \
    cd /app; \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    bun install --production --frozen-lockfile --ignore-scripts; \
    PIP_CERT=/tmp/build-ca.pem /opt/return-current-python/bin/python3.12 -m pip install \
      --no-cache-dir --disable-pip-version-check -r /mnt/container/python-requirements.txt; \
    cp /mnt/runner/native-runner.ts /mnt/runner/protocol.ts /app/scripts/return-current/; \
    cp /mnt/container/server.ts /mnt/container/worker.ts /app/services/return-current/container/; \
    chmod 644 /app/package.json /app/bun.lock /app/scripts/return-current/*.ts \
      /app/services/return-current/container/*.ts; \
    useradd --uid 10001 --home-dir /work --no-create-home solver; \
    mkdir -p /work/jobs /work/cache; chown -R solver:solver /work; \
    rm -rf /tmp/build-ca.pem /var/lib/apt/lists/*
ENV PALACE_BIN=/opt/palace/bin/palace \
    PALACE_PYTHON=/opt/return-current-python/bin/python3.12 \
    HWLOC_COMPONENTS=-x86 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    PYTHONUNBUFFERED=1 \
    MPLCONFIGDIR=/work/cache/matplotlib \
    RETURN_CURRENT_JOB_ROOT=/work/jobs \
    PORT=8080
USER solver
EXPOSE 8080
CMD ["bun", "services/return-current/container/server.ts"]
