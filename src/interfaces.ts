import AWS from 'aws-sdk';
export interface IStoreConfig {
  AWSConfigPath?: string;
  AWSRegion?: string;
  hashKey?: string;
  captureRejections?: boolean;
  prefix?: string;
  readCapacityUnits?: number | string;
  writeCapacityUnits?: number | string;
  client?: AWS.DynamoDB;
  AWSConfigJSON?: AWS.ConfigurationOptions;
  table?: string;
  reapInterval?: number;
}
