/*!
 * Connect - DynamoDB
 * Copyright(c) 2020 introvert.com LLC <support@introvert.com>
 * MIT Licensed
 */

import AWS from 'aws-sdk';
import { Store } from 'express-session';
import { oneDayInMilliseconds } from './constants';

export class DynamoDBStore extends Store {
  private connect: any = {};
  private options: any;

  private prefix: string;
  private hashKey: string;
  private readCapacityUnits: number;
  private writeCapacityUnits: number;
  private client: AWS.DynamoDB;
  private table: string;
  private reapInterval: number;
  private _reap: any;

  /**
  * Initialize DynamoDBStore with the given `options`.
  *
  * @param {Object} options
  * @api public
  */
  constructor(options: any = {}) {
    super(options);

    this.options = options || {};

    this.prefix = null == options.prefix ? 'sess:' : options.prefix;
    this.hashKey = null == options.hashKey ? 'id' : options.hashKey;
    this.readCapacityUnits = parseInt(options.readCapacityUnits || 5, 10);
    this.writeCapacityUnits = parseInt(options.writeCapacityUnits || 5, 10);

    if (options.client) {
      this.client = options.client;
    } else {
      if (options.AWSConfigPath) {
        AWS.config.loadFromPath(options.AWSConfigPath);
      } else if (options.AWSConfigJSON) {
        AWS.config.update(options.AWSConfigJSON);
      } else {
        const region = options.AWSRegion || 'us-east-1';
        AWS.config.update({ region });
      }
      this.client = new AWS.DynamoDB();
    }

    this.table = options.table || 'sessions';
    this.reapInterval = options.reapInterval || 0;
    if (this.reapInterval > 0) {
      this._reap = setInterval(this.reap.bind(this), this.reapInterval);
    }

    this.prepareTable();
  }

  async prepareTable() {
    try {
      const info = await this.client.describeTable(
        {
          TableName: this.table,
        }).promise();
      console.log(info)
    } catch (err) {
      await this.client.createTable(
        {
          TableName: this.table,
          AttributeDefinitions: [
            {
              AttributeName: this.hashKey,
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: this.hashKey,
              KeyType: 'HASH',
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: this.readCapacityUnits,
            WriteCapacityUnits: this.writeCapacityUnits,
          },
        }).promise();
    }

  }

  /**
   * Attempt to fetch session by the given `sid`.
   *
   * @param {String} sid
   * @param {Function} fn
   * @api public
   */
  async get(sid: string, fn: (err?: any, data?: any) => any) {

    sid = this.prefix + sid;
    const now = Math.floor(Date.now() / 1000);
    const params = {
      TableName: this.table,
      Key: {
        [this.hashKey]: {
          S: sid,
        }
      },
      ConsistentRead: true,
    };
    try {
      const result = await this.client.getItem(params).promise();
      if (!(result.Item && result.Item.sess && result.Item.sess.S))
        return fn(null);
      else if (result.Item.expires && now >= result.Item.expires) {
        return fn(null);
      } else {
        const sessStr = result.Item.sess.S.toString();
        const sess = JSON.parse(sessStr);
        sess.lastRead = new Date().getTime();
        return fn(null, sess);
      }
    }
    catch (err) {
      return fn(err)
    }
  }

  /**
   * Commit the given `sess` object associated with the given `sid`.
   *
   * @param {String} sid
   * @param {Session} sess
   * @param {Function} fn
   * @api public
   */
  async set(sid: string, currentSess: any, fn: (err?: any) => any) {
    try {
      const oldSession = await this.get(sid, (err, data) => data);
      const newSess = Object.assign({}, oldSession, currentSess);

      const data = await this.setInternal(sid, newSess);
      fn(null)
    } catch (err) {
      fn(err)
    }
  }


  async setInternal(sid: string, sess: any) {
    const expires = this.getExpiresValue(sess);
    sess = JSON.stringify(sess);
    const params = {
      TableName: this.table,
      Item: {
        [this.hashKey]: {
          S: this.prefix + sid,
        },
        expires: {
          N: JSON.stringify(expires),
        },
        type: {
          S: 'connect-session',
        },
        sess: {
          S: sess,
        },
      },
    };
    await this.client.putItem(params).promise();
  }

  /**
   * Cleans up expired sessions
   *
   * @param {Function} fn
   * @api public
   */

  async reap() {
    const now = Math.floor(Date.now() / 1000);
    const options = {
      endkey: '[' + now + ',{}]',
    };
    const params = {
      TableName: this.table,
      ScanFilter: {
        expires: {
          AttributeValueList: [
            {
              N: now.toString(),
            },
          ],
          ComparisonOperator: 'LT',
        },
      },
      AttributesToGet: [this.hashKey],
    };
    try {
      const data = await this.client.scan(params).promise()
      this.destroy(data);
    } catch (err) {
      console.log(err)
      throw err;
    }


  }

  /**
  * Destroy the session associated with the given `sid`.
  *
  * @param {String} sid
  * @param {Function} fn
  * @api public
  */
  async destroy(data: any) {

    for await (const item of data.Items) {

      if (item[this.hashKey]
      ) {
        let sid = item[this.hashKey].S;
        sid = sid.substring(this.prefix.length, sid.length);
        // destroy
      }
    }
  }

  /**
   * Touches the session row to update it's expire value.
   * @param  {String}   sid  Session id.
   * @param  {Object}   sess Session object.
   * @param  {Function} fn   Callback.
   */
  async touch(sid: string, sess: any) {
    sid = this.prefix + sid;
    const expires = this.getExpiresValue(sess);
    const params = {
      TableName: this.table,
      Key: {
        [this.hashKey]: {
          S: sid,
        }
      },
      UpdateExpression: 'set expires = :e',
      ExpressionAttributeValues: {
        ':e': {
          N: JSON.stringify(expires),
        },
      },
      ReturnValues: 'UPDATED_NEW',
    };

    await this.client.updateItem(params).promise()
  }

  /**
  * Calculates the expire value based on the configuration.
  * @param  {Object} sess Session object.
  * @return {Integer}      The expire on timestamp.
  */
  getExpiresValue(sess: any) {
    const expires =
      typeof sess.cookie.maxAge === 'number'
        ? +new Date() + sess.cookie.maxAge
        : +new Date() + oneDayInMilliseconds;
    return Math.floor(expires / 1000);
  }

  /**
  * Clear intervals
  *
  * @api public
  */
  clearInterval() {
    if (this._reap) clearInterval(this._reap);
  }

}
