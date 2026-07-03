using './main.bicep'

param location = 'eastus'
param environmentName = 'pulseagent'
param containerImage = 'pulseagent.azurecr.io/pulseagent:latest'
param appUrl = 'https://pulseagent-web.example.com'
param tz = 'America/New_York'

// Pass at deploy time — do not commit real values:
// az deployment group create ... -p postgresAdminPassword='...'
