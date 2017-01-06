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

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');

function keyForRange(range) {
  return `${range.startLine},${range.startColumn}`;
}

class UnusedCSSRules extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Best Practices',
      name: 'unused-css-rules',
      description: 'Site does not have unused CSS rules',
      helpText: 'Remove unused rules from stylesheets to reduce unnecessary ' +
          'bytes consumed by network activity.',
      requiredArtifacts: ['CSSUsage', 'Styles']
    };
  }

  static indexContentByPosition(parsedContent) {
    return parsedContent.reduce((indexed, parsed) => {
      indexed[keyForRange(parsed.declarationRange)] = parsed;
      return indexed;
    }, {});
  }

  static indexStylesheetsById(styles) {
    const indexContent = UnusedCSSRules.indexContentByPosition;
    return styles.reduce((indexed, stylesheet) => {
      indexed[stylesheet.header.styleSheetId] = Object.assign({
        used: [],
        unused: [],
        indexedContent: indexContent(stylesheet.parsedContent),
      }, stylesheet);
      return indexed;
    }, {});
  }

  static findSelector(rule, stylesheet) {
    const parsed = stylesheet.indexedContent[keyForRange(rule.range)];
    let selector = parsed && parsed.selector;
    if (!selector) {
      // This means we failed to parse the content correctly, fallback to manual
      const range = rule.range;
      const line = stylesheet.content.split('\n')[range.startLine];
      // Create a small slice of the line and try to find the selector manually
      const target = line.slice(range.startColumn - 100, range.startColumn - 1);
      const match = target.match(/[^}]+$/);
      selector = match && match[0];
    }

    return selector || '<unknown>';
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const styles = artifacts.Styles;
    const usage = artifacts.CSSUsage;

    const unusedRules = [];
    const indexedStylesheets = UnusedCSSRules.indexStylesheetsById(styles);

    usage.forEach(rule => {
      const stylesheetInfo = indexedStylesheets[rule.styleSheetId];
      if (rule.used) {
        stylesheetInfo.used.push(rule);
      } else {
        stylesheetInfo.unused.push(rule);
        unusedRules.push(rule);
      }
    });

    Object.keys(indexedStylesheets).forEach(stylesheetId => {
      const stylesheetInfo = indexedStylesheets[stylesheetId];
      const numUsed = stylesheetInfo.used.length;
      const numUnused = stylesheetInfo.unused.length;
      stylesheetInfo.percentUsed = numUsed / (numUsed + numUnused);
    });

    const results = unusedRules.map(rule => {
      const stylesheet = indexedStylesheets[rule.styleSheetId];
      const selector = UnusedCSSRules.findSelector(rule, stylesheet);

      return {
        code: selector.replace(/,(?=[^\s])/g, ', '),
        label: `line: ${rule.range.startLine}, col: ${rule.range.startColumn}`,
        url: stylesheet.header.sourceURL || '<inline>',
      };
    });

    let displayValue = '';
    if (results.length > 1) {
      displayValue = `${results.length} CSS rules were unused`;
    } else if (results.length === 1) {
      displayValue = `${results.length} CSS rule was unused`;
    }

    return UnusedCSSRules.generateAuditResult({
      displayValue,
      rawValue: results.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = UnusedCSSRules;
