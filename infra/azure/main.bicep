@description('Azure region for all resources')
param location string

@description('Short name prefix, e.g. newsagent')
param environmentName string

@description('Container image including tag, e.g. myacr.azurecr.io/newsagent:1.0.0')
param containerImage string

@description('Public base URL for the web app (no trailing slash)')
param appUrl string

@description('IANA timezone for the scheduler')
param tz string = 'UTC'

@secure()
@description('PostgreSQL administrator password')
param postgresAdminPassword string

param postgresAdminLogin string = 'newsadmin'
param postgresSku string = 'B_Standard_B1ms'
param postgresDbName string = 'newsagent'

var namePrefix = environmentName
var postgresServerName = '${namePrefix}-pg-${uniqueString(resourceGroup().id)}'
var acrName = replace('${namePrefix}acr${uniqueString(resourceGroup().id)}', '-', '')
var keyVaultName = '${namePrefix}-kv-${take(uniqueString(resourceGroup().id), 6)}'

module logAnalytics 'modules/logAnalytics.bicep' = {
  name: 'logAnalytics'
  params: {
    location: location
    name: '${namePrefix}-logs'
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    location: location
    name: acrName
  }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: location
    serverName: postgresServerName
    adminLogin: postgresAdminLogin
    adminPassword: postgresAdminPassword
    databaseName: postgresDbName
    skuName: postgresSku
  }
}

module keyVault 'modules/keyVault.bicep' = {
  name: 'keyVault'
  params: {
    location: location
    name: keyVaultName
    databaseUrl: 'postgresql://${postgresAdminLogin}:${postgresAdminPassword}@${postgres.outputs.fqdn}:5432/${postgresDbName}?sslmode=require'
  }
}

module containerAppsEnv 'modules/containerAppsEnv.bicep' = {
  name: 'containerAppsEnv'
  params: {
    location: location
    name: '${namePrefix}-cae'
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: logAnalytics.outputs.sharedKey
  }
}

module webApp 'modules/containerApp.bicep' = {
  name: 'webApp'
  params: {
    location: location
    name: '${namePrefix}-web'
    environmentId: containerAppsEnv.outputs.environmentId
    containerImage: containerImage
    acrLoginServer: acr.outputs.loginServer
    keyVaultUri: keyVault.outputs.vaultUri
    ingressEnabled: true
    targetPort: 3000
    healthPath: '/api/health'
    healthPort: 3000
    minReplicas: 1
    maxReplicas: 3
    plainEnv: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'PORT', value: '3000' }
      { name: 'APP_URL', value: appUrl }
      { name: 'TZ', value: tz }
      { name: 'LLM_PROVIDER', value: 'openrouter' }
      { name: 'EMAIL_PROVIDER', value: 'smtp' }
    ]
    keyVaultSecretNames: [
      'DATABASE-URL'
    ]
  }
}

module schedulerApp 'modules/containerApp.bicep' = {
  name: 'schedulerApp'
  params: {
    location: location
    name: '${namePrefix}-scheduler'
    environmentId: containerAppsEnv.outputs.environmentId
    containerImage: containerImage
    containerCommand: [
      'npm'
      'run'
      'scheduler'
    ]
    acrLoginServer: acr.outputs.loginServer
    keyVaultUri: keyVault.outputs.vaultUri
    ingressEnabled: false
    targetPort: 3001
    healthPath: '/health'
    healthPort: 3001
    minReplicas: 1
    maxReplicas: 1
    plainEnv: [
      { name: 'NODE_ENV', value: 'production' }
      { name: 'TZ', value: tz }
      { name: 'SCHEDULER_HEALTH_PORT', value: '3001' }
      { name: 'LLM_PROVIDER', value: 'openrouter' }
      { name: 'EMAIL_PROVIDER', value: 'smtp' }
    ]
    keyVaultSecretNames: [
      'DATABASE-URL'
    ]
  }
}

resource acrResource 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: acr.outputs.name
}

resource keyVaultResource 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVault.outputs.name
}

resource acrPullWeb 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acrResource
  name: guid(acrResource.id, webApp.outputs.principalId, 'acrPullWeb')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: webApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource acrPullScheduler 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acrResource
  name: guid(acrResource.id, schedulerApp.outputs.principalId, 'acrPullScheduler')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: schedulerApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource kvSecretsWebRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVaultResource
  name: guid(keyVaultResource.id, webApp.outputs.principalId, 'kvSecretsWeb')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: webApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

resource kvSecretsSchedulerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVaultResource
  name: guid(keyVaultResource.id, schedulerApp.outputs.principalId, 'kvSecretsScheduler')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: schedulerApp.outputs.principalId
    principalType: 'ServicePrincipal'
  }
}

output acrLoginServer string = acr.outputs.loginServer
output acrName string = acr.outputs.name
output postgresFqdn string = postgres.outputs.fqdn
output keyVaultName string = keyVault.outputs.name
output keyVaultUri string = keyVault.outputs.vaultUri
output webAppFqdn string = webApp.outputs.fqdn
output webAppName string = webApp.outputs.name
output schedulerAppName string = schedulerApp.outputs.name
output containerAppsEnvironmentName string = containerAppsEnv.outputs.name
