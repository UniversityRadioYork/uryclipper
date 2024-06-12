#!/usr/bin/env bash

IMAGE="evergiven.ury.york.ac.uk:5001/uryclipper"
CONTAINER="uryclipper"
PROJECTDIR="/opt/uryclipper"
LOGDIR="/mnt/logs/"
PORT=5001
DATE=$(date +%s)

docker build -t $IMAGE:$DATE .
docker push $IMAGE:$DATE
docker service update --image $IMAGE:$DATE uryclipper