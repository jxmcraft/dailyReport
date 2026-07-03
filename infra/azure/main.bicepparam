using './main.bicep'

param location = 'eastus'
param environmentName = 'newsagent'
param containerImage = 'newsagent.azurecr.io/newsagent:latest'
param appUrl = 'https://newsagent-web.example.com'
param tz = 'America/New_York'

// Pass at deploy time — do not commit real values:
// az deployment group create ... -p postgresAdminPassword='...'
