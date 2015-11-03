import protobuf from 'protobufjs';
import crypto from 'crypto';

const VERSION = 0x46;
const protoFilePath = __dirname + '/kinetic.proto';
const buildName = 'com.seagate.kinetic.proto';

/**
 * Represents the Kinetic Protocol Data Structure.
 * @constructor
 */
class Kinetic {
    constructor() {
        this._version = VERSION;
        this.logs = {
            UTILIZATIONS: 0,
            TEMPERATURES: 1,
            CAPACITIES: 2,
            CONFIGURATION: 3,
            STATISTICS: 4,
            MESSAGES: 5,
            LIMITS: 6,
            DEVICE: 7,
        };
        this.op = {
            PUT: 4,
            PUT_RESPONSE: 3,
            GET: 2,
            GET_RESPONSE: 1,
            NOOP: 30,
            NOOP_RESPONSE: 29,
            DELETE: 6,
            DELETE_RESPONSE: 5,
            SET_CLUSTER_VERSION: 22,
            SETUP_RESPONSE: 21,
            FLUSH: 32,
            FLUSH_RESPONSE: 31,
            GETLOG: 24,
            GETLOG_RESPONSE: 23,
        };
        this.errors = {
            INVALID_STATUS_CODE: -1,
            NOT_ATTEMPTED: 0,
            SUCCESS: 1,
            HMAC_FAILURE: 2,
            NOT_AUTHORIZED: 3,
            VERSION_FAILURE: 4,
            INTERNAL_ERROR: 5,
            HEADER_REQUIRED: 6,
            NOT_FOUND: 7,
            VERSION_MISMATCH: 8,
            SERVICE_BUSY: 9,
            EXPIRED: 10,
            DATA_ERROR: 11,
            PERM_DATA_ERROR: 12,
            REMOTE_CONNECTION_ERROR: 13,
            NO_SPACE: 14,
            NO_SUCH_HMAC_ALGORITHM: 15,
            INVALID_REQUEST: 16,
            NESTED_OPERATION_ERRORS: 17,
            DEVICE_LOCKED: 18,
            DEVICE_ALREADY_UNLOCKED: 19,
            CONNECTION_TERMINATED: 20,
            INVALID_BATCH: 21,
        };
        this.build = protobuf.loadProtoFile(protoFilePath).build(buildName);
        return this;
    }

    /**
     * Sets the actual protobuf message for the Kinetic Protocol Data Unit.
     * @param {Object} pbMessage - the well formated kinetic protobuf structure.
     * @returns {Kinetic} - to allow for a functional style.
     */
    setProtobuf(pbMessage) {
        this._message = pbMessage;
        return this;
    }

    /**
     * Sets the chunk for the Kinetic Protocol Data Unit.
     * @param {Buffer} chunk - the data .
     * @returns {Kinetic} - to allow for a functional style.
     */
    setChunk(chunk) {
        this._chunk = chunk;
        return this;
    }

    setMessage(command) {
        const buf = new Buffer(4);
        this._message = new this.build.Command(command);
        buf.writeInt32BE(this.getProtobufSize());
        this.setHMAC(Buffer.concat([buf, this._message.toBuffer()]));
        return this.setProtobuf(new this.build.Message({
            "authType": 1,
            "hmacAuth": {
                "identity": 1,
                "hmac": this.getHMAC(),
            },
            "commandBytes": this._message.toBuffer(),
        }));
    }

    /**
     * Sets the HMAC for the Kinetic Protocol Data Unit integrity.
     * @param {Buffer} integrity - the shared secret.
     * @returns {Kinetic} - to allow for a functional style.
     */
    setHMAC(integrity) {
        this._hmac =  crypto.createHmac('sha1', 'asdfasdf')
            .update(integrity).digest();
        return this;
    }

    /**
     * Slice the buffer with the offset and the limit.
     * @param {Object} obj - an object buffer with offset and limit.
     * @returns {Buffer} - sliced buffer from the buffer structure with the
     * offset and the limit.
     */
    getSlice(obj) {
        return obj.buffer.slice(obj.offset, obj.limit);
    }

