/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assetSaver = require('../../lib/asset-saver');
const assert = require('assert');
const fs = require('fs');

const screenshotFilmstrip = require('../fixtures/traces/screenshots.json');
const traceEvents = require('../fixtures/traces/progressive-app.json');
const Audit = require('../../audits/audit.js');

/* eslint-env mocha */
describe('asset-saver helper', () => {
  it('generates filename prefixes', () => {
    const results = {
      url: 'https://testexample.com',
      generatedTime: '2017-01-06T02:34:56.217Z'
    };
    const str = assetSaver.getFilenamePrefix(results);
    assert.equal(str, 'testexample.com_01-05-2017_6-34-56_PM');
  });

  it('generates HTML', () => {
    const options = {
      url: 'https://testexample.com',
      generatedTime: '2016-05-31T23:34:30.547Z'
    };
    const artifacts = {
      traces: {
        [Audit.DEFAULT_PASS]: {
          traceEvents: []
        }
      },
      requestScreenshots: () => Promise.resolve([]),
    };
    return assetSaver.prepareAssets(artifacts, options).then(assets => {
      assert.ok(/<!doctype/gim.test(assets[0].html));
    });
  });

  describe('saves files.', function() {
    const options = {
      url: 'https://testexample.com/',
      generatedTime: '2016-05-31T23:34:30.547Z',
      flags: {
        saveAssets: true
      }
    };
    const artifacts = {
      traces: {
        [Audit.DEFAULT_PASS]: {
          traceEvents
        }
      },
      requestScreenshots: () => Promise.resolve(screenshotFilmstrip)
    };

    assetSaver.saveAssets(artifacts, options);

    it('trace file saved to disk with data', () => {
      const traceFilename = assetSaver.getFilenamePrefix(options) + '-0.trace.json';
      const traceFileContents = fs.readFileSync(traceFilename, 'utf8');
      console.error('yeah', traceFileContents.length)
      const traceSize = JSON.stringify(traceEvents).length;
      assert.ok(traceFileContents.length > 3000000, `${traceFilename} not as big as expected: ${traceSize} and ${traceFileContents.length}`);
      fs.unlinkSync(traceFilename);
    });

    it('screenshots file saved to disk with data', () => {
      const ssFilename = assetSaver.getFilenamePrefix(options) + '-0.screenshots.html';
      const ssFileContents = fs.readFileSync(ssFilename, 'utf8');
      assert.ok(/<!doctype/gim.test(ssFileContents));
      assert.ok(ssFileContents.includes('{"timestamp":674089419.919'));
      fs.unlinkSync(ssFilename);
    });
  });
});
