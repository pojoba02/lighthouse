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

const assetSaver = require('../../../lib/asset-saver');
const Metrics = require('../../../lib/traces/metrics-evts');
const assert = require('assert');
const fs = require('fs');

const screenshotFilmstrip = require('../../fixtures/traces/screenshots.json');
const traceEvents = require('../../fixtures/traces/tracingstarted-after-navstart.json');
const sampleResults = require('../../results/file.json');
const Audit = require('../../../audits/audit.js');

/* eslint-env mocha */
describe('metrics events class', () => {
  it('generates fake events', () => {
    const x = new Metrics(traceEvents.traceEvents, sampleResults.audits).generateFakeEvents();
    assert.equal(x.length, 2 * 7, 'All expected fake events not created')
  });
});
