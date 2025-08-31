#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get environment variables
const mapboxToken = process.env.MAPBOX_TOKEN;

if (!mapboxToken) {
  console.error('MAPBOX_TOKEN environment variable is required');
  process.exit(1);
}

// Create environment.prod.ts with the token
const prodEnvContent = `export const environment = {
  production: true,
  mapbox: {
    accessToken: '${mapboxToken}'
  }
};`;

// Write the production environment file
const prodEnvPath = path.join(__dirname, '../src/environments/environment.prod.ts');
fs.writeFileSync(prodEnvPath, prodEnvContent);

console.log('Production environment file updated with Mapbox token');
