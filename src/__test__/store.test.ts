import session from 'express-session';
import connect from '../index';
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";

const DynamoDBStore = connect({session: session});

const client = new DynamoDBClient({
  endpoint: "http://localhost:8000", region: 'us-east-1'
})

const store = new DynamoDBStore({
  client,
  table: 'sessions-test',
  ttl: 5000
});

describe('DynamoDBStore', function () {

  describe('Setting', function () {
    it('should store data correctly', async () => {

      await store.set('123', {
        cookie: {
          maxAge: 2000
        },
        name: 'tj'
      }, (err) => {
        expect(err).toEqual(null)
      });
    });

    it('should set ttl value ', async () => {
      const now = Math.floor(new Date().getTime() / 1000);

      await store.set('789', {
        cookie: {
          maxAge: 2000
        },
        name: 'test'
      }, (err) => {
        expect(err).toEqual(null)
      });
      const sess = await store.get('789', (err, data) => data);
      expect(sess.__ttl__).toBeGreaterThanOrEqual(now);
      expect(sess.__ttl__).toBeLessThanOrEqual(now + 5000)
    });


  });
  describe('Getting', function () {

    beforeAll(async () => {
      await store.set('1234', {
        cookie: {
          maxAge: 2000
        },
        name: 'tj'
      }, jest.fn());
    });


    it('should get data correctly', async () => {

      await store.get('1234', (err, res) => {
        if (err) throw err;
        expect(res.cookie).toEqual({
          maxAge: 2000
        });
        expect(res.name).toEqual('tj');

      });
    });

    it('does not crash on invalid session object', async () => {

      await store.get('error-session', (err, res) => {
        if (err) throw err;
        expect(res).toEqual(undefined)
      });
    });

  });
  describe('Touching', function () {
    const sess = {
      cookie: {
        maxAge: 2000
      },
      name: 'tj'
    };
    let maxAge = 0;
    beforeEach(async () => {

      maxAge = (Math.floor((Date.now() + 2000) / 1000));
      await store.set('1234', sess, jest.fn());
    });

    it('should touch data correctly', (done) => {
      setTimeout(() => {
        // express-session uses callback instead of promise
        // @see https://github.com/expressjs/session#storetouchsid-session-callback
        store.touch('1234', sess, (err, res) => {
          expect(err).toBeNull();
          const expires = +res.Attributes.expires.N;
          expect(expires).toBeGreaterThan(maxAge);
          done();
        });
      }, 2000);
    });

    it('should also support promise for backwards compatibility', async () => {
      await new Promise(r => setTimeout(r, 2000));
      const res: any = await store.touch('1234', sess);
      const expires = +res.Attributes.expires.N;
      expect(expires).toBeGreaterThan(maxAge);
    });

  });

  describe('Destroying', function () {
    beforeAll(async () => {
      await store.set('12345', {
        cookie: {
          maxAge: 2000
        },
        name: 'tj'
      }, jest.fn());
    });

    it('should destroy data correctly', async () => {
      const store = new DynamoDBStore({
        client,
        table: 'sessions-test'
      });
      const test = await store.get('12345', (err, res) => res);
      expect(test).not.toEqual(null);

      await store.destroy('12345');

      const again = await store.get('12345', (err, res) => res);
      expect(again).toBe(undefined);
    });

  });
  // describe('Reaping', function () {
  //     before(async() => {
  //         const store = new DynamoDBStore({
  //             client,
  //             table: 'sessions-test'
  //         });
  //         store.set('123456', {
  //             cookie: {
  //                 maxAge: -20000
  //             },
  //             name: 'tj'
  //         }, done);
  //     });

  //     it('should reap data correctly', async() => {
  //         this.timeout(5000); // increased timeout for local dynamo
  //         const store = new DynamoDBStore({
  //             client,
  //             table: 'sessions-test'
  //         });
  //         store.reap(function (err, res) {
  //             if (err) throw err;

  //             store.get('123456', function (err, res) {
  //                 if (err) throw err;
  //                 should.not.exist(res);

  //                 done();
  //             });
  //         });
  //     });

  // });
});