    /**
     * Gets the actual version of the kinetic protocol.
     * @returns {Number} - the current version of the kinetic
     * protocol.
     */
    getVersion() {
        return this._version;
    }

    /**
     * Gets the actual protobuf message.
     * @returns {Object} - Kinetic protobuf message.
     */
    getProtobuf() {
        return this._message;
    }

    /**
     * Gets the actual protobuf message size.
     * @returns {Number} - Size of the kinetic protobuf message.
     */
    getProtobufSize() {
        return this._message.calculate();
    }

    /**
     * Gets the actual chunk.
     * @returns {Buffer} - Chunk.
     */
    getChunk() {
        return this._chunk;
    }

    /**
     * Gets the actual chunk size.
     * @returns {Number} - Chunk size.
     */
    getChunkSize() {
        if (this._chunk === undefined)
            return 0;
        return this._chunk.length;
    }

    /**
     * Gets the general build template.
     * @returns {Object} - General kinetic protobuf structure.
     */
    getCommand() {
        return this.build.Command;
    }

    /**
     * Gets the general build template.
     * @returns {Object} - General kinetic protobuf structure.
     */
    getMessage() {
        return this.build.Message;
    }

    /**
     * Gets the actual HMAC.
     * @returns {Buffer} - HMAC.
     */
    getHMAC() {
        return this._hmac;
    }

    /**
     * Gets the actual request messageType.
     * @returns {Number} - The code number of the request.
     */
    getMessageType() {
        return this._message.header.messageType;
    }

    /**
     * Gets the actual clusterVersion.
     * @returns {Number} - The clusterVersion.
     */
    getClusterVersion() {
        return this._message.header.clusterVersion.low;
    }

    /**
     * Gets the actual key.
     * @returns {Buffer} - Key.
     */
    getKey() {
        return this.getSlice(this._message.body.keyValue.key);
    }

    /**
     * Gets the version of the data unit in the database.
     * @returns {Buffer} - Version of the data unit in the database.
     */
    getDbVersion() {
        return this.getSlice(this._message.body.keyValue.dbVersion);
    }

    /**
     * Gets the new version of the data unit.
     * @returns {Buffer} - New version of the data unit.
     */
    getNewVersion() {
        return this.getSlice(this._message.body.keyValue.newVersion);
    }

    /**
     * Gets the detailed error message.
     * @returns {Buffer} - Detailed error message.
     */
    getErrorMessage() {
        return this.getSlice(this._message.status.detailedMessage);
    }

    /**
     * Gets the logs message.
     * @returns {Buffer} - Logs message.
     */
    getGetLogMessage() {
        return this.getSlice(this._message.body.getLog.messages);
    }

    /**
     * Gets the operation name with it code.
     * @param {Number} opCode - the operation code.
     * @returns {String} - operation name.
     */
    getOp(opCode) {
        return this.getKeyByValue(this.op, opCode);
    }

    /**
     * Gets the error name with it code.
     * @param {Number} errorCode - the error code.
     * @returns {String} - error name.
     */
    getError(errorCode) {
        return this.getKeyByValue(this.errors, errorCode);
    }

    /**
     * Gets the log type name with it code.
     * @param {Number} logCode - the log type code.
     * @returns {String} - log type name.
     */
    getLogType(logCode) {
        return this.getKeyByValue(this.logs, logCode);
    }

    /**
     * Gets the key of an object with it value.
     * @param {Object} object - the corresponding object.
     * @param {String} value - the corresponding value.
     * @returns {Buffer} - object key.
     */
    getKeyByValue(object, value) {
        return Object.keys(object).find(key => object[key] === value);
    }

    /**
     * Compare two buffers.
     * @param {Buffer} buf0 - the buffers to compare.
     * @param {Buffer} buf1 - the buffers to compare.
     * @returns {Boolean} - false if it's different true if not.
     */
    diff(buf0, buf1) {
        if (buf0.length !== buf1.length) {
            return false;
        }
        for (let i = 0; i <= buf0.length; i++) {
            if (buf0[i] !== buf1[i])
                return false;
        }
        return true;
    }

