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

const log = require('../../../lighthouse-core/lib/log.js');

class Metrics {

  constructor(traceEvents, auditResults) {
    this._traceEvents = traceEvents;
    this._auditResults = auditResults;
    this._fakeEvents = [];
  }

  gatherMetrics(auditResults) {
    const resFMPext = auditResults['first-meaningful-paint'].extendedInfo;
    const resSIext = auditResults['speed-index-metric'].extendedInfo;
    const resTTIext = auditResults['time-to-interactive'].extendedInfo;

    if (!resFMPext || !resSIext || !resTTIext) {
      return [];
    }

    const metrics = [
      {
        title: 'Navigation Start',
        name: 'navstart',
        ts: resFMPext.value.timestamps.navStart
      },
      {
        title: 'First Contentful Paint',
        name: 'ttfcp',
        ts: resFMPext.value.timestamps.fCP
      },
      {
        title: 'First Meaningful Paint',
        name: 'ttfmp',
        ts: resFMPext.value.timestamps.fMP
      },
      {
        title: 'Perceptual Speed Index',
        name: 'psi',
        ts: resSIext.value.timestamps.perceptualSpeedIndex
      },
      {
        title: 'First Visual Change',
        name: 'fv',
        ts: resSIext.value.timestamps.firstVisualChange
      },
      {
        title: 'Visually Complete 100%',
        name: 'vc',
        ts: resSIext.value.timestamps.visuallyComplete
      },
      {
        title: 'Time to Interactive',
        name: 'tti',
        ts: resTTIext.value.timestamps.timeToInteractive
      },
      {
        title: 'Visually Complete 85%',
        name: 'vc85',
        ts: resTTIext.value.timestamps.visuallyReady
      }
    ];
    return metrics;
  }

  get navigationStartEvt() {
    if (!this._navigationStartEvt) {
      const filteredEvents = this._traceEvents.filter(e => {
        return e.name === 'TracingStartedInPage' || e.cat === 'blink.user_timing' || e.name === 'navigationStart';
      });

      // We'll masquerade our fake events as a combination of TracingStartedInPage & navigationStart
      // {"pid":89922,"tid":1295,"ts":77174383652,"ph":"I","cat":"disabled-by-default-devtools.timeline","name":"TracingStartedInPage","args":{"data":{"page":"0x2a34d8e01e08","sessionId":"89922.4"}},"tts":1076978,"s":"t"},
      // {"pid":89922, "tid":1295, "ts":134015115578, "ph":"R", "cat":"blink.user_timing", "name":"navigationStart", "args":{ "frame":"0x202a71ba1e20"},"tts":299930 }
      const tracingStartedInPageEvt = filteredEvents.filter(e => e.name === 'TracingStartedInPage')[0];
      const navigationStartEvt = filteredEvents.filter(e => {
        return e.name === 'navigationStart' &&
            e.pid === tracingStartedInPageEvt.pid && e.tid === tracingStartedInPageEvt.tid;
      })[0];
      this._navigationStartEvt = navigationStartEvt;
    }
    return this._navigationStartEvt;
  }

  // We are constructing performance.measure trace events, which have a start and end as follows:
  // {"pid": 89922,"tid":1295,"ts":77176783452,"ph":"b","cat":"blink.user_timing","name":"innermeasure","args":{},"tts":1257886,"id":"0xe66c67"}
  // { "pid":89922,"tid":1295,"ts":77176882592, "ph":"e", "cat":"blink.user_timing", "name":"innermeasure", "args":{ },"tts":1257898, "id":"0xe66c67" }
  synthesizeEventPair(metric, navStartTs) {
    if (!metric.ts || metric.name === 'navstart') {
      return [];
    }
    let counter = (Math.random() * 1000000) | 0;
    const eventBase = {
      name: metric.title,
      id: `0x${(counter++).toString(16)}`,
      cat: 'blink.user_timing',
    };
    const fakeMeasureStartEvent = Object.assign({}, this.navigationStartEvt, eventBase, {
      ts: navStartTs,
      ph: 'b'
    });
    const fakeMeasureEndEvent = Object.assign({}, this.navigationStartEvt, eventBase, {
      ts: metric.ts,
      ph: 'e',
    });
    return [fakeMeasureStartEvent, fakeMeasureEndEvent];
  }

  generateFakeEvents() {
    const metrics = this.gatherMetrics(this._auditResults)
    if (metrics.length === 0) {
      log.error('metrics-events', 'Metrics collection had errors, not synthetizing trace events');
      return [];
    }

    // confirm our navStart's correctly match
    const navStartTs = metrics.find(e => e.name === 'navstart').ts;
    if (this.navigationStartEvt.ts !== navStartTs) {
      log.error('metrics-evts', 'Reference navigationStart doesn\'t match fMP\'s navStart');
      return [];
    }

    metrics.forEach(metric => {
      log.log('metrics-evts', `Sythesizing trace events for ${metric.title}`);
      this._fakeEvents.push(...this.synthesizeEventPair(metric, navStartTs));
    });
    return this._fakeEvents;
  }
}

module.exports = Metrics;
