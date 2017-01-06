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

const Gatherer = require('./gatherer');

/**
 * @fileoverview Tracks unused CSS rules.
 */
class CSSUsage extends Gatherer {
  beforePass(options) {
    return options.driver.sendCommand('DOM.enable')
      .then(_ => options.driver.sendCommand('CSS.enable'))
      .then(_ => options.driver.sendCommand('CSS.startRuleUsageTracking'));
  }

  gatherRuleUsage(driver) {
    return driver.sendCommand('CSS.stopRuleUsageTracking').then(results => {
      return driver.sendCommand('CSS.disable')
        .then(_ => driver.sendCommand('DOM.disable'))
        .then(_ => results.ruleUsage);
    });
  }

  afterPass(options) {
    return this.gatherRuleUsage(options.driver);
  }
}

module.exports = CSSUsage;