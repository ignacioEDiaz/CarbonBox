#!/bin/bash
# LocalStack lo ejecuta cuando está listo: crea las colas y los buckets que usa el backend.
set -euo pipefail

# Dead Letter Queue: SQS mueve ahí un mensaje que se entregó más de 3 veces sin borrarse
awslocal sqs create-queue --queue-name uploads-dlq
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$(awslocal sqs get-queue-url --queue-name uploads-dlq --query QueueUrl --output text)" --attribute-names QueueArn --query Attributes.QueueArn --output text)
awslocal sqs create-queue --queue-name uploads \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"}"

awslocal s3 mb s3://carbonbox-uploads
awslocal s3 mb s3://carbonbox-uploads-test
