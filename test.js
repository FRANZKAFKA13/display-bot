const UserState = {
    storage:
     CosmosDbStorage = {
       settings:
        { serviceEndpoint: 'https://ra-database.documents.azure.com:443/',
          authKey: 'cgtIrx2LR8FolaA5zOTzmRAWHRoiCKqoUEfAuDVdYTz6jOF36b6uM3HPT5EYIP5PPr9P2oAX5wGqrQd5TMGCng==',
          databaseId: 'bot-cosmos-sql-db',
          collectionId: 'bot-storage' },
       client:
        DocumentClient = {
          urlConnection: 'https://ra-database.documents.azure.com:443/',
          masterKey: 'cgtIrx2LR8FolaA5zOTzmRAWHRoiCKqoUEfAuDVdYTz6jOF36b6uM3HPT5EYIP5PPr9P2oAX5wGqrQd5TMGCng==',
          resourceTokens: undefined,
          connectionPolicy: [Object],
          consistencyLevel: undefined,
          defaultHeaders: [Object],
          defaultUrlParams: '',
          queryCompatibilityMode: 0,
          partitionResolvers: {},
          partitionKeyDefinitionCache: [Object],
          _globalEndpointManager: [Object],
          sessionContainer: [Object],
          requestAgent: [Object] },
       databaseCreationRequestOption: undefined,
       documentCollectionCreationRequestOption: undefined,
        }
    }

    console.log(UserState.storage.settings);