"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getJsDocClassInfo = getJsDocClassInfo;
exports.getTags = getTags;
exports.hasJsdocGlobalExportFlag = hasJsdocGlobalExportFlag;

var _core = require("@babel/core");

var _doctrine = _interopRequireDefault(require("doctrine"));

var _ignoreCase = _interopRequireDefault(require("ignore-case"));

var _ast = require("./ast");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const classInfoValueTags = ["alias", "name", "namespace"];
const classInfoBoolTags = ["nonUI5", "controller", "keepConstructor"];

function getJsDocClassInfo(node, parent) {
  if (node.leadingComments) {
    return node.leadingComments.filter(_ast.isCommentBlock).map(comment => {
      const docAST = _doctrine.default.parse(comment.value, {
        unwrap: true
      });

      const tags = docAST.tags || [];
      const info = {};

      for (const tagName of classInfoValueTags) {
        const value = getJsDocTagValue(tags, tagName);

        if (value) {
          info[tagName] = value;
        }
      }

      for (const tagName of classInfoBoolTags) {
        const value = !!getJsDocTag(tags, tagName);

        if (value) {
          info[tagName] = value;
        }
      }

      return info;
    }).filter(notEmpty)[0];
  } // Else see if the JSDoc are on the return statement (i..e return class X extends SAPClass)
  else if (_core.types.isClassExpression(node) && _core.types.isReturnStatement(parent)) {
      return getJsDocClassInfo(parent);
    } else {
      return {};
    }
}
/**
 * Returns a map of tags by name.
 * Converts empty to bool. Also converts bool value
 */


function getTags(comments) {
  if (!comments) {
    return {};
  }

  for (const comment of comments) {
    if (!(0, _ast.isCommentBlock)(comment)) {
      continue;
    }

    const docAST = _doctrine.default.parse(comment.value, {
      unwrap: true
    });

    const tags = docAST.tags;

    if (!tags || !tags.length) {
      continue;
    }

    const map = {};

    for (const tag of tags) {
      const title = tag.title;
      let value = tag.name || tag.description || true;
      if (value === "false") value = false;
      map[title] = value;
    }

    return map;
  }

  return {};
}

function getJsDocTagValue(tags, name) {
  const tag = getJsDocTag(tags, name);
  return tag && (tag.name || tag.description);
}

function getJsDocTag(tags, name) {
  return tags.find(t => _ignoreCase.default.equals(name, t.title));
}

function notEmpty(obj) {
  return Object.values(obj).some(value => value);
}

function hasJsdocGlobalExportFlag(node) {
  if (!node.leadingComments) {
    return false;
  }

  return node.leadingComments.filter(_ast.isCommentBlock).some(comment => {
    return _doctrine.default.parse(comment.value, {
      unwrap: true,
      tags: ["global"]
    }).tags.length > 0;
  });
}