/* Copyright (c) 2017 Red Hat, Inc. */

const templateUrl = require('~network-ui/link.partial.svg');

function link () {
  return { restrict: 'A', templateUrl};
}
exports.link = link;
