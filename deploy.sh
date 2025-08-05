#!/bin/bash
ng build
wrangler pages deploy dist/live-departures/browser --project-name live-departures
