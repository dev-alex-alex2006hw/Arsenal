'use strict'; // eslint-disable-line strict

const assert = require('assert');
const Delimiter =
    require('../../../../lib/algos/list/delimiter').Delimiter;
const Werelogs = require('werelogs').Logger;
const logger = new Werelogs('listTest');
const performListing = require('../../../utils/performListing');

class Test {
    constructor(name, input, output, filter) {
        this.name = name;
        this.input = input;
        this.output = output;
        this.filter = filter || this._defaultFilter;
    }

    _defaultFilter() {
        return true;
    }
}

describe('Delimiter listing algorithm', () => {
    const value = {
        ETag: undefined,
        EventualStorageBucket: undefined,
        Initiated: undefined,
        Initiator: undefined,
        LastModified: undefined,
        Owner: {
            DisplayName: undefined,
            ID: undefined,
        },
        Size: undefined,
        StorageClass: undefined,
        creationDate: undefined,
        partLocations: undefined,
    };
    const files = [
        '/notes/spring/1.txt',
        '/notes/spring/2.txt',
        '/notes/spring/march/1.txt',
        '/notes/summer/1.txt',
        '/notes/summer/2.txt',
        '/notes/summer/august/1.txt',
        '/notes/year.txt',
        '/notes/yore.rs',
        '/notes/zaphod/Beeblebrox.txt',
        '/Pâtisserie=中文-español-English',
    ];
    const data = files.map(item => ({ key: item, value: '{}' }));
    const receivedData = files.map(item => ({ key: item, value }));
    const tests = [
        new Test('all elements', {}, {
            Contents: receivedData,
            CommonPrefixes: [],
            Delimiter: undefined,
            IsTruncated: false,
            NextMarker: undefined,
        }),
        new Test('with valid marker', {
            gt: '/notes/summer/1.txt',
        }, {
            Contents: [
                receivedData[4],
                receivedData[5],
                receivedData[6],
                receivedData[7],
                receivedData[8],
            ],
            CommonPrefixes: [],
            Delimiter: undefined,
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.gt),
        new Test('with bad marker', {
            gt: 'zzzz',
            delimiter: '/',
        }, {
            Contents: [],
            CommonPrefixes: [],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.gt),
        new Test('with prefix', {
            start: '/notes/summer/',
            lt: '/notes/summer0',
            delimiter: '/',
        }, {
            Contents: receivedData.slice(3, 5),
            CommonPrefixes: ['/notes/summer/august/'],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.start && e.key < input.lt),
        new Test('with bad prefix', {
            start: 'zzzy',
            lt: 'zzzz',
            delimiter: '/',
        }, {
            Contents: [],
            CommonPrefixes: [],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.start && e.key < input.lt),
        new Test('with makKeys', {
            maxKeys: 3,
        }, {
            Contents: receivedData.slice(0, 3),
            CommonPrefixes: [],
            Delimiter: undefined,
            IsTruncated: true,
            NextMarker: '/notes/spring/march/1.txt',
        }),
        new Test('with big makKeys', {
            maxKeys: 15000,
        }, {
            Contents: receivedData,
            CommonPrefixes: [],
            Delimiter: undefined,
            IsTruncated: false,
            NextMarker: undefined,
        }),
        new Test('with delimiter', {
            delimiter: '/',
        }, {
            Contents: [],
            CommonPrefixes: ['/'],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }),
        new Test('with long delimiter', {
            delimiter: '/notes/summer',
        }, {
            Contents: [
                receivedData[0],
                receivedData[1],
                receivedData[2],
                receivedData[6],
                receivedData[7],
                receivedData[8],
                receivedData[9],
            ],
            CommonPrefixes: ['/notes/summer'],
            Delimiter: '/notes/summer',
            IsTruncated: false,
            NextMarker: undefined,
        }),
        new Test('with delimiter and prefix', {
            delimiter: '/',
            start: '/notes/',
            lt: '/notes0',
        }, {
            Contents: [
                receivedData[6],
                receivedData[7],
            ],
            CommonPrefixes: [
                '/notes/spring/',
                '/notes/summer/',
                '/notes/zaphod/',
            ],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.start && e.key < input.lt),
        new Test('delimiter and prefix (related to #147)', {
            delimiter: '/',
            start: '/notes/',
        }, {
            Contents: [
                receivedData[6],
                receivedData[7],
                receivedData[9],
            ],
            CommonPrefixes: [
                '/notes/spring/',
                '/notes/summer/',
                '/notes/zaphod/',
            ],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }),
        new Test('delimiter, prefix and marker (related to #147)', {
            delimiter: '/',
            start: '/notes/',
            gt: '/notes/year.txt',
        }, {
            Contents: [
                receivedData[7],
            ],
            CommonPrefixes: [
                '/notes/zaphod/',
            ],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.gt),
        new Test('all parameters 1/3', {
            delimiter: '/',
            start: '/notes/',
            gt: '/notes/',
            maxKeys: 1,
        }, {
            Contents: [],
            CommonPrefixes: ['/notes/spring/'],
            Delimiter: '/',
            IsTruncated: true,
            NextMarker: '/notes/spring/',
        }, (e, input) => e.key > input.gt),

        new Test('all parameters 2/3', {
            delimiter: '/',
            start: '/notes/', // prefix
            gt: '/notes/spring/',
            maxKeys: 1,
        }, {
            Contents: [],
            CommonPrefixes: ['/notes/summer/'],
            Delimiter: '/',
            IsTruncated: true,
            NextMarker: '/notes/summer/',
        }, (e, input) => e.key > input.gt),

        new Test('all parameters 3/3', {
            delimiter: '/',
            start: '/notes/',
            gt: '/notes/yore.rs',
            maxKeys: 1,
        }, {
            Contents: [],
            CommonPrefixes: ['/notes/zaphod/'],
            Delimiter: '/',
            IsTruncated: false,
            NextMarker: undefined,
        }, (e, input) => e.key > input.gt),
    ];
    tests.forEach(test => {
        it(`Should list ${test.name}`, done => {
            // Simulate skip scan done by LevelDB
            const d = data.filter(e => test.filter(e, test.input));
            const res = performListing(d, Delimiter, test.input, logger);
            assert.deepStrictEqual(res, test.output);
            done();
        });
    });
});
