param location string
param name string
param environmentId string
param containerImage string
param acrLoginServer string
param keyVaultUri string
param ingressEnabled bool
param targetPort int
@description('HTTP path for readiness probe (DB check)')
param readinessPath string = '/api/health'
@description('HTTP path for liveness probe (process up, no DB)')
param livenessPath string = '/api/health/live'
param healthPort int
param minReplicas int
param maxReplicas int
param plainEnv array
param keyVaultSecretNames array
param containerCommand array = []

var kvSecrets = [
  for secretName in keyVaultSecretNames: {
    name: toLower(secretName)
    identity: 'system'
    keyVaultUrl: '${keyVaultUri}secrets/${secretName}'
  }
]

var secretEnv = [
  for secretName in keyVaultSecretNames: {
    name: secretName == 'DATABASE-URL' ? 'DATABASE_URL' : replace(secretName, '-', '_')
    secretRef: toLower(secretName)
  }
]

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: environmentId
    configuration: {
      ingress: ingressEnabled
        ? {
            external: true
            targetPort: targetPort
            transport: 'auto'
            allowInsecure: false
          }
        : null
      secrets: kvSecrets
      registries: [
        {
          server: acrLoginServer
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'app'
          image: containerImage
          command: length(containerCommand) > 0 ? containerCommand : null
          env: concat(plainEnv, secretEnv)
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: livenessPath
                port: healthPort
              }
              initialDelaySeconds: 10
              periodSeconds: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: readinessPath
                port: healthPort
              }
              initialDelaySeconds: 5
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
      }
    }
  }
}

output principalId string = containerApp.identity.principalId
output fqdn string = ingressEnabled ? containerApp.properties.configuration.ingress.fqdn : ''
output name string = containerApp.name
