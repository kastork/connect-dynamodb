import { DynamoDBStore } from './store';
import { Store } from 'express-session';


/**
 * Return the `DynamoDBStore` extending `connect`'s session Store.
 *
 * @param {object} connect
 * @return {Function}
 * @api public
 */

export default function connect(session: any) {
  return DynamoDBStore
}
