import fs from 'fs';
import AWS from 'aws-sdk';
import session from 'express-session';
import connect from '../index';
const DynamoDBStore = connect({ session: session });

let client: any;

if (config) {
    client = new AWS.DynamoDB(JSON.parse(config));
}
else if (process.env.AWS_CONFIG_JSON) {
    var config = JSON.parse(process.env.AWS_CONFIG_JSON);
    client = new AWS.DynamoDB(config);
}

describe('DynamoDBStore', function () {

    describe('Setting', function () {
        it('should store data correctly', async () => {
            var store = new DynamoDBStore({
                client,
                table: 'sessions-test'
            });

            await store.set('123', {
                cookie: {
                    maxAge: 2000
                },
                name: 'tj'
            }, (err) => {
                expect(err).toEqual(null)
            });
        });

    });
    describe('Getting', function () {

        beforeAll(async () => {
            var store = new DynamoDBStore({
                client,
                table: 'sessions-test'
            });
            await store.set('1234', {
                cookie: {
                    maxAge: 2000
                },
                name: 'tj'
            }, jest.fn());
        });


        it('should get data correctly', async () => {
            var store = new DynamoDBStore({
                client,
                table: 'sessions-test'
            });
            await store.get('1234', (err, res) => {
                if (err) throw err;
                expect(res.cookie).toEqual({
                    maxAge: 2000
                });
                expect(res.name).toEqual('tj');

            });
        });

        // it('does not crash on invalid session object', function (done) {
        //     var store = new DynamoDBStore({
        //         client,
        //         table: 'sessions-test'
        //     });

        //     sandbox.stub(store.client, 'getItem').callsArgWith(1, null, {
        //         Item: {}
        //     });

        //     store.get('9876', function (err, res) {
        //         if (err) throw err;
        //         should.not.exist(res);

        //         done();
        //     });
        // });

    });
    // describe('Touching', function () {
    //     var sess = {
    //         cookie: {
    //             maxAge: 2000
    //         },
    //         name: 'tj'
    //     };
    //     var maxAge = null;
    //     before(function (done) {
    //         var store = new DynamoDBStore({
    //             client,
    //             table: 'sessions-test'
    //         });

    //         maxAge = (Math.floor((Date.now() + 2000) / 1000));
    //         store.set('1234', sess, done);
    //     });

    //     it('should touch data correctly', function (done) {
    //         this.timeout(4000);
    //         var store = new DynamoDBStore({
    //             client,
    //             table: 'sessions-test'
    //         });
    //         setTimeout(function () {
    //             store.touch('1234', sess, function (err, res) {
    //                 if (err) throw err;
    //                 var expires = res.Attributes.expires.N;
    //                 expires.should.be.above(maxAge);
    //                 (expires - maxAge).should.be.aboveOrEqual(1);
    //                 done();
    //             });
    //         }, 1510);
    //     });

    // });
    // describe('Destroying', function () {
    //     before(function (done) {
    //         var store = new DynamoDBStore({
    //             client,
    //             table: 'sessions-test'
    //         });
    //         store.set('12345', {
    //             cookie: {
    //                 maxAge: 2000
    //             },
    //             name: 'tj'
    //         }, done);
    //     });

    //     it('should destroy data correctly', function (done) {
    //         var store = new DynamoDBStore({
    //             client,
    //             table: 'sessions-test'
    //         });
    //         store.destroy('12345', function (err, res) {
    //             if (err) throw err;

    //             store.get('12345', function (err, res) {
    //                 if (err) throw err;
    //                 should.not.exist(res);

    //                 done();
    //             });
    //         });
    //     });

    // });
    // describe('Reaping', function () {
    //     before(function (done) {
    //         var store = new DynamoDBStore({
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

    //     it('should reap data correctly', function (done) {
    //         this.timeout(5000); // increased timeout for local dynamo
    //         var store = new DynamoDBStore({
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