    /**
     * Test the HMAC integrity between the actual instance and the given HMAC
     * @param {Buffer} hmac - the non instance hmac to compare
     * @returns {Boolean} - true if the HMACs are the same,
     * HMAC_FAILURE code if not
     */
    hmacIntegrity(hmac) {
        if (hmac === undefined || this.getHMAC() === undefined)
            return this.errors.HMAC_FAILURE;

        const buf = new Buffer(4);
        buf.writeInt32BE(this.getProtobufSize());
        this.setHMAC(Buffer.concat([buf, this._message.toBuffer()]));
        if (this.diff(hmac, this.getHMAC()) === false)
            return this.errors.HMAC_FAILURE;
        return true;
    }

    /**
     * Getting logs and stats request following the kinetic protocol.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection.
     * @param {Array} types - array filled by logs types needed.
     * @param {number} clusterVersion - version of the cluster
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    getLog(incrementTCP, types, clusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "GETLOG",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
                "getLog": {
                    "types": types,

                },
            },
        });
    }

    /**
     * Getting logs and stats response following the kinetic protocol.
     * @param {number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - detailed error message.
     * @param {object} responseLogs - object filled by logs needed.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    getLogResponse(response, errorMessage, responseLogs) {
        return this.setMessage({
            "header": {
                "ackSequence": this._message.header.sequence,
                "messageType": "GETLOG_RESPONSE",
            },
            "body": {
                "getLog": responseLogs,
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * Flush all data request following the kinetic protocol.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection.
     * @param {number} clusterVersion - version of the cluster
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    flush(incrementTCP, clusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "FLUSHALLDATA",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
            },
        });
    }

    /**
     * Flush all data response following the kinetic protocol.
     * @param {number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - detailed error message.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    flushResponse(response, errorMessage) {
        return this.setMessage({
            "header": {
                "messageType": "FLUSHALLDATA_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * set clusterVersion request following the kinetic protocol.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection.
     * @param {number} clusterVersion - The version number of this cluster
     * definition
     * @param {number} oldClusterVersion - The old version number of this
     * cluster definition
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    setClusterVersion(incrementTCP, clusterVersion, oldClusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "SETUP",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": oldClusterVersion,
            },
            "body": {
                "setup": {
                    "newClusterVersion": clusterVersion,
                },
            },
        });
    }

    /**
     * Setup response request following the kinetic protocol.
     * @param {Number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - detailed error message.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    setupResponse(response, errorMessage) {
        return this.setMessage({
            "header": {
                "messageType": "SETUP_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * NOOP request following the kinetic protocol.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection
     * @param {number} clusterVersion - The version number of this cluster
     * definition
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    noOp(incrementTCP, clusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "NOOP",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
            },
        });
    }

    /**
     * Response for the NOOP request following the kinetic protocol.
     * @param {Number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - detailed error message.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    noOpResponse(response, errorMessage) {
        return this.setMessage({
            "header": {
                "messageType": "NOOP_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * PUT request following the kinetic protocol.
     * @param {Buffer} key - key of the item to put.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection
     * @param {Buffer} dbVersion - version of the item in the
     * database.
     * @param {Buffer} newVersion - new version of the item to put.
     * @param {number} clusterVersion - The version number of this cluster
     * definition
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    put(key, incrementTCP, dbVersion, newVersion, clusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "PUT",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
                "keyValue": {
                    "key": key,
                    "newVersion": newVersion,
                    "dbVersion": dbVersion,
                    "synchronization": 'WRITETHROUGH',
                },
            },
        });
    }

    /**
     * Response for the PUT request following the kinetic protocol.
     * @param {Number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - detailed error message.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    putResponse(response, errorMessage) {
        return this.setMessage({
            "header": {
                "messageType": "PUT_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "body": {
                "keyValue": { },
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * GET request following the kinetic protocol.
     * @param {Buffer} key - key of the item to put.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection
     * @param {number} clusterVersion - The version number of this cluster
     * definition
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    get(key, incrementTCP, clusterVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "GET",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
                "keyValue": {
                    "key": key,
                },
            },
        });
    }

    /**
     * Response for the GET request following the kinetic protocol.
     * @param {Number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - Detailed error message.
     * @param {Buffer} dbVersion - The version of the item in the
     * database.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    getResponse(response, errorMessage, dbVersion) {
        return this.setMessage({
            "header": {
                "messageType": "GET_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "body": {
                "keyValue": {
                    "key": this._message.body.keyValue.key,
                    "dbVersion": dbVersion,
                },
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * DELETE request following the kinetic protocol.
     * @param {Buffer} key - key of the item to put.
     * @param {number} incrementTCP - monotonically increasing number for each
     * request in a TCP connection
     * @param {number} clusterVersion - The version number of this cluster
     * definition
     * @param {Buffer} dbVersion - version of the item in the
     * database.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    delete(key, incrementTCP, clusterVersion, dbVersion) {
        const connectionID = (new Date).getTime();
        return this.setMessage({
            "header": {
                "messageType": "DELETE",
                "connectionID": connectionID,
                "sequence": incrementTCP,
                "clusterVersion": clusterVersion,
            },
            "body": {
                "keyValue": {
                    "key": key,
                    "dbVersion": dbVersion,
                    "synchronization": 'WRITETHROUGH',
                },
            },
        });
    }

    /**
     * Response for the DELETE request following the kinetic protocol.
     * @param {Number} response - response code (SUCCESS, FAIL)
     * @param {Buffer} errorMessage - Detailed error message.
     * @returns {Kinetic} - message structure following the kinetic
     * protocol
     */
    deleteResponse(response, errorMessage) {
        return this.setMessage({
            "header": {
                "messageType": "DELETE_RESPONSE",
                "ackSequence": this._message.header.sequence,
            },
            "body": {
                "keyValue": { },
            },
            "status": {
                "code": response,
                "detailedMessage": errorMessage,
            },
        });
    }

