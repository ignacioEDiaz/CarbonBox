#!/bin/bash
# LocalStack lo ejecuta cuando está listo: crea la cola y los buckets que usa el backend.
set -euo pipefail

awslocal sqs create-queue --queue-name uploads
awslocal s3 mb s3://carbonbox-uploads
awslocal s3 mb s3://carbonbox-uploads-test
