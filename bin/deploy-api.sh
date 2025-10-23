#!/bin/bash

gcloud run deploy avn-kafka-loadtest-api \
    --source . \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --project=avn-sandbox-475914 \
    --concurrency=2 \
    --max-instances=25 \
    --timeout="60m" \
    --memory=1Gi \