using './main.bicep'

param location = 'eastus'
param environmentName = 'newsagent'
param containerImage = 'newsagent.azurecr.io/newsagent:latest'
param appUrl = 'https://newsagent-web.example.com'
param tz = 'America/New_York'

// Required @secure param — set env var before deploy, or override on CLI:
//   PowerShell: $env:POSTGRES_ADMIN_PASSWORD = '...'
//   Bash:       export POSTGRES_ADMIN_PASSWORD='...'
//   CLI:        --parameters postgresAdminPassword='...'
param postgresAdminPassword = readEnvironmentVariable('POSTGRES_ADMIN_PASSWORD', '')