    /**
     * Sends data following Kinetic protocol.
     * @param {Socket} sock - Socket to send data through.
     * @returns {Number} - an error code
     */
    send(sock) {
        const pduHeader = new Buffer(9);

        pduHeader.writeInt8(this.getVersion(), 0);

        pduHeader.writeInt32BE(this.getProtobufSize(), 1);
        pduHeader.writeInt32BE(this.getChunkSize(), 5);

        if (this.getChunk() !== undefined)
            sock.write(Buffer.concat(
                    [pduHeader, this._message.toBuffer(), this.getChunk()]));
        else
            sock.write(Buffer.concat([pduHeader, this._message.toBuffer()]));

        return this.errors.SUCCESS;
    }

    /**
     * Creates the Kinetic Protocol Data Structure from a buffer.
     * @param {Buffer} data - The data received by the socket.
     * @returns {Number} - an error code
     */
    parse(data) {
        const version = data.readInt8(0);
        const pbMsgLen = data.readInt32BE(1);
        const chunkLen = data.readInt32BE(5);

        if (version !== this.getVersion()) {
            return this.errors.VERSION_FAILURE;
        }

        try {
            this._cmd = this.build.Message.decode(data.slice(9, 9 + pbMsgLen));
            this.setProtobuf(this.getCommand().decode(this._cmd.commandBytes));
        } catch (e) {
            if (e.decoded) {
                this.setProtobuf(e.decoded);
            } else {
                return this.errors.INTERNAL_ERROR;
            }
        }
        this.setChunk(data.slice(pbMsgLen + 9, chunkLen + pbMsgLen + 9));

        if (this.getChunkSize() !== chunkLen) {
            return this.errors.DATA_ERROR;
        }
        if (this._cmd.authType === 1 &&
                this.hmacIntegrity(this.getSlice(this._cmd.hmacAuth.hmac)) !==
                true)
            return this.errors.HMAC_FAILURE;

        return this.errors.SUCCESS;
    }
}

export default Kinetic;