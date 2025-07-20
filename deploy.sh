#!/bin/bash
ng build
wrangler pages deploy dist/location-map-app/browser --project-name mpk-location-map
