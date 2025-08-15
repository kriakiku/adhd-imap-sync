# Builder: GoIMAPNotify
FROM golang:1-alpine AS goimapnotify-builder
ARG GOIMAPNOTIFY_REF=latest
RUN apk add --no-cache git
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    GOBIN=/out/usr/local/bin go install gitlab.com/shackra/goimapnotify@${GOIMAPNOTIFY_REF}

# Builder: fetchmail
FROM alpine:3 AS fetchmail-builder
ARG FETCHMAIL_URL="http://downloads.sourceforge.net/project/fetchmail/branch_6.5/fetchmail-6.5.4.tar.xz"
RUN apk add --no-cache build-base autoconf automake libtool openssl-dev gettext-dev curl xz
WORKDIR /tmp
RUN curl -L "${FETCHMAIL_URL}" -o fetchmail.tar.xz \
 && tar -xf fetchmail.tar.xz \
 && cd fetchmail-* \
 && ./configure --prefix=/usr --sysconfdir=/etc \
 && make -j"$(nproc)" \
 && make DESTDIR=/out install

# Runtime
FROM ghcr.io/linuxserver/baseimage-alpine:edge

# LSIO Environment
ENV TZ="UTC" \
    PUID="1000" \
    PGID="1000" \
    UMASK="022" \
    ADHD_WAKEUP_GAP="3"

# Copy binaries
COPY --from=goimapnotify-builder  /out/ /
COPY --from=fetchmail-builder     /out/ /

# Copy gettext utilities (envsubst, gettext, etc.) from builder
COPY --from=fetchmail-builder /usr/bin/envsubst /usr/bin/
COPY --from=fetchmail-builder /usr/bin/gettext* /usr/bin/

# LSIO: /config + s6 services & cont-init hooks
COPY rootfs/ /

# Configs
RUN mkdir -p /config \
 && touch /config/fetchmailrc /config/goimapnotify.yml \
 && chmod 600 /config/fetchmailrc \
 && chown -R 1000:1000 /config

VOLUME ["/config"]
