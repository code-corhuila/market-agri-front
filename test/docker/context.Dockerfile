# Copies the build context as Docker receives it, after .dockerignore, so test/docker/image.sh can
# look at it. FROM scratch: nothing is pulled.
FROM scratch
COPY . /
