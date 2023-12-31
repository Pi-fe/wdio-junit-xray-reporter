"use strict";

import JunitReporter from "@wdio/junit-reporter";
const ansiRegex = new RegExp([
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))'
].join('|'), 'g');
class JUnitXrayReporter extends JunitReporter {
  _addSuiteToBuilder(builder, runner, specFileName, suite) {
    const filePath = specFileName.replace(process.cwd(), ".");
    const suiteName =
      !this.options.suiteNameFormat ||
      this.options.suiteNameFormat instanceof RegExp
        ? this._prepareName(suite.title)
        : this.options.suiteNameFormat({
            name: this.options.suiteNameFormat.name,
            suite,
          });
    const testSuite = builder
      .testSuite()
      .name(suiteName)
      .timestamp(suite.start)
      .time(suite._duration / 1000)
      .property("specId", 0)
      .property(this._suiteTitleLabel, suite.title)
      .property("capabilities", runner.sanitizedCapabilities)
      .property(this._fileNameLabel, filePath);
    suite = this._addFailedHooks(suite);
    for (const testKey of Object.keys(suite.tests)) {
      if (testKey === "undefined") {
        // fix cucumber hooks crashing reporter (INFO: we may not need this anymore)
        continue;
      }
      const test = suite.tests[testKey];
      const key = test.title.replaceAll(' ', '').split("|").pop();
      const testName = this._prepareName(test.title);
      const classNameFormat = this.options.classNameFormat
        ? this.options.classNameFormat({
            packageName: this._packageName,
            suite,
          })
        : `${this._packageName}.${(suite.fullTitle || suite.title).replace(
            /\s/g,
            "_"
          )}`;
      const testCase = testSuite
        .testCase()
        .className(classNameFormat)
        .name(testName)
        .time(test._duration / 1000)
        .property('test_key', key)
      if (this.options.addFileAttribute) {
        testCase.file(filePath);
      }
      if (test.state === "pending" || test.state === "skipped") {
        testCase.skipped();
        if (test.error) {
          testCase.standardError(
            `\n${test.error.stack?.replace(ansiRegex, "")}\n`
          );
        }
      } else if (test.state === "failed") {
        if (test.error) {
          if (test.error.message) {
            test.error.message = test.error.message.replace(ansiRegex, "");
          }
          if (this.options.errorOptions) {
            const errorOptions = this.options.errorOptions;
            for (const key of Object.keys(errorOptions)) {
              testCase[key](test.error[errorOptions[key]]);
            }
          } 
          testCase.stacktrace(`${test.error.stack?.replace(ansiRegex, "")}\n`);
        }
      }
    }
    return builder;
  }
}

export default JUnitXrayReporter;