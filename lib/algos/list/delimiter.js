'use strict'; // eslint-disable-line strict

/**
 * Find the next delimiter in the path
 *
 * @param {string} key             - path of the object
 * @param {string} delimiter       - string to find
 * @param {number} index           - index to start at
 * @return {number} delimiterIndex - returns -1 in case no delimiter is found
 */
function nextDelimiter(key, delimiter, index) {
    return key.indexOf(delimiter, index);
}

/**
 * Find the common prefix in the path
 *
 * @param {String} key            - path of the object
 * @param {String} delimiter      - separator
 * @param {Number} delimiterIndex - 'folder' index in the path
 * @return {String}               - CommonPrefix
 */
function getCommonPrefix(key, delimiter, delimiterIndex) {
    return key.substring(0, delimiterIndex + delimiter.length);
}

/**
 * Handle object listing with parameters
 *
 * @prop {String[]} CommonPrefixes     - 'folders' defined by the delimiter
 * @prop {String[]} Contents           - 'files' to list
 * @prop {Boolean} IsTruncated         - marker per amazon format
 * @prop {String|undefined} NextMarker - marker per amazon format
 * @prop {Number} keys                 - count of listed keys
 * @prop {String|undefined} delimiter  - separator per amazon format
 * @prop {String|undefined} prefix     - marker per amazon format
 * @prop {Number} maxKeys              - number of keys to list
 */
class Delimiter {
    /**
     * Create a new Delimiter instance
     * @constructor
     * @param {Object} parameters           - listing parameters
     * @param {String} parameters.delimiter - delimiter per amazon format
     * @param {String} parameters.prefix    - prefix per amazon format
     * @param {Number} [parameters.maxKeys] - number of keys to list
     */
    constructor(parameters) {
        this.CommonPrefixes = [];
        this.Contents = [];
        this.IsTruncated = false;
        this.NextMarker = parameters.gt;
        this.keys = 0;

        this.delimiter = parameters.delimiter;
        this.prefix = parameters.start;
        this.maxKeys = parameters.maxKeys || 1000;
    }

    /**
     *  Add a (key, value) tuple to the listing
     *  Set the NextMarker to the current key
     *  Increment the keys counter
     *  @param {String} key   - The key to add
     *  @param {String} value - The value of the key
     *  @return {Delimiter}   - current instance
     */
    addContents(key, value) {
        const tmp = JSON.parse(value);
        this.Contents.push({
            key,
            value: {
                Size: tmp['content-length'],
                ETag: tmp['content-md5'],
                LastModified: tmp['last-modified'],
                Owner: {
                    DisplayName: tmp['owner-display-name'],
                    ID: tmp['owner-id'],
                },
                StorageClass: tmp['x-amz-storage-class'],
                Initiated: tmp.initiated,
                Initiator: tmp.initiator,
                EventualStorageBucket: tmp.eventualStorageBucket,
                partLocations: tmp.partLocations,
                creationDate: tmp.creationDate,
            },
        });
        this.NextMarker = key;
        ++this.keys;
        return this;
    }

    /**
     *  Filter to apply on each iteration, based on:
     *  - prefix
     *  - delimiter
     *  - maxKeys
     *  The marker is being handled directly by levelDB
     *  @param {Object} obj       - The key and value of the element
     *  @param {String} obj.key   - The key of the element
     *  @param {String} obj.value - The value of the element
     *  @return {Boolean}         - indicates if iteration should continue
     */
    filter(obj) {
        const key = obj.key;
        const value = obj.value;
        if (this.keys >= this.maxKeys) {
            // In cases of maxKeys <= 0 -> IsTruncated = false
            this.IsTruncated = this.maxKeys > 0;
            return false;
        }
        if (this.prefix && !key.startsWith(this.prefix)
                && key.startsWith(this.NextMarker)) {
            return true;
        }
        if (this.delimiter) {
            const baseIndex = this.prefix ? this.prefix.length : 0;
            const delimiterIndex = nextDelimiter(key,
                                                 this.delimiter,
                                                 baseIndex);
            if (delimiterIndex === -1) {
                this.addContents(key, value);
            } else {
                this.addCommonPrefix(key, delimiterIndex);
            }
        } else {
            this.addContents(key, value);
        }
        return true;
    }

    /**
     * Add a Common Prefix in the list
     * @param {String} key   - object name
     * @param {Number} index - after prefix starting point
     * @return {Delimiter}   - current instance
     */
    addCommonPrefix(key, index) {
        const commonPrefix = getCommonPrefix(key, this.delimiter, index);
        if (this.CommonPrefixes.indexOf(commonPrefix) === -1
                && this.NextMarker !== commonPrefix) {
            this.CommonPrefixes.push(commonPrefix);
            this.NextMarker = commonPrefix;
            ++this.keys;
        }
        return this;
    }

    /**
     *  Return an object containing all mandatory fields to use once the
     *  iteration is done, doesn't show a NextMarker field if the output
     *  isn't truncated
     *  @return {Object} - following amazon format
     */
    result() {
        return {
            CommonPrefixes: this.CommonPrefixes,
            Contents: this.Contents,
            IsTruncated: this.IsTruncated,
            NextMarker: this.IsTruncated ? this.NextMarker : undefined,
            Delimiter: this.delimiter,
        };
    }
}

module.exports = { Delimiter };
